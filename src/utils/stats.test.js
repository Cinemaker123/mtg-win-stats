import { describe, it, expect } from "vitest";
import {
  winRate,
  adjustedWinRate,
  getWinRateTier,
  getDynamicStats,
  combineDeckStats,
  playerGameHistory,
  getCurrentStreak,
  getLastPlayed,
  streakDisplay,
  MIN_STREAK_GAMES,
  MIN_PARTICIPANTS,
  MAX_PARTICIPANTS,
  playerColor,
  playerSlug,
  playerGradient,
  PLAYER_COLORS,
  PLAYER_GRADIENTS,
  FALLBACK_PLAYER_COLOR,
  FALLBACK_PLAYER_GRADIENT,
  PRIOR_GAMES,
  PRIOR_WIN_RATE,
  WIN_RATE_TIERS,
  formatPct,
  capitalize,
} from "./stats.js";

describe("winRate", () => {
  it("returns 0 for a deck with no games", () => {
    expect(winRate({ wins: 0, losses: 0 })).toBe(0);
  });

  it("computes wins / total", () => {
    expect(winRate({ wins: 3, losses: 1 })).toBe(0.75);
    expect(winRate({ wins: 0, losses: 4 })).toBe(0);
    expect(winRate({ wins: 4, losses: 0 })).toBe(1);
  });
});

describe("adjustedWinRate", () => {
  it("returns the prior for a deck with no games", () => {
    expect(adjustedWinRate({ wins: 0, losses: 0 })).toBe(PRIOR_WIN_RATE);
  });

  it("regresses small samples toward the 25% pod baseline", () => {
    // A lucky 2-0 must not look like a 100% deck
    const lucky = adjustedWinRate({ wins: 2, losses: 0 });
    expect(lucky).toBeCloseTo((2 + PRIOR_GAMES * PRIOR_WIN_RATE) / (2 + PRIOR_GAMES));
    expect(lucky).toBeLessThan(0.5);
  });

  it("converges to the raw win rate on large samples", () => {
    const adjusted = adjustedWinRate({ wins: 90, losses: 10 });
    expect(adjusted).toBeGreaterThan(0.8);
    expect(adjusted).toBeLessThan(0.9);
  });

  it("ranks a proven 18-2 deck above a lucky 2-0 deck", () => {
    expect(adjustedWinRate({ wins: 18, losses: 2 }))
      .toBeGreaterThan(adjustedWinRate({ wins: 2, losses: 0 }));
  });
});

describe("getWinRateTier", () => {
  it("classifies pod win rates (0-1) into tiers", () => {
    expect(getWinRateTier(0.6).tier).toBe("legendary");
    expect(getWinRateTier(0.25).tier).toBe("good");
    expect(getWinRateTier(0.5).tier).toBe("good"); // exactly 50% is not legendary
    expect(getWinRateTier(0.1).tier).toBe("struggling");
  });
});

describe("getDynamicStats", () => {
  it("returns no stats for an empty deck list", () => {
    expect(getDynamicStats([])).toEqual([]);
  });

  it("always includes the overall win rate card", () => {
    const stats = getDynamicStats([{ name: "A", wins: 2, losses: 2 }]);
    expect(stats[0].label).toBe("Gesamt-Winrate");
    expect(stats[0].value).toBe("50%");
  });

  it("requires at least 2 games for best/worst deck cards", () => {
    const stats = getDynamicStats([{ name: "A", wins: 1, losses: 0 }]);
    expect(stats.find(s => s.label === "Bestes Deck")).toBeUndefined();
  });

  it("identifies best and worst decks", () => {
    const stats = getDynamicStats([
      { name: "Good", wins: 4, losses: 0 },
      { name: "Bad", wins: 0, losses: 4 },
    ]);
    expect(stats.find(s => s.label === "Bestes Deck").value).toBe("Good");
    expect(stats.find(s => s.label === "Ausbaufähig").value).toBe("Bad");
  });

  it("prefers a proven deck over a lucky small-sample deck", () => {
    const stats = getDynamicStats([
      { name: "Lucky", wins: 2, losses: 0 },
      { name: "Proven", wins: 18, losses: 2 },
    ]);
    expect(stats.find(s => s.label === "Bestes Deck").value).toBe("Proven");
  });
});

