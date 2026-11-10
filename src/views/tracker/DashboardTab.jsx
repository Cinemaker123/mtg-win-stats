import { useMemo } from "react";
import PropTypes from "prop-types";
import { Logo } from "../../components/Logo.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import {
  winRate, adjustedWinRate, getDynamicStats, getWinRateTier,
  formatPct, POD_BASELINE_WR, WIN_RATE_TIERS,
} from "../../utils/stats.js";
import { DeckPropType } from "../../data/queries.js";
import styles from "../TrackerView.module.css";

// Legend order follows the bar colours below: gold (best) > green > red
// (below the pod baseline). The labels come from WIN_RATE_TIERS, so the legend
// cannot drift from the tiers getWinRateTier() assigns to the bars.
const LEGEND_TIERS = [
  { tier: "legendary", label: WIN_RATE_TIERS.LEGENDARY.label },
  { tier: "good", label: WIN_RATE_TIERS.GOOD.label },
  { tier: "struggling", label: WIN_RATE_TIERS.STRUGGLING.label },
];

/**
 * Dashboard tab showing statistics and deck overview
 * @param {Object} props
 * @param {Deck[]} props.decks - List of decks
 * @param {Array} props.games - All recorded games (for streak / last-played)
 * @param {string} props.player - Player identifier
 */
export function DashboardTab({ decks, games, player }) {
  // Both derivations walk every deck and every game, so keep them off the
  // render path — this tab also re-renders for toasts and tab switches.
  const stats = useMemo(
    () => getDynamicStats(decks, games, player),
    [decks, games, player]
  );
  const rankedDecks = useMemo(
    () => [...decks].sort((a, b) => adjustedWinRate(b) - adjustedWinRate(a)),
    [decks]
  );

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
              {LEGEND_TIERS.map(({ tier, label }) => (
                <div key={tier} className={styles.legendItem}>
                  <div className={styles.legendColor} data-tier={tier} />
                  <span className={styles.legendLabel}>{label}</span>
                </div>
              ))}
            </div>
            {rankedDecks.map((d,i,arr) => {
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
                      data-tier={getWinRateTier(wr).tier}
                      style={{ width: `${wr*100}%` }}
                    />
                    <div
                      className={styles.deckBarBaseline}
                      title={`Zufalls-Baseline (${formatPct(POD_BASELINE_WR, 0)})`}
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
