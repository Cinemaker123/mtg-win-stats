import { describe, it, expect } from "vitest";
import {
  winRate,
  adjustedWinRate,
  getWinRateTier,
  getDynamicStats,
  PRIOR_GAMES,
  PRIOR_WIN_RATE,
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
    expect(adjusted).toBeGreaterThan(0.85);
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