describe("combineDeckStats", () => {
  const legacy = [
    { name: "Fallout", wins: 1, losses: 10 },
    { name: "Daleks", wins: 1, losses: 0 },
  ];
  const games = [
    {
      id: "g1",
      playedAt: "2026-07-23T18:00:00Z",
      participants: [
        { player: "pascal", deck: "Fallout", isWinner: true },
        { player: "baum", deck: "Elves", isWinner: false },
      ],
    },
    {
      id: "g2",
      playedAt: "2026-07-23T20:00:00Z",
      participants: [
        { player: "pascal", deck: "Fallout", isWinner: false },
        { player: "baum", deck: "Elves", isWinner: true },
      ],
    },
  ];

  it("returns legacy counts unchanged when there are no games", () => {
    expect(combineDeckStats(legacy, [], "pascal")).toEqual(legacy);
  });

  it("adds game-derived wins and losses on top of the legacy baseline", () => {
    const result = combineDeckStats(legacy, games, "pascal");
    const fallout = result.find(d => d.name === "Fallout");
    expect(fallout.wins).toBe(2);   // 1 legacy + 1 game win
    expect(fallout.losses).toBe(11); // 10 legacy + 1 game loss
  });

  it("includes decks that only exist in games (deleted from registry)", () => {
    const gamesOnly = [{
      id: "g3",
      playedAt: "2026-07-23T21:00:00Z",
      participants: [{ player: "pascal", deck: "Ghosts", isWinner: true }],
    }];
    const result = combineDeckStats(legacy, gamesOnly, "pascal");
    expect(result.find(d => d.name === "Ghosts")).toEqual({ name: "Ghosts", wins: 1, losses: 0 });
  });

  it("ignores other players' participants", () => {
    const result = combineDeckStats(legacy, games, "baum");
    const elves = result.find(d => d.name === "Elves");
    expect(elves).toEqual({ name: "Elves", wins: 1, losses: 1 });
    expect(result.find(d => d.name === "Fallout").wins).toBe(1); // legacy only
  });

  it("matches deck names case-insensitively", () => {
    const g = [{
      id: "g4",
      playedAt: "2026-07-23T22:00:00Z",
      participants: [{ player: "pascal", deck: "fallout", isWinner: true }],
    }];
    const result = combineDeckStats(legacy, g, "pascal");
    expect(result.find(d => d.name === "Fallout").wins).toBe(2);
  });
});

// A game with one participant per `[player, deck, isWinner]` triple.
const game = (playedAt, ...entries) => ({
  id: playedAt,
  playedAt,
  participants: entries.map(([player, deck, isWinner]) => ({ player, deck, isWinner })),
});

describe("playerGameHistory", () => {
  it("returns an empty list when there are no games", () => {
    expect(playerGameHistory([], "pascal")).toEqual([]);
  });

  it("returns an empty list for a player who has not played", () => {
    const games = [game("2026-07-23T18:00:00Z", ["baum", "Elves", true])];
    expect(playerGameHistory(games, "pascal")).toEqual([]);
  });

  it("keeps only the requested player's entry from each game", () => {
    const games = [game(
      "2026-07-23T18:00:00Z",
      ["pascal", "Fallout", true],
      ["baum", "Elves", false],
    )];
    expect(playerGameHistory(games, "pascal")).toEqual([
      { playedAt: "2026-07-23T18:00:00Z", deck: "Fallout", isWinner: true },
    ]);
  });

  it("sorts newest first regardless of input order", () => {
    const games = [
      game("2026-07-20T18:00:00Z", ["pascal", "Fallout", true]),
      game("2026-07-24T18:00:00Z", ["pascal", "Daleks", false]),
      game("2026-07-22T18:00:00Z", ["pascal", "Elves", true]),
    ];
    expect(playerGameHistory(games, "pascal").map(h => h.deck))
      .toEqual(["Daleks", "Elves", "Fallout"]);
  });
});

