import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Shared, mutable mock state. Hoisted so the vi.mock factory (also hoisted)
// and the tests reference the same object.
const h = vi.hoisted(() => ({
  state: {
    tableResults: {}, // table name -> { data, error } the query resolves to
    rpcResults: {}, // function name -> { data, error }
    fromCalls: [], // table names passed to .from(), in call order
    rpcCalls: [], // { fn, params } passed to .rpc()
  },
}));

// A chainable query builder whose every method returns itself and which is
// awaitable (thenable), resolving to the configured result for its table.
vi.mock("@supabase/supabase-js", () => {
  const { state } = h;
  const makeBuilder = (table) => {
    const b = {};
    for (const m of ["select", "eq", "order", "upsert", "insert", "delete", "not", "update", "single", "maybeSingle"]) {
      b[m] = () => b;
    }
    b.then = (resolve, reject) =>
      Promise.resolve(state.tableResults[table] ?? { data: [], error: null }).then(resolve, reject);
    return b;
  };
  return {
    createClient: () => ({
      from: (table) => {
        state.fromCalls.push(table);
        return makeBuilder(table);
      },
      rpc: (fn, params) => {
        state.rpcCalls.push({ fn, params });
        return Promise.resolve(state.rpcResults[fn] ?? { data: null, error: null });
      },
    }),
  };
});

let mod;
beforeEach(async () => {
  h.state.tableResults = {};
  h.state.rpcResults = {};
  h.state.fromCalls = [];
  h.state.rpcCalls = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Fresh import so the module-level player-id cache resets between tests.
  vi.resetModules();
  mod = await import("./supabaseClient.js");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("atomic game writes", () => {
  it("addGame goes through the save_game RPC and returns the new id", async () => {
    h.state.rpcResults.save_game = { data: "game-1", error: null };
    const participants = [{ player: "baum", deck: "Zombies", deckId: "d1", isWinner: true }];

    const id = await mod.addGame({ playedAt: "2026-01-02T00:00:00.000Z", participants });

    expect(id).toBe("game-1");
    expect(h.state.rpcCalls).toHaveLength(1);
    expect(h.state.rpcCalls[0]).toEqual({
      fn: "save_game",
      params: { p_played_at: "2026-01-02T00:00:00.000Z", p_participants: participants },
    });
    // No separate participant write — that was the non-atomic path we removed.
    expect(h.state.fromCalls).not.toContain("game_participants");
  });

  it("addGame throws when the RPC reports an error", async () => {
    h.state.rpcResults.save_game = { data: null, error: { message: "boom" } };
    await expect(mod.addGame({ participants: [] })).rejects.toBeTruthy();
  });

  it("updateGame replaces the game via the update_game RPC", async () => {
    h.state.rpcResults.update_game = { data: null, error: null };
    const participants = [{ player: "mary", deck: "Elves", deckId: null, isWinner: false }];

    await mod.updateGame("g9", { playedAt: "2026-03-04T00:00:00.000Z", participants });

    expect(h.state.rpcCalls[0]).toEqual({
      fn: "update_game",
      params: { p_id: "g9", p_played_at: "2026-03-04T00:00:00.000Z", p_participants: participants },
    });
    expect(h.state.fromCalls).not.toContain("game_participants");
  });
});

describe("getDecksByPlayer", () => {
  it("keeps the whole pod when the players fetch fails", async () => {
    h.state.tableResults.decks = {
      data: [{ id: "1", player: "baum", name: "Zombies", wins: 1, losses: 0 }],
      error: null,
    };
    h.state.tableResults.players = { data: null, error: { message: "players down" } };

    const byPlayer = await mod.getDecksByPlayer();

    expect(Object.keys(byPlayer).sort()).toEqual(["baum", "mary", "pascal", "wewy"]);
    expect(byPlayer.baum).toHaveLength(1);
  });

  it("groups an added (non-pod) player's decks alongside the pod", async () => {
    h.state.tableResults.players = { data: [{ slug: "gast", id: "g1" }], error: null };
    h.state.tableResults.decks = {
      data: [{ id: "7", player: "gast", name: "Goblins", wins: 0, losses: 2 }],
      error: null,
    };

    const byPlayer = await mod.getDecksByPlayer();

    expect(byPlayer.gast).toEqual([{ id: "7", player: "gast", name: "Goblins", wins: 0, losses: 2 }]);
    expect(Object.keys(byPlayer)).toContain("baum"); // pod still present
  });
});

describe("addPlayer", () => {
  it("clears the cached player-id map so the new player resolves right away", async () => {
    h.state.tableResults.players = { data: [{ slug: "baum", id: "1" }], error: null };

    await mod.getPlayerSlugs(); // populates the cache (1 fetch)
    await mod.addPlayer("Gast"); // upsert + cache clear
    await mod.getPlayerSlugs(); // must refetch, not reuse the stale cache

    const playersCalls = h.state.fromCalls.filter((t) => t === "players");
    // fetch + upsert + refetch === 3; without the cache clear it would be 2.
    expect(playersCalls).toHaveLength(3);
  });
});
