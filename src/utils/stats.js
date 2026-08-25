// Shared constants and utility functions

export const PLAYERS = ["baum", "mary", "pascal", "wewy"];

// Viewport width below which the mobile layout is used
export const MOBILE_BREAKPOINT = 640;

// Expected win rate in a 4-player pod if every game were a coin flip.
// This single number anchors the whole statistical story: the Bayesian
// prior, the "Gut" tier boundary, and the baseline ticks the charts draw.
export const POD_BASELINE_WR = 1 / PLAYERS.length;

/**
 * Format a 0-1 win rate as a percentage string.
 * @param {number} wr - Win rate between 0 and 1
 * @param {number} [digits] - Decimal places
 * @returns {string} e.g. "42.9%"
 */
export function formatPct(wr, digits = 1) {
  return `${(wr * 100).toFixed(digits)}%`;
}

/**
 * Capitalize a player identifier for display (player names are stored
 * lowercase — "baum", "mary" — but should read as "Baum", "Mary").
 * @param {string} name
 * @returns {string}
 */
export function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * The canonical slug for a player name: trimmed, inner whitespace collapsed,
 * lowercased. Both the duplicate check and the DB write go through this so
 * "Mary  Jane" and "mary jane" resolve to the same player.
 * @param {string} name - display name as typed
 * @returns {string} - slug
 */
