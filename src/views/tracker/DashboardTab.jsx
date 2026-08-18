import PropTypes from "prop-types";
import { Logo } from "../../components/Logo.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import {
  winRate, adjustedWinRate, getDynamicStats, getWinRateTier,
  getCurrentStreak, getLastPlayed, WIN_RATE_TIERS,
} from "../../utils/stats.js";
import { DeckPropType } from "../../hooks/useDecks.js";
import styles from "../TrackerView.module.css";

/**
 * Dashboard tab showing statistics and deck overview
 * @param {Object} props
 * @param {Deck[]} props.decks - List of decks
 * @param {Array} props.games - All recorded games (for streak / last-played)
 * @param {string} props.player - Player identifier
 */
export function DashboardTab({ decks, games, player }) {
  const stats = getDynamicStats(decks);

  const lastPlayed = getLastPlayed(games, player);
  if (lastPlayed) {
    stats.push({
      label: "Zuletzt gespielt",
      value: lastPlayed.deck,
      sub: new Date(lastPlayed.playedAt).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }),
      accent: "#667eea",
      icon: "🕐",
    });
  }

  const streak = getCurrentStreak(games, player);
  if (streak && streak.count >= 2) {
    const isWin = streak.type === "win";
    stats.push({
      label: "Serie",
      value: `${streak.count} ${isWin ? "Siege" : "Niederlagen"} in Folge`,
      accent: isWin ? WIN_RATE_TIERS.GOOD.color : WIN_RATE_TIERS.STRUGGLING.color,
      icon: isWin ? "🔥" : "🥀",
    });
  }

  return (
    <>
      {stats.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyLogoWrapper}>
            <Logo size={80} />
          </div>
          <div className={styles.emptyTitle}>Noch keine Daten</div>
          <div className={styles.emptySubtitle}>Gehe zu Decks, um loszulegen</div>
        </div>
      ) : (
        <div className={styles.statsList}>
          {stats.map((s, i) => <StatCard key={i} {...s} />)}
        </div>
      )}

      {decks.length > 0 && (
        <>
          <div className={styles.deckListTitle}>
            Alle Decks
          </div>
          <div className={styles.card}>
            <div className={styles.legend}>
              {[["var(--color-success)","Siege"],["var(--color-error)","Niederlagen"]].map(([c,l]) => (
                <div key={l} className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ background: c }} />
                  <span className={styles.legendLabel}>{l}</span>
                </div>
              ))}
            </div>
            {[...decks].sort((a,b) => adjustedWinRate(b)-adjustedWinRate(a)).map((d,i,arr) => {
              const wr = winRate(d);
              return (
                <div key={i} className={styles.deckBar} style={{ marginBottom: i < arr.length-1 ? 12 : 0 }}>
                  <div className={styles.deckBarHeader}>
                    <span className={styles.deckBarName}>{d.name}</span>
                    <span className={styles.deckBarRecord}>{d.wins}W – {d.losses}L</span>
                  </div>
                  <div className={styles.deckBarTrack}>
                    <div 
                      className={styles.deckBarFill}
                      style={{
                        width: `${wr*100}%`,
                        background: getWinRateTier(wr).gradient,
                      }}
                    />
                    <div
                      className={styles.deckBarBaseline}
                      title="Zufalls-Baseline (25%)"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

DashboardTab.propTypes = {
  decks: PropTypes.arrayOf(DeckPropType).isRequired,
  games: PropTypes.array.isRequired,
  player: PropTypes.string.isRequired,
};
