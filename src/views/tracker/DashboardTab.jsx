import PropTypes from "prop-types";
import { Logo } from "../../components/Logo.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { winRate, getDynamicStats, getWinRateTier } from "../../utils/stats.js";
import { DeckPropType } from "../../hooks/useDecks.js";
import styles from "../TrackerView.module.css";

/**
 * Dashboard tab showing statistics and deck overview
 * @param {Object} props
 * @param {Deck[]} props.decks - List of decks
 */
export function DashboardTab({ decks }) {
  const stats = getDynamicStats(decks);

  return (
    <>
      <div className={styles.sectionTitle}>
        <div className={styles.sectionTitleRow}>Dashboard</div>
        <div className={styles.sectionSubtitle}>Deine MTG-Performance auf einen Blick</div>
      </div>

      {stats.length === 0 ? (
        <div className={styles.emptyState}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
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
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--color-text)", marginBottom: 10 }}>
            Alle Decks
          </div>
          <div className={styles.card}>
            <div className={styles.legend}>
              {[["#27ae60","Siege"],["#e74c3c","Niederlagen"]].map(([c,l]) => (
                <div key={l} className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ background: c }} />
                  <span className={styles.legendLabel}>{l}</span>
                </div>
              ))}
            </div>
            {[...decks].sort((a,b) => winRate(b)-winRate(a)).map((d,i,arr) => {
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
};
