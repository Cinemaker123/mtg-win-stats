// React
import { useMemo } from "react";
import PropTypes from "prop-types";

// Hooks
import { useGames } from "../hooks/useGames.js";
import { useAllDecks } from "../hooks/useAllDecks.js";

// Components
import { PlayerAvatar } from "../components/PlayerAvatar.jsx";
import { ViewHeader } from "../components/ViewHeader.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { StatRow } from "../components/StatRow.jsx";
import { PlayerStrengthChart } from "../components/PlayerStrengthChart.jsx";
import { DeckScatter } from "../components/DeckScatter.jsx";

// Utils
import { getWinRateTier, adjustedWinRate, combineDeckStats, winRate, getCurrentStreak, streakDisplay, capitalize, formatPct, WIN_RATE_TIERS, MIN_GAMES_FOR_BEST_DECK, MIN_STREAK_GAMES, ACCENT_INFO, ACCENT_ACTIVITY, POD_BASELINE_WR, PLAYER_COLORS, PLAYER_GRADIENTS, PLAYERS } from "../utils/stats.js";

// Styles
import styles from "./GlobalStatsView.module.css";
import chrome from "../styles/viewChrome.module.css";

export function GlobalStatsView({ onBack, isDark, onToggleDark }) {
  const { games, loading: gamesLoading, error: gamesError } = useGames();
  const { decksByPlayer: allData, loading: decksLoading, error: decksError } = useAllDecks();
  const loading = gamesLoading || decksLoading;
  const error = gamesError || decksError;

  // Calculate statistics
  // Win rates are kept as 0-1 numbers throughout; formatted only at render time
  const stats = useMemo(() => {
    // Combined legacy + game counts, built once per player and reused by
    // every derivation below (it walks the whole games archive each time).
    const decksByPlayer = PLAYERS.map(player => ({
      player,
      decks: combineDeckStats(allData[player] || [], games, player),
    }));

    const playerStats = decksByPlayer.map(({ player, decks }) => {
      const totalWins = decks.reduce((s, d) => s + d.wins, 0);
      const totalLosses = decks.reduce((s, d) => s + d.losses, 0);
      const record = { wins: totalWins, losses: totalLosses };

      return {
        player,
        totalGames: totalWins + totalLosses,
        totalWins,
        totalLosses,
        winRate: winRate(record),
        adjusted: adjustedWinRate(record),
        deckCount: decks.length,
        gradient: PLAYER_GRADIENTS[player],
      };
    });
    // Sorted once here, not during render
    playerStats.sort((a, b) => b.winRate - a.winRate);

    const totalWinsAll = playerStats.reduce((s, p) => s + p.totalWins, 0);

    // "Games played" headline: the games table only covers Data Model v2 —
    // legacy pre-migration games only survive as frozen win/loss counters
    // on decks, with no per-game record at all. The most complete estimate
    // is the highest total (wins + losses) any single player has, not
    // games.length (which would only count v2-recorded games).
    const maxPlayerGames = Math.max(0, ...playerStats.map(p => p.totalGames));

    // Longest active win streak and longest active loss streak, pod-wide
    // (shown separately, each only if at least one player currently has one)
    const streaks = PLAYERS
      .map(player => ({ player, streak: getCurrentStreak(games, player) }))
      .filter(s => s.streak && s.streak.count >= MIN_STREAK_GAMES);
    const topStreak = type => streaks
      .filter(s => s.streak.type === type)
      .sort((a, b) => b.streak.count - a.streak.count)[0] || null;

    // Every played deck, in pod order for now — ranked further down.
    const allDecks = [];
    decksByPlayer.forEach(({ player, decks }) => {
      decks.forEach(deck => {
        const total = deck.wins + deck.losses;
        if (total > 0) {
          allDecks.push({
            ...deck,
            player,
            totalGames: total,
            winRate: winRate(deck),
            adjusted: adjustedWinRate(deck),
          });
        }
      });
    });

    // Most played deck — resolved before the sort below, so ties still
    // break in pod order rather than by adjusted win rate.
    const mostPlayed = allDecks.reduce(
      (top, deck) => (!top || deck.totalGames > top.totalGames ? deck : top),
      null
    );

    // Rank by bayesian-adjusted win rate so small samples regress toward
    // the pod baseline
    allDecks.sort((a, b) => b.adjusted - a.adjusted);

    // Best deck across all players (adjusted ranking, same minimum-games
    // threshold as the per-player dashboard so both agree)
    const bestDeck = allDecks.find(d => d.totalGames >= MIN_GAMES_FOR_BEST_DECK) || null;

    return {
      playerStats,
      totalWinsAll,
      maxPlayerGames,
      topWinStreak: topStreak("win"),
      topLossStreak: topStreak("loss"),
      bestDeck,
      mostPlayed,
      // All played decks, sorted by Bayesian-adjusted win rate
      allDecks,
    };
  }, [allData, games]);

  return (
    <div className={styles.container}>
      <ViewHeader
        icon="📊"
        title="Gesamtübersicht"
        onBack={onBack}
        isDark={isDark}
        onToggleDark={onToggleDark}
      >
        <button
          onClick={() => { window.location.hash = "/games"; }}
          className={chrome.backButton}
          title="Spielarchiv"
        >📜</button>
      </ViewHeader>

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <div className={styles.loadingText}>Lade Daten...</div>
          </div>
        ) : error ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingText}>{error}</div>
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            <div className={styles.section}>
              <div className={styles.statsGrid}>
                <StatCard
                  label="Spiele insgesamt"
                  value={stats.maxPlayerGames}
                  sub={stats.maxPlayerGames === 0 ? "Noch keine Spiele" : undefined}
                  accent={ACCENT_INFO}
                  icon="🎲"
                />
                <StatCard
                  label="Bestes Deck"
                  value={stats.bestDeck ? stats.bestDeck.name : "-"}
                  sub={stats.bestDeck ? `${formatPct(stats.bestDeck.winRate)} von ${capitalize(stats.bestDeck.player)}` : "Noch keine Daten"}
                  accent={WIN_RATE_TIERS.LEGENDARY.color}
                  icon="🏆"
                />
                <StatCard
                  label="Meistgespielt"
                  value={stats.mostPlayed ? stats.mostPlayed.name : "-"}
                  sub={stats.mostPlayed ? `${stats.mostPlayed.totalGames} Spiele von ${capitalize(stats.mostPlayed.player)}` : "Noch keine Daten"}
                  accent={ACCENT_ACTIVITY}
                  icon="🎯"
                />
                {[stats.topWinStreak, stats.topLossStreak].filter(Boolean).map(({ player, streak }) => {
                  const display = streakDisplay(streak);
                  return (
                    <StatCard
                      key={streak.type}
                      label="Serie"
                      value={capitalize(player)}
                      sub={`${streak.count} ${display.noun} in Folge`}
                      accent={display.accent}
                      icon={display.icon}
                      wide
                    />
                  );
                })}
              </div>
            </div>

            {/* Player strength: adjusted win rate ranking */}
            {stats.totalWinsAll > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Spielerstärke</div>
                <div className={styles.card}>
                  <PlayerStrengthChart playerStats={stats.playerStats} />
                </div>
              </div>
            )}

            {/* Activity vs. performance scatter */}
            {stats.allDecks.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Deckperformance</div>
                <div className={styles.card}>
                  <DeckScatter decks={stats.allDecks} />
                </div>
              </div>
            )}

            {/* Player Comparison */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Spieler-Vergleich</div>
              <div className={styles.playerList}>
                {stats.playerStats.map((p) => {
                  const tier = getWinRateTier(p.winRate);
                  return (
                    <StatRow
                      key={p.player}
                      variant="player"
                      avatar={<PlayerAvatar player={p.player} className={styles.playerAvatar} />}
                      name={capitalize(p.player)}
                      meta={`${p.deckCount} Decks • ${p.totalGames} Spiele`}
                      tier={tier}
                      winRate={p.winRate}
                      wins={p.totalWins}
                      losses={p.totalLosses}
                    >
                      {/* Win rate bar */}
                      <div className={styles.winRateBar}>
                        <div
                          className={styles.winRateBaseline}
                          title={`Zufalls-Baseline (${formatPct(POD_BASELINE_WR, 0)})`}
                        />
                        <div
                          className={styles.winRateBarFill}
                          style={{
                            width: `${Math.max(0, Math.min(100, p.winRate * 100))}%`,
                            background: p.gradient,
                          }}
                        />
                      </div>
                    </StatRow>
                  );
                })}
              </div>
            </div>

            {/* All decks, ranked by Bayesian-adjusted win rate */}
            {stats.allDecks.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Alle Decks</div>
                <div className={styles.deckList}>
                  {stats.allDecks.map((deck) => {
                    const tier = getWinRateTier(deck.winRate);
                    return (
                      <StatRow
                        key={`${deck.player}-${deck.name}`}
                        variant="deck"
                        avatar={
                          <PlayerAvatar
                            player={deck.player}
                            className={styles.deckAvatar}
                            background={PLAYER_COLORS[deck.player]}
                          />
                        }
                        name={deck.name}
                        meta={deck.player}
                        tier={tier}
                        winRate={deck.winRate}
                        wins={deck.wins}
                        losses={deck.losses}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

GlobalStatsView.propTypes = {
  onBack: PropTypes.func.isRequired,
  isDark: PropTypes.bool.isRequired,
  onToggleDark: PropTypes.func.isRequired,
};