export function playerSlug(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Raw win rate of a deck (0-1)
 * @param {{wins: number, losses: number}} d - Deck object
 * @returns {number} Win rate between 0 and 1
 */
export function winRate(d) {
  const total = d.wins + d.losses;
  return total === 0 ? 0 : d.wins / total;
}

// Bayesian adjustment prior: every deck is treated as if it had already
// played PRIOR_GAMES imaginary games at the 4-player pod baseline (25%).
// Unproven decks therefore regress toward the random average instead of
// topping the rankings on tiny samples (e.g. a lucky 2-0).
export const PRIOR_GAMES = 10;
export const PRIOR_WIN_RATE = POD_BASELINE_WR;

/**
 * Bayesian-adjusted win rate for ranking decks (0-1)
 * @param {{wins: number, losses: number}} d - Deck object
 * @param {number} [priorGames] - Number of imaginary prior games
 * @param {number} [priorWR] - Win rate of the imaginary prior games
 * @returns {number} Adjusted win rate between 0 and 1
 */
export function adjustedWinRate(d, priorGames = PRIOR_GAMES, priorWR = PRIOR_WIN_RATE) {
  const total = d.wins + d.losses;
  return (d.wins + priorGames * priorWR) / (total + priorGames);
}

/**
 * 4-player Commander pod win rate tiers
 * >50% = Legendary (2x+ the 25% random average)
 * 25-50% = Good (above the 1-in-4 baseline)
 * <25% = Struggling (below statistical average)
 */
export const WIN_RATE_TIERS = {
  LEGENDARY: { min: 2 * POD_BASELINE_WR, icon: "🏆", label: "Legendär" },
  GOOD: { min: POD_BASELINE_WR, icon: "📈", label: "Gut" },
  STRUGGLING: { min: 0, icon: "📉", label: "Ausbaufähig" },
};

/**
 * Get tier info for a win rate. The returned `tier` is a CSS hook: put it on
 * an element as `data-tier` and read `--tier-color` / `--tier-gradient` back
 * out. No colour crosses this boundary.
 * @param {number} wr - Win rate as decimal in the 0-1 range (e.g. 0.5 = 50%)
 * @returns {{tier: string, icon: string, label: string}}
 */
export function getWinRateTier(wr) {
  if (!(wr >= 0 && wr <= 1)) {
    // Win rates are 0-1 numbers everywhere. A percentage (e.g. 50) or a NaN
    // here means a caller skipped winRate()/adjustedWinRate(). Fail loudly
    // instead of silently returning the "struggling" tier for a 50% deck.
    throw new RangeError(`getWinRateTier expects a 0-1 win rate, got ${wr}`);
  }
  if (wr > WIN_RATE_TIERS.LEGENDARY.min) {
    return {
      tier: "legendary",
      ...WIN_RATE_TIERS.LEGENDARY,
    };
  }
  if (wr >= WIN_RATE_TIERS.GOOD.min) {
    return {
      tier: "good",
      ...WIN_RATE_TIERS.GOOD,
    };
  }
  return {
    tier: "struggling",
    ...WIN_RATE_TIERS.STRUGGLING,
  };
}

// Minimum games played before a deck can be crowned "best"/"worst" —
// shared by the per-player dashboard and Global Stats so both agree.
export const MIN_GAMES_FOR_BEST_DECK = 2;

// Minimum consecutive results before a streak is worth surfacing —
// shared by the per-player dashboard and Global Stats so both agree.
export const MIN_STREAK_GAMES = 2;

// Smallest pod a recorded game can have. Fewer than two players isn't a
// game, and the new-game modal blocks saving below it.
export const MIN_PARTICIPANTS = 2;

// Largest pod a recorded game can have. The new-game modal lays participants
// out in a fixed 2x2 grid, so a fifth would break the layout — the cap is why
// adding a non-pod player means freeing a slot first.
export const MAX_PARTICIPANTS = 4;

// Games a deck needs before the scatter plot treats its win rate as
// meaningful (the "bewährt" zone). Deliberately stricter than
// MIN_GAMES_FOR_BEST_DECK, which only gates a headline card.
export const PROVEN_DECK_GAMES = 5;

/**
 * Presentation for a win/loss streak, as a StatCard-shaped object.
 * Both the dashboard and Global Stats render streaks, and previously each
 * re-implemented the icon, tier and wording independently.
 * @param {{type: 'win'|'loss', count: number}|null} streak
 * @returns {{icon: string, tier: string, noun: string}|null} - null if not worth showing
 */
export function streakDisplay(streak) {
  if (!streak || streak.count < MIN_STREAK_GAMES) return null;
  const isWin = streak.type === "win";
  return {
    icon: isWin ? "🔥" : "🥀",
    tier: isWin ? "good" : "struggling",
    noun: isWin ? "Siege" : "Niederlagen",
  };
}

/**
 * The stat cards shown on a player's dashboard.
 * Games are optional so the deck-only cards stay unit-testable on their own.
 * @param {Array} decks - combined deck stats for the player
 * @param {Array} [games] - all recorded games (for last-played / streak cards)
 * @param {string} [player] - player the games belong to
 * @returns {Array} StatCard props
 */
export function getDynamicStats(decks, games = [], player = null) {
  const stats = decks.length === 0 ? [] : deckStatCards(decks);

  if (player) {
    const lastPlayed = getLastPlayed(games, player);
    if (lastPlayed) {
      stats.push({
        label: "Zuletzt gespielt",
        value: lastPlayed.deck,
        sub: new Date(lastPlayed.playedAt).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }),
        accent: "info",
        icon: "🕐",
      });
    }

    const streak = getCurrentStreak(games, player);
    const display = streakDisplay(streak);
    if (display) {
      stats.push({
        label: "Serie",
        value: `${streak.count} ${display.noun} in Folge`,
        accent: display.tier,
        icon: display.icon,
      });
    }
  }

  return stats;
}

