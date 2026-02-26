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

export const SAMPLE_DECKS = [
  { name: "Azorius Control", wins: 12, losses: 5 },
  { name: "Mono Red Burn", wins: 8, losses: 9 },
  { name: "Golgari Midrange", wins: 15, losses: 7 },
  { name: "Simic Ramp", wins: 6, losses: 11 },
];

export function getStorageKey(player) {
  return `mtg-decks-${player}`;
}

export function winRate(d) {
  const total = d.wins + d.losses;
  return total === 0 ? 0 : d.wins / total;
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

  // 4-player pod context: 25% = average (1 in 4 wins)
  // >50% = legendary (2x average), 25-50% = above average, <25% = below average
  const wrPercent = overallWR * 100;
  let wrAccent, wrIcon, wrLabel;
  if (wrPercent > 50) {
    wrAccent = "#2ecc71"; // Green - legendary
    wrIcon = "🏆";
  } else if (wrPercent >= 25) {
    wrAccent = "#f39c12"; // Orange - above average  
    wrIcon = "📈";
  } else {
    wrAccent = "#e74c3c"; // Red - below average
    wrIcon = "📉";
  }
  
  stats.push({
    label: "Gesamt-Winrate",
    value: `${Math.round(wrPercent)}%`,
    sub: `${totalWins}W – ${totalGames - totalWins}L · ${decks.length} Deck${decks.length !== 1 ? "s" : ""}`,
    accent: wrAccent,
    icon: wrIcon,
  });

  if (best && (best.wins + best.losses) >= 2) {
    stats.push({
      label: "Bestes Deck",
      value: best.name,
      sub: `${Math.round(winRate(best) * 100)}% Winrate · ${best.wins}W ${best.losses}L`,
      accent: "#2ecc71",
      icon: "🚀",
    });
  }

  if (worst && (worst.wins + worst.losses) >= 2 && worst !== best) {
    stats.push({
      label: "Ausbaufähig",
      value: worst.name,
      sub: `${Math.round(winRate(worst) * 100)}% Winrate · ${worst.wins}W ${worst.losses}L`,
      accent: "#e74c3c",
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
