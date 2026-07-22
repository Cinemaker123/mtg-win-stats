import { describe, it, expect } from "vitest";
import { winRate, getWinRateTier, getDynamicStats } from "./stats.js";

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

describe("getWinRateTier", () => {
  it("classifies pod win rates into tiers", () => {
    expect(getWinRateTier(0.6).tier).toBe("legendary");
    expect(getWinRateTier(0.25).tier).toBe("good");
    expect(getWinRateTier(0.5).tier).toBe("good"); // exactly 50% is not legendary
    expect(getWinRateTier(0.1).tier).toBe("struggling");
  });

  it("accepts percentages via the legacy 0-100 heuristic", () => {
    expect(getWinRateTier(60).tier).toBe("legendary");
    expect(getWinRateTier(10).tier).toBe("struggling");
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
});
