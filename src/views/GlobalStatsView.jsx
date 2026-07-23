// React
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

// Hooks
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useGames } from "../hooks/useGames.js";

// Components
import { DarkModeToggle } from "../components/DarkModeToggle.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { PodShareDonut } from "../components/PodShareDonut.jsx";
import { DeckScatter } from "../components/DeckScatter.jsx";

// Utils / API
import { supabase, getDecks } from "../supabaseClient.js";
import { getWinRateTier, adjustedWinRate, combineDeckStats, PLAYER_COLORS, PLAYER_GRADIENTS, PLAYERS } from "../utils/stats.js";

// Styles
import styles from "./GlobalStatsView.module.css";

export function GlobalStatsView({ onBack, isDark, onToggleDark }) {
  const isMobile = useIsMobile();
  const { games } = useGames();
  const [allData, setAllData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const px = isMobile ? 12 : 24;
  const refreshTimeoutRef = useRef(null);

  const loadAll = useCallback(() => {
    setError(null);
    return Promise.all(
      PLAYERS.map(player =>
        getDecks(player).then(decks => ({ player, decks }))
      )
    )
    .then(results => {
      const data = {};
      results.forEach(({ player, decks }) => {
        data[player] = decks;
      });
      setAllData(data);
    })
    .catch(e => {
      console.error("Failed to load global stats:", e);
      setError("Fehler beim Laden. Bitte erneut versuchen.");
    })
    .finally(() => setLoading(false));
  }, []);

  // Load data for all players on mount
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Realtime: refresh when any player's decks change (debounced)
  useEffect(() => {
    const channel = supabase
      .channel("decks-global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "decks" },
        () => {
          if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = setTimeout(loadAll, 500);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  // Calculate statistics
  // Win rates are kept as 0-1 numbers throughout; formatted only at render time
  const stats = useMemo(() => {
    const playerStats = PLAYERS.map(player => {
      const decks = combineDeckStats(allData[player] || [], games, player);
      const totalGames = decks.reduce((s, d) => s + d.wins + d.losses, 0);
      const totalWins = decks.reduce((s, d) => s + d.wins, 0);
      const totalLosses = decks.reduce((s, d) => s + d.losses, 0);
      const winRate = totalGames === 0 ? 0 : totalWins / totalGames;
      const deckCount = decks.length;

      return {
        player,
        totalGames,
        totalWins,
        totalLosses,
        winRate,
        deckCount,
        color: PLAYER_COLORS[player],
        gradient: PLAYER_GRADIENTS[player],
      };
    });
    // Sorted once here, not during render
    playerStats.sort((a, b) => b.winRate - a.winRate);

    const totalGamesAll = playerStats.reduce((s, p) => s + p.totalGames, 0);
    const totalWinsAll = playerStats.reduce((s, p) => s + p.totalWins, 0);
    const totalLossesAll = playerStats.reduce((s, p) => s + p.totalLosses, 0);
    const overallWinRate = totalGamesAll === 0 ? 0 : totalWinsAll / totalGamesAll;

    // All played decks, ranked by bayesian-adjusted win rate so small
    // samples regress toward the 25% pod baseline
    const allDecks = [];
    PLAYERS.forEach(player => {
      const decks = combineDeckStats(allData[player] || [], games, player);
      decks.forEach(deck => {
        const total = deck.wins + deck.losses;
        if (total > 0) {
          allDecks.push({
            ...deck,
            player,
            totalGames: total,
            winRate: deck.wins / total,
            adjusted: adjustedWinRate(deck),
          });
        }
      });
    });
    allDecks.sort((a, b) => b.adjusted - a.adjusted);

    // Best deck across all players (adjusted ranking, min. 3 games
    // so a fresh 2-0 deck can't take the crown)
    const bestDeck = allDecks.find(d => d.totalGames >= 3) || null;

    // Most played deck
    let mostPlayed = null;
    let maxGames = 0;
    PLAYERS.forEach(player => {
      const decks = combineDeckStats(allData[player] || [], games, player);
      decks.forEach(deck => {
        const total = deck.wins + deck.losses;
        if (total > maxGames) {
          maxGames = total;
          mostPlayed = { ...deck, player, totalGames: total };
        }
      });
    });

    return {
      playerStats,
      totalGamesAll,
      totalWinsAll,
      totalLossesAll,
      overallWinRate,
      bestDeck,
      mostPlayed,
      allDecks,
      // Top 5 excludes one-game wonders (min. 2 games)
      topDecks: allDecks.filter(d => d.totalGames >= 2).slice(0, 5),
    };
  }, [allData, games]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header} style={{ padding: `0 ${px}px` }}>
        <button
          onClick={onBack}
          className={styles.backButton}
          title="Zurück"
        >←</button>
        <span style={{ fontSize: 20 }}>📊</span>
        <span className={styles.title}>Gesamtübersicht</span>
        <button
          onClick={() => { window.location.hash = "/games"; }}
          className={styles.backButton}
          title="Spielarchiv"
        >📜</button>
        <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
      </div>

      {/* Content */}
      <div className={isMobile ? styles.contentMobile : styles.content}>
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
              <div className={styles.sectionTitle}>Gesamtübersicht</div>
              <div className={isMobile ? styles.statsGridMobile : styles.statsGrid}>
                <StatCard 
                  label="Gesamt-Winrate" 
                  value={`${(stats.overallWinRate * 100).toFixed(1)}%`}
                  sub={stats.totalGamesAll === 0 ? "Noch keine Spiele" : undefined}
                  accent={getWinRateTier(stats.overallWinRate).color} 
                  icon="📈"
                />
                <StatCard 
                  label="Bestes Deck" 
                  value={stats.bestDeck ? stats.bestDeck.name : "-"}
                  sub={stats.bestDeck ? `${(stats.bestDeck.winRate * 100).toFixed(1)}% von ${stats.bestDeck.player}` : "Noch keine Daten"}
                  accent="#f39c12" 
                  icon="🏆"
                />
                <StatCard 
                  label="Meistgespielt" 
                  value={stats.mostPlayed ? stats.mostPlayed.name : "-"}
                  sub={stats.mostPlayed ? `${stats.mostPlayed.totalGames} Spiele von ${stats.mostPlayed.player}` : "Noch keine Daten"}
                  accent="#9b59b6" 
                  icon="🎯"
                />
              </div>
            </div>

            {/* Player Comparison */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Spieler-Vergleich</div>
              <div className={styles.playerList}>
                {stats.playerStats.map((p) => (
                  <div key={p.player} className={styles.playerRow}>
                    <div 
                      className={styles.playerAvatar}
                      style={{ background: p.gradient }}
                    >
                      {p.player[0].toUpperCase()}
                    </div>
                    <div className={styles.playerInfo}>
                      <div className={styles.playerName}>{p.player}</div>
                      <div className={styles.playerMeta}>
                        {p.deckCount} Decks • {p.totalGames} Spiele
                      </div>
                    </div>
                    <div className={styles.playerStats}>
                      <div 
                        className={styles.winRate}
                        style={{ color: getWinRateTier(p.winRate).color }}
                      >
                        <span title={getWinRateTier(p.winRate).label}>
                          {getWinRateTier(p.winRate).icon}
                        </span>{" "}
                        {(p.winRate * 100).toFixed(1)}%
                      </div>
                      <div className={styles.record}>
                        {p.totalWins}W / {p.totalLosses}L
                      </div>
                    </div>
                    {/* Win rate bar */}
                    <div className={styles.winRateBar}>
                      <div
                        className={styles.winRateBaseline}
                        title="Zufalls-Baseline (25%)"
                      />
                      <div 
                        className={styles.winRateBarFill}
                        style={{ 
                          width: `${Math.max(0, Math.min(100, p.winRate * 100))}%`, 
                          background: p.gradient,
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pod share donut */}
            {stats.totalWinsAll > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Sieg-Anteile</div>
                <div className={styles.card}>
                  <PodShareDonut playerStats={stats.playerStats} />
                </div>
              </div>
            )}

            {/* Activity vs. performance scatter */}
            {stats.allDecks.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Aktivität vs. Winrate</div>
                <div className={styles.card}>
                  <DeckScatter decks={stats.allDecks} />
                </div>
              </div>
            )}

            {/* Top Decks */}
            {stats.topDecks.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Top 5 Decks</div>
                <div className={styles.deckList}>
                  {stats.topDecks.map((deck) => (
                    <div key={`${deck.player}-${deck.name}`} className={styles.deckRow}>
                      <div 
                        className={styles.deckAvatar}
                        style={{ background: PLAYER_COLORS[deck.player] }}
                      >
                        {deck.player[0].toUpperCase()}
                      </div>
                      <div className={styles.deckInfo}>
                        <div className={styles.deckName}>{deck.name}</div>
                        <div className={styles.deckPlayer}>{deck.player}</div>
                      </div>
                      <div className={styles.deckStats}>
                        <div 
                          className={styles.deckWinRate}
                          style={{ color: getWinRateTier(deck.winRate).color }}
                        >
                          <span title={getWinRateTier(deck.winRate).label}>
                            {getWinRateTier(deck.winRate).icon}
                          </span>{" "}
                          {(deck.winRate * 100).toFixed(1)}%
                        </div>
                        <div className={styles.deckRecord}>
                          {deck.wins}W / {deck.losses}L
                        </div>
                      </div>
                    </div>
                  ))}
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
