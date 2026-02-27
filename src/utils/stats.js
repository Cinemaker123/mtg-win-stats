// Shared constants and utility functions

export const PLAYERS = ["baum", "mary", "pascal", "wewy"];

export const PLAYER_COLORS = {
  baum: "#27ae60",
  mary: "#e74c3c",
  pascal: "#6c3d82",
  wewy: "#f39c12",
};

export const PLAYER_GRADIENTS = {
  baum: "linear-gradient(135deg, #27ae60, #2ecc71)",
  mary: "linear-gradient(135deg, #e74c3c, #f39c12)",
  pascal: "linear-gradient(135deg, #6c3d82, #a855f7)",
  wewy: "linear-gradient(135deg, #f39c12, #f1c40f)",
};

export function getStorageKey(player) {
  return `mtg-decks-${player}`;
}

export function winRate(d) {
  const total = d.wins + d.losses;
  return total === 0 ? 0 : d.wins / total;
}

/**
 * 4-player Commander pod win rate tiers
 * >50% = Legendary (2x+ the 25% random average)
 * 25-50% = Good (above the 1-in-4 baseline)
 * <25% = Struggling (below statistical average)
 */
export const WIN_RATE_TIERS = {
  LEGENDARY: { min: 0.5, color: "#1e8449", icon: "🏆", label: "Legendär" },
  GOOD: { min: 0.25, color: "#2ecc71", icon: "📈", label: "Gut" },
  STRUGGLING: { min: 0, color: "#e74c3c", icon: "📉", label: "Ausbaufähig" },
};

/**
 * Get tier info for a win rate (0-1 or 0-100)
 * @param {number} wr - Win rate as decimal (0.5) or percentage (50)
 * @returns {{tier: string, color: string, icon: string, label: string, gradient: string}}
 */
export function getWinRateTier(wr) {
  // Normalize to 0-1 range
  const normalized = wr > 1 ? wr / 100 : wr;

  if (normalized > WIN_RATE_TIERS.LEGENDARY.min) {
    return {
      tier: "legendary",
      ...WIN_RATE_TIERS.LEGENDARY,
      gradient: "linear-gradient(90deg, #1e8449, #27ae60)",
    };
  }
  if (normalized >= WIN_RATE_TIERS.GOOD.min) {
    return {
      tier: "good",
      ...WIN_RATE_TIERS.GOOD,
      gradient: "linear-gradient(90deg, #27ae60, #2ecc71)",
    };
  }
  return {
    tier: "struggling",
    ...WIN_RATE_TIERS.STRUGGLING,
    gradient: "linear-gradient(90deg, #e74c3c, #f39c12)",
  };
}

export function getDynamicStats(decks) {
  if (decks.length === 0) return [];
  const totalGames = decks.reduce((s, d) => s + d.wins + d.losses, 0);
  const totalWins = decks.reduce((s, d) => s + d.wins, 0);
  const overallWR = totalGames === 0 ? 0 : totalWins / totalGames;

  const playedDecks = decks.filter(d => d.wins + d.losses > 0);
  const sortedByWR = [...playedDecks].sort((a, b) => winRate(b) - winRate(a));
  const best = sortedByWR[0];
  const worst = sortedByWR[sortedByWR.length - 1];

  const sortedByPlays = [...decks].sort((a, b) => (a.wins + a.losses) - (b.wins + b.losses));
  const leastPlayed = sortedByPlays[0];
  const maxPlays = Math.max(...decks.map(d => d.wins + d.losses));
  const minPlays = leastPlayed ? leastPlayed.wins + leastPlayed.losses : 0;
  // Show "Least played" only when there's a meaningful gap (3+ games difference)
  const hasPlayDiscrepancy = (maxPlays - minPlays) >= 3;

  const stats = [];

  // Use consolidated win rate tier logic
  const tier = getWinRateTier(overallWR);

  stats.push({
    label: "Gesamt-Winrate",
    value: `${Math.round(overallWR * 100)}%`,
    sub: `${totalWins}W – ${totalGames - totalWins}L · ${decks.length} Deck${decks.length !== 1 ? "s" : ""}`,
    accent: tier.color,
    icon: tier.icon,
  });

  if (best && (best.wins + best.losses) >= 2) {
    const bestTier = getWinRateTier(winRate(best));
    stats.push({
      label: "Bestes Deck",
      value: best.name,
      sub: `${Math.round(winRate(best) * 100)}% Winrate · ${best.wins}W ${best.losses}L`,
      accent: bestTier.color,
      icon: "🚀",
    });
  }

  if (worst && (worst.wins + worst.losses) >= 2 && worst !== best) {
    const worstTier = getWinRateTier(winRate(worst));
    stats.push({
      label: "Ausbaufähig",
      value: worst.name,
      sub: `${Math.round(winRate(worst) * 100)}% Winrate · ${worst.wins}W ${worst.losses}L`,
      accent: worstTier.color,
      icon: "🔧",
    });
  }

  // Only show "Least played" when one deck is significantly behind others
  if (leastPlayed && hasPlayDiscrepancy) {
    stats.push({
      label: "Wenig gespielt",
      value: leastPlayed.name,
      sub: `${leastPlayed.wins + leastPlayed.losses} Spiele`,
      accent: "#f39c12",
      icon: "📉",
    });
  }

  return stats;
}
