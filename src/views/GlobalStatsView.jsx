import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { DarkModeToggle } from "../components/DarkModeToggle.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { getDecks } from "../supabaseClient.js";
import { PLAYERS, PLAYER_COLORS, PLAYER_GRADIENTS, getWinRateTier } from "../utils/stats.js";
import styles from "./GlobalStatsView.module.css";

export function GlobalStatsView({ onBack, isDark, onToggleDark }) {
  const isMobile = useIsMobile();
  const [allData, setAllData] = useState({});
  const [loading, setLoading] = useState(true);
  const px = isMobile ? 12 : 24;

  // Load data for all players
  useEffect(() => {
    setLoading(true);
    Promise.all(
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
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const playerStats = PLAYERS.map(player => {
      const decks = allData[player] || [];
      const totalGames = decks.reduce((s, d) => s + d.wins + d.losses, 0);
      const totalWins = decks.reduce((s, d) => s + d.wins, 0);
      const totalLosses = decks.reduce((s, d) => s + d.losses, 0);
      const winRate = totalGames === 0 ? 0 : (totalWins / totalGames * 100).toFixed(1);
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

    const totalGamesAll = playerStats.reduce((s, p) => s + p.totalGames, 0);
    const totalWinsAll = playerStats.reduce((s, p) => s + p.totalWins, 0);
    const totalLossesAll = playerStats.reduce((s, p) => s + p.totalLosses, 0);
    const overallWinRate = totalGamesAll === 0 ? 0 : (totalWinsAll / totalGamesAll * 100).toFixed(1);

    // Best deck across all players
    let bestDeck = null;
    let bestWinRate = -1;
    PLAYERS.forEach(player => {
      const decks = allData[player] || [];
      decks.forEach(deck => {
        const total = deck.wins + deck.losses;
        if (total > 0) {
          const wr = deck.wins / total;
          if (wr > bestWinRate) {
            bestWinRate = wr;
            bestDeck = { ...deck, player, winRate: (wr * 100).toFixed(1) };
          }
        }
      });
    });

    // Most played deck
    let mostPlayed = null;
    let maxGames = 0;
    PLAYERS.forEach(player => {
      const decks = allData[player] || [];
      decks.forEach(deck => {
        const total = deck.wins + deck.losses;
        if (total > maxGames) {
          maxGames = total;
          mostPlayed = { ...deck, player, totalGames: total };
        }
      });
    });

    // All decks for ranking
    const allDecks = [];
    PLAYERS.forEach(player => {
      const decks = allData[player] || [];
      decks.forEach(deck => {
        const total = deck.wins + deck.losses;
        if (total > 0) {
          allDecks.push({
            ...deck,
            player,
            totalGames: total,
            winRate: (deck.wins / total * 100).toFixed(1),
          });
        }
      });
    });
    allDecks.sort((a, b) => b.wins / b.totalGames - a.wins / a.totalGames);

    return {
      playerStats,
      totalGamesAll,
      totalWinsAll,
      totalLossesAll,
      overallWinRate,
      bestDeck,
      mostPlayed,
      allDecks: allDecks.slice(0, 5),
    };
  }, [allData]);

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
        <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
      </div>

      {/* Content */}
      <div className={isMobile ? styles.contentMobile : styles.content}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <div className={styles.loadingText}>Lade Daten...</div>
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Gesamtübersicht</div>
              <div className={isMobile ? styles.statsGridMobile : styles.statsGrid}>
                <StatCard 
                  label="Spiele insgesamt" 
                  value={stats.totalGamesAll} 
                  sub={`${stats.totalWinsAll} Siege / ${stats.totalLossesAll} Niederlagen`}
                  accent="#667eea" 
                  icon="🎮"
                />
                <StatCard 
                  label="Gesamt-Winrate" 
                  value={`${stats.overallWinRate}%`}
                  sub={stats.totalGamesAll > 0 ? `${(stats.totalWinsAll / stats.totalGamesAll * 100) > 50 ? "🔥 Über 50%" : "📈 Unter 50%"}` : "Noch keine Spiele"}
                  accent={stats.overallWinRate >= 50 ? "#27ae60" : "#e74c3c"} 
                  icon="📈"
                />
                <StatCard 
                  label="Bestes Deck" 
                  value={stats.bestDeck ? stats.bestDeck.name.charAt(0).toUpperCase() + stats.bestDeck.name.slice(1) : "-"}
                  sub={stats.bestDeck ? `${stats.bestDeck.winRate}% von ${stats.bestDeck.player}` : "Noch keine Daten"}
                  accent="#f39c12" 
                  icon="🏆"
                />
                <StatCard 
                  label="Meistgespielt" 
                  value={stats.mostPlayed ? stats.mostPlayed.name.charAt(0).toUpperCase() + stats.mostPlayed.name.slice(1) : "-"}
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
                {stats.playerStats.sort((a, b) => b.winRate - a.winRate).map((p) => (
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
                        style={{ color: getWinRateTier(parseFloat(p.winRate)).color }}
                      >
                        {p.winRate}%
                      </div>
                      <div className={styles.record}>
                        {p.totalWins}W / {p.totalLosses}L
                      </div>
                    </div>
                    {/* Win rate bar */}
                    <div className={styles.winRateBar}>
                      <div 
                        className={styles.winRateBarFill}
                        style={{ 
                          width: `${Math.max(0, Math.min(100, p.winRate))}%`, 
                          background: p.gradient,
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Decks */}
            {stats.allDecks.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Top 5 Decks</div>
                <div className={styles.deckList}>
                  {stats.allDecks.map((deck) => (
                    <div key={`${deck.player}-${deck.name}`} className={styles.deckRow}>
                      <div 
                        className={styles.deckAvatar}
                        style={{ background: PLAYER_COLORS[deck.player] }}
                      >
                        {deck.player[0].toUpperCase()}
                      </div>
                      <div className={styles.deckInfo}>
                        <div className={styles.deckName}>
                          {deck.name.charAt(0).toUpperCase() + deck.name.slice(1)}
                        </div>
                        <div className={styles.deckPlayer}>{deck.player}</div>
                      </div>
                      <div className={styles.deckStats}>
                        <div 
                          className={styles.deckWinRate}
                          style={{ color: getWinRateTier(parseFloat(deck.winRate)).color }}
                        >
                          {deck.winRate}%
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