describe("getCurrentStreak", () => {
  it("returns null when the player has no games", () => {
    expect(getCurrentStreak([], "pascal")).toBeNull();
    expect(getCurrentStreak([game("2026-07-23T18:00:00Z", ["baum", "Elves", true])], "pascal"))
      .toBeNull();
  });

  it("counts consecutive wins from the most recent game", () => {
    const games = [
      game("2026-07-20T18:00:00Z", ["pascal", "Fallout", false]),
      game("2026-07-21T18:00:00Z", ["pascal", "Fallout", true]),
      game("2026-07-22T18:00:00Z", ["pascal", "Elves", true]),
    ];
    expect(getCurrentStreak(games, "pascal")).toEqual({ type: "win", count: 2 });
  });

  it("counts consecutive losses from the most recent game", () => {
    const games = [
      game("2026-07-21T18:00:00Z", ["pascal", "Fallout", true]),
      game("2026-07-22T18:00:00Z", ["pascal", "Elves", false]),
      game("2026-07-23T18:00:00Z", ["pascal", "Elves", false]),
    ];
    expect(getCurrentStreak(games, "pascal")).toEqual({ type: "loss", count: 2 });
  });

  it("resets to 1 when the latest game breaks the streak", () => {
    const games = [
      game("2026-07-20T18:00:00Z", ["pascal", "Fallout", true]),
      game("2026-07-21T18:00:00Z", ["pascal", "Fallout", true]),
      game("2026-07-22T18:00:00Z", ["pascal", "Elves", false]),
    ];
    expect(getCurrentStreak(games, "pascal")).toEqual({ type: "loss", count: 1 });
  });

  it("uses recency, not input order", () => {
    const games = [
      game("2026-07-22T18:00:00Z", ["pascal", "Elves", true]),
      game("2026-07-24T18:00:00Z", ["pascal", "Daleks", false]),
      game("2026-07-23T18:00:00Z", ["pascal", "Fallout", true]),
    ];
    expect(getCurrentStreak(games, "pascal")).toEqual({ type: "loss", count: 1 });
  });

  it("ignores games the player did not take part in", () => {
    const games = [
      game("2026-07-22T18:00:00Z", ["pascal", "Fallout", true]),
      game("2026-07-23T18:00:00Z", ["baum", "Elves", false]),
      game("2026-07-24T18:00:00Z", ["pascal", "Fallout", true]),
    ];
    expect(getCurrentStreak(games, "pascal")).toEqual({ type: "win", count: 2 });
  });
});

describe("getLastPlayed", () => {
  it("returns null when the player has no games", () => {
    expect(getLastPlayed([], "pascal")).toBeNull();
    expect(getLastPlayed([game("2026-07-23T18:00:00Z", ["baum", "Elves", true])], "pascal"))
      .toBeNull();
  });

  it("returns the deck and date of the most recent game", () => {
    const games = [
      game("2026-07-20T18:00:00Z", ["pascal", "Fallout", true]),
      game("2026-07-24T18:00:00Z", ["pascal", "Daleks", false]),
      game("2026-07-22T18:00:00Z", ["pascal", "Elves", true]),
    ];
    expect(getLastPlayed(games, "pascal"))
      .toEqual({ deck: "Daleks", playedAt: "2026-07-24T18:00:00Z" });
  });
});

