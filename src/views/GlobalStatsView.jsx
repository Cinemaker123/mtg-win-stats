import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { DarkModeToggle } from "../components/DarkModeToggle.jsx";
import { getDecks } from "../supabaseClient.js";
import { PLAYERS, PLAYER_COLORS, PLAYER_GRADIENTS, getWinRateTier } from "../utils/stats.js";

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
      allDecks: allDecks.slice(0, 5), // Top 5 decks
    };
  }, [allData]);

  const StatCard = ({ label, value, sub, accent, icon }) => (
    <div style={{
      background: isDark ? "#252536" : "#fff",
      borderRadius: 16,
      padding: "14px 16px",
      boxShadow: isDark 
        ? "0 1px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)"
        : "0 1px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: 12,
      position: "relative",
      overflow: "hidden",
      minWidth: 0,
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
        background: accent, borderRadius: "16px 0 0 16px",
      }} />
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: accent + "25",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, marginLeft: 8,
      }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? "#888" : "#aaa", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'Outfit', sans-serif", marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? "#f0f0f0" : "#1a1a2e", fontFamily: "'Outfit', sans-serif", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: isDark ? "#888" : "#888", fontFamily: "'DM Sans', sans-serif", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: isDark ? "#1a1a2e" : "#f4f6fb" }}>
      {/* Header */}
      <div style={{
        background: isDark ? "#252536" : "#fff", 
        boxShadow: isDark ? "0 1px 0 rgba(255,255,255,0.05)" : "0 1px 0 rgba(0,0,0,0.08)",
        padding: `0 ${px}px`, display: "flex", alignItems: "center", gap: 12,
        height: 52, flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            width: 36, height: 36, borderRadius: 10, border: "none",
            background: isDark ? "#353545" : "#f0f0f0", color: isDark ? "#ccc" : "#666",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? "#454555" : "#e0e0e0"}
          onMouseLeave={e => e.currentTarget.style.background = isDark ? "#353545" : "#f0f0f0"}
          title="Zurück"
        >←</button>
        <span style={{ fontSize: 20 }}>📊</span>
        <span style={{
          fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 16, color: isDark ? "#f0f0f0" : "#1a1a2e",
          flex: 1,
        }}>Gesamtübersicht</span>
        <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: `16px ${px}px`,
        paddingBottom: 24,
      }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: isDark ? "#888" : "#888" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: `3px solid ${isDark ? "#353545" : "#e0e0e0"}`,
              borderTopColor: "#667eea",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>Lade Daten...</div>
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 18, color: isDark ? "#f0f0f0" : "#1a1a2e", marginBottom: 12 }}>
                Gesamtübersicht
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
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
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 18, color: isDark ? "#f0f0f0" : "#1a1a2e", marginBottom: 12 }}>
                Spieler-Vergleich
              </div>
              <div style={{ 
                background: isDark ? "#252536" : "#fff",
                borderRadius: 16,
                padding: 16,
                boxShadow: isDark 
                  ? "0 1px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)"
                  : "0 1px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
              }}>
                {stats.playerStats.sort((a, b) => b.winRate - a.winRate).map((p, i) => (
                  <div key={p.player} style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 12, 
                    padding: "10px 0",
                    borderBottom: i < stats.playerStats.length - 1 ? `1px solid ${isDark ? "#353545" : "#f0f0f0"}` : "none",
                  }}>
                    <div style={{ 
                      width: 32, height: 32, borderRadius: "50%",
                      background: p.gradient,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800, color: "#fff",
                      fontFamily: "'Outfit', sans-serif",
                      textTransform: "uppercase",
                    }}>{p.player[0].toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: isDark ? "#f0f0f0" : "#1a1a2e", textTransform: "capitalize" }}>
                        {p.player}
                      </div>
                      <div style={{ fontSize: 11, color: isDark ? "#888" : "#888" }}>
                        {p.deckCount} Decks • {p.totalGames} Spiele
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 16,
                        color: getWinRateTier(parseFloat(p.winRate)).color }}>
                        {p.winRate}%
                      </div>
                      <div style={{ fontSize: 10, color: isDark ? "#888" : "#888" }}>
                        {p.totalWins}W / {p.totalLosses}L
                      </div>
                    </div>
                    {/* Win rate bar */}
                    <div style={{ width: 60, height: 6, background: isDark ? "#353545" : "#e0e0e0", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ 
                        width: `${Math.max(0, Math.min(100, p.winRate))}%`, 
                        height: "100%", 
                        background: p.gradient,
                        borderRadius: 3,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Decks */}
            {stats.allDecks.length > 0 && (
              <div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 18, color: isDark ? "#f0f0f0" : "#1a1a2e", marginBottom: 12 }}>
                  Top 5 Decks
                </div>
                <div style={{ 
                  background: isDark ? "#252536" : "#fff",
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: isDark 
                    ? "0 1px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)"
                    : "0 1px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
                }}>
                  {stats.allDecks.map((deck, i) => (
                    <div key={`${deck.player}-${deck.name}`} style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 12, 
                      padding: "10px 0",
                      borderBottom: i < stats.allDecks.length - 1 ? `1px solid ${isDark ? "#353545" : "#f0f0f0"}` : "none",
                    }}>
                      <div style={{ 
                        width: 24, height: 24, borderRadius: "50%",
                        background: PLAYER_COLORS[deck.player],
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: "#fff",
                      }}>{deck.player[0].toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: isDark ? "#f0f0f0" : "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {deck.name.charAt(0).toUpperCase() + deck.name.slice(1)}
                        </div>
                        <div style={{ fontSize: 10, color: isDark ? "#888" : "#888", textTransform: "capitalize" }}>
                          {deck.player}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 14,
                          color: getWinRateTier(parseFloat(deck.winRate)).color }}>
                          {deck.winRate}%
                        </div>
                        <div style={{ fontSize: 10, color: isDark ? "#888" : "#888" }}>
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