function deckStatCards(decks) {
  const totalGames = decks.reduce((s, d) => s + d.wins + d.losses, 0);
  const totalWins = decks.reduce((s, d) => s + d.wins, 0);
  const overallWR = totalGames === 0 ? 0 : totalWins / totalGames;

  const playedDecks = decks.filter(d => d.wins + d.losses > 0);
  // Rank by bayesian-adjusted win rate so small samples don't dominate
  const sortedByWR = [...playedDecks].sort((a, b) => adjustedWinRate(b) - adjustedWinRate(a));
  const best = sortedByWR[0];
  const worst = sortedByWR[sortedByWR.length - 1];

  const stats = [];

  // Use consolidated win rate tier logic
  const tier = getWinRateTier(overallWR);

  stats.push({
    label: "Gesamt-Winrate",
    value: `${Math.round(overallWR * 100)}%`,
    sub: `${totalWins}W – ${totalGames - totalWins}L · ${decks.length} Deck${decks.length !== 1 ? "s" : ""}`,
    accent: tier.tier,
    icon: tier.icon,
  });

  if (best && (best.wins + best.losses) >= MIN_GAMES_FOR_BEST_DECK) {
    const bestTier = getWinRateTier(winRate(best));
    stats.push({
      label: "Bestes Deck",
      value: best.name,
      sub: `${Math.round(winRate(best) * 100)}% Winrate · ${best.wins}W ${best.losses}L`,
      accent: bestTier.tier,
      icon: "🚀",
    });
  }

  if (worst && (worst.wins + worst.losses) >= MIN_GAMES_FOR_BEST_DECK && worst !== best) {
    const worstTier = getWinRateTier(winRate(worst));
    stats.push({
      label: "Ausbaufähig",
      value: worst.name,
      sub: `${Math.round(winRate(worst) * 100)}% Winrate · ${worst.wins}W ${worst.losses}L`,
      accent: worstTier.tier,
      icon: "🔧",
    });
  }

  return stats;
}

/**
 * Combine frozen legacy deck counters with game-derived counts (Data Model v2).
 * Stats everywhere operate on these combined counts:
 *   combined = legacy baseline (decks.wins/losses, frozen) + games since migration
 * Decks that only exist in games (deleted from the registry) still appear.
 * @param {Array} legacyDecks - registry decks ({ name, wins, losses })
 * @param {Array} games - games ({ participants: [{ player, deck, isWinner }] })
 * @param {string} player - player to compute counts for
 * @returns {Array} - deck list ({ name, wins, losses })
 */
export function combineDeckStats(legacyDecks, games, player) {
  const combined = new Map();
  for (const d of legacyDecks) {
    combined.set(d.name.toLowerCase(), { name: d.name, wins: d.wins, losses: d.losses });
  }
  for (const g of games) {
    for (const p of g.participants) {
      if (p.player !== player) continue;
      const key = p.deck.toLowerCase();
      const entry = combined.get(key) || { name: p.deck, wins: 0, losses: 0 };
      if (p.isWinner) {
        entry.wins += 1;
      } else {
        entry.losses += 1;
      }
      combined.set(key, entry);
    }
  }
  return [...combined.values()];
}

/**
 * A player's own recorded games, newest first, with the deck/result for
 * each. Legacy baseline stats (pre-Data Model v2) have no per-game
 * timestamps and are not represented here.
 * @param {Array} games - games ({ playedAt, participants: [{ player, deck, isWinner }] })
 * @param {string} player - player to filter to
 * @returns {Array<{playedAt: string, deck: string, isWinner: boolean}>}
 */
export function playerGameHistory(games, player) {
  const played = [];
  for (const game of games) {
    const entry = game.participants.find(p => p.player === player);
    // Timestamp parsed once per game here, rather than twice per
    // comparison inside the sort below.
    if (entry) played.push({ game, entry, at: new Date(game.playedAt).getTime() });
  }
  played.sort((a, b) => b.at - a.at);
  return played.map(({ game, entry }) => ({
    playedAt: game.playedAt,
    deck: entry.deck,
    isWinner: entry.isWinner,
  }));
}

/**
 * A player's current win or loss streak, based on their most recent games.
 * @param {Array} games - all recorded games
 * @param {string} player - player to compute the streak for
 * @returns {{type: 'win'|'loss', count: number}|null} - null if no games recorded
 */
export function getCurrentStreak(games, player) {
  const history = playerGameHistory(games, player);
  if (history.length === 0) return null;

  const type = history[0].isWinner ? "win" : "loss";
  let count = 0;
  for (const g of history) {
    if (g.isWinner !== (type === "win")) break;
    count++;
  }
  return { type, count };
}

/**
 * The deck and date of a player's most recently recorded game.
 * @param {Array} games - all recorded games
 * @param {string} player - player to look up
 * @returns {{deck: string, playedAt: string}|null} - null if no games recorded
 */
export function getLastPlayed(games, player) {
  const [latest] = playerGameHistory(games, player);
  return latest ? { deck: latest.deck, playedAt: latest.playedAt } : null;
}