describe("streakDisplay", () => {
  it("returns null without a streak", () => {
    expect(streakDisplay(null)).toBeNull();
  });

  it("returns null below the display threshold", () => {
    expect(streakDisplay({ type: "win", count: MIN_STREAK_GAMES - 1 })).toBeNull();
  });

  it("describes a win streak", () => {
    expect(streakDisplay({ type: "win", count: MIN_STREAK_GAMES })).toEqual({
      icon: "🔥",
      accent: WIN_RATE_TIERS.GOOD.color,
      noun: "Siege",
    });
  });

  it("describes a loss streak", () => {
    expect(streakDisplay({ type: "loss", count: 3 })).toEqual({
      icon: "🥀",
      accent: WIN_RATE_TIERS.STRUGGLING.color,
      noun: "Niederlagen",
    });
  });
});

describe("player colours", () => {
  it("keeps each pod member's own colour and gradient", () => {
    expect(playerColor("pascal")).toBe(PLAYER_COLORS.pascal);
    expect(playerGradient("baum")).toBe(PLAYER_GRADIENTS.baum);
  });

  it("falls back to neutral for a player outside the pod", () => {
    expect(playerColor("gast")).toBe(FALLBACK_PLAYER_COLOR);
    expect(playerGradient("gast")).toBe(FALLBACK_PLAYER_GRADIENT);
  });

  it("never returns undefined, whatever it is handed", () => {
    expect(playerColor(undefined)).toBe(FALLBACK_PLAYER_COLOR);
    expect(playerGradient("")).toBe(FALLBACK_PLAYER_GRADIENT);
  });
});

describe("pod size bounds", () => {
  it("allows between two and four participants", () => {
    expect(MIN_PARTICIPANTS).toBe(2);
    // The modal's 2x2 grid depends on this; raising it breaks the layout.
    expect(MAX_PARTICIPANTS).toBe(4);
  });
});

describe("playerSlug", () => {
  it("collapses inner whitespace and lowercases so variants match", () => {
    expect(playerSlug("Mary  Jane")).toBe("mary jane");
    expect(playerSlug("  mary jane ")).toBe("mary jane");
    expect(playerSlug("Mary\tJane")).toBe("mary jane");
  });
});

describe("formatPct", () => {
  it("renders a 0-1 rate as a percentage with one decimal by default", () => {
    expect(formatPct(0.429)).toBe("42.9%");
    expect(formatPct(1)).toBe("100.0%");
    expect(formatPct(0)).toBe("0.0%");
  });

  it("honours a custom digit count", () => {
    expect(formatPct(0.5, 0)).toBe("50%");
    expect(formatPct(0.12345, 2)).toBe("12.35%");
  });
});

describe("capitalize", () => {
  it("upper-cases the first letter of a lowercase slug", () => {
    expect(capitalize("baum")).toBe("Baum");
    expect(capitalize("mary")).toBe("Mary");
  });

  it("leaves an already-capitalized name unchanged", () => {
    expect(capitalize("Pascal")).toBe("Pascal");
  });

  it("does not choke on an empty string", () => {
    expect(capitalize("")).toBe("");
  });
});

describe("getDynamicStats — player game cards", () => {
  it("appends last-played and streak cards for a player's recent games", () => {
    const games = [
      game("2026-07-23T18:00:00Z", ["pascal", "Fallout", true]),
      game("2026-07-24T18:00:00Z", ["pascal", "Daleks", true]),
    ];
    const cards = getDynamicStats([], games, "pascal");

    const lastPlayed = cards.find((c) => c.label === "Zuletzt gespielt");
    expect(lastPlayed?.value).toBe("Daleks"); // newest game wins

    const streak = cards.find((c) => c.label === "Serie");
    expect(streak?.value).toBe("2 Siege in Folge");
  });

  it("omits the game cards when no player is given", () => {
    const games = [game("2026-07-23T18:00:00Z", ["pascal", "Fallout", true])];
    const cards = getDynamicStats([], games);
    expect(cards.find((c) => c.label === "Zuletzt gespielt")).toBeUndefined();
    expect(cards.find((c) => c.label === "Serie")).toBeUndefined();
  });
});
