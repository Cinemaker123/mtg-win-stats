import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Shared, mutable mock state. Hoisted so the vi.mock factory (also hoisted)
// and the tests reference the same object.
const h = vi.hoisted(() => ({
  state: {
    tableResults: {}, // table name -> { data, error } the query resolves to
    rpcResults: {}, // function name -> { data, error }
    fromCalls: [], // table names passed to .from(), in call order
    rpcCalls: [], // { fn, params } passed to .rpc()
    builderCalls: [], // { table, method, args } for every builder method call
  },
}));

// A chainable query builder whose every method returns itself and which is
// awaitable (thenable), resolving to the configured result for its table.
vi.mock("@supabase/supabase-js", () => {
  const { state } = h;
  const makeBuilder = (table) => {
    const b = {};
    for (const m of ["select", "eq", "order", "upsert", "insert", "delete", "not", "update", "single", "maybeSingle"]) {
      b[m] = (...args) => {
        state.builderCalls.push({ table, method: m, args });
        return b;
      };
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
  h.state.builderCalls = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Fresh import so the module-level player-id cache resets between tests.
  vi.resetModules();
  mod = await import("./supabaseClient.js");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("missing credentials", () => {
  it("warns at import time when the Supabase env vars are unset", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.resetModules();
    await import("./supabaseClient.js");

    expect(err).toHaveBeenCalledWith(expect.stringContaining("credentials missing"));
  });
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

describe("getGames", () => {
  it("prefers the live joined deck name and falls back to the frozen snapshot", async () => {
    h.state.tableResults.games = {
      data: [
        {
          id: "g1",
          played_at: "2026-05-01T00:00:00Z",
          game_participants: [
            // deck_id still points at a registry row -> live name wins over the snapshot
            { player: "baum", deck: "Old Name", is_winner: true, decks: { name: "Renamed" } },
            // deck was deleted from the registry (decks -> null) -> snapshot text is used
            { player: "mary", deck: "Frozen Snapshot", is_winner: false, decks: null },
          ],
        },
      ],
      error: null,
    };

    const games = await mod.getGames();

    expect(games).toEqual([
      {
        id: "g1",
        playedAt: "2026-05-01T00:00:00Z",
        participants: [
          { player: "baum", deck: "Renamed", isWinner: true },
          { player: "mary", deck: "Frozen Snapshot", isWinner: false },
        ],
      },
    ]);
  });
});

describe("deck reads", () => {
  it("getDecks maps rows to the app shape for one player", async () => {
    h.state.tableResults.decks = {
      data: [{ id: "1", player: "baum", name: "Zombies", wins: 3, losses: 1, created_at: "x" }],
      error: null,
    };
    expect(await mod.getDecks("baum")).toEqual([
      { id: "1", name: "Zombies", wins: 3, losses: 1 },
    ]);
  });

  it("getAllDecks keeps the player field for the cross-player registry", async () => {
    h.state.tableResults.decks = {
      data: [{ id: "1", player: "baum", name: "Zombies", wins: 3, losses: 1, created_at: "x" }],
      error: null,
    };
    expect(await mod.getAllDecks()).toEqual([
      { id: "1", player: "baum", name: "Zombies", wins: 3, losses: 1 },
    ]);
  });
});

describe("saveDecks", () => {
  it("upserts local decks and deletes only rows whose name is no longer present", async () => {
    h.state.tableResults.players = { data: [{ slug: "baum", id: "p1" }], error: null };
    await mod.saveDecks("baum", [
      { name: "Zombies", wins: 2, losses: 1 },
      { name: "Elves", wins: 0, losses: 0 },
    ]);

    const upsert = h.state.builderCalls.find((c) => c.table === "decks" && c.method === "upsert");
    expect(upsert.args[0]).toEqual([
      expect.objectContaining({ player: "baum", player_id: "p1", name: "Zombies", wins: 2, losses: 1 }),
      expect.objectContaining({ player: "baum", player_id: "p1", name: "Elves", wins: 0, losses: 0 }),
    ]);
    expect(upsert.args[1]).toEqual({ onConflict: "player,name" });

    // The delete keeps every current deck by excluding their names from the purge.
    const notFilter = h.state.builderCalls.find((c) => c.method === "not");
    expect(notFilter.args).toEqual(["name", "in", '("Zombies","Elves")']);
  });

  it("escapes embedded quotes in deck names so the in-filter can't be broken out of", async () => {
    await mod.saveDecks("baum", [{ name: 'De"ck', wins: 0, losses: 0 }]);
    const notFilter = h.state.builderCalls.find((c) => c.method === "not");
    expect(notFilter.args[2]).toBe('("De\\"ck")');
  });

  it("purges every deck when local state is empty (no in-filter)", async () => {
    await mod.saveDecks("baum", []);
    expect(h.state.builderCalls.some((c) => c.method === "upsert")).toBe(false);
    expect(h.state.builderCalls.some((c) => c.method === "not")).toBe(false);
    expect(h.state.builderCalls.some((c) => c.table === "decks" && c.method === "delete")).toBe(true);
  });
});

describe("deleteGame", () => {
  it("deletes the games row by id", async () => {
    await mod.deleteGame("g5");
    const del = h.state.builderCalls.find((c) => c.table === "games" && c.method === "delete");
    const eq = h.state.builderCalls.find((c) => c.table === "games" && c.method === "eq");
    expect(del).toBeTruthy();
    expect(eq.args).toEqual(["id", "g5"]);
  });
});

describe("renameDeckRegistry", () => {
  it("updates the deck name by id (and touches updated_at)", async () => {
    await mod.renameDeckRegistry("d3", "New Name");
    const update = h.state.builderCalls.find((c) => c.table === "decks" && c.method === "update");
    const eq = h.state.builderCalls.find((c) => c.table === "decks" && c.method === "eq");
    expect(update.args[0]).toEqual(expect.objectContaining({ name: "New Name" }));
    expect(update.args[0].updated_at).toBeTruthy();
    expect(eq.args).toEqual(["id", "d3"]);
  });
});

describe("addDeckToRegistry", () => {
  it("returns the new deck's id", async () => {
    h.state.tableResults.decks = { data: { id: "d42" }, error: null };
    expect(await mod.addDeckToRegistry("baum", "Goblins")).toBe("d42");
  });

  it("returns null when the deck already existed (ignoreDuplicates skips the row)", async () => {
    h.state.tableResults.decks = { data: null, error: null };
    expect(await mod.addDeckToRegistry("baum", "Goblins")).toBeNull();
  });
});
