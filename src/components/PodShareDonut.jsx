import PropTypes from "prop-types";
import styles from "./PodShareDonut.module.css";

// Expected win share per player in a 4-player pod
const BASELINE = 0.25;

// Bayesian smoothing: treat every player as if they'd already played
// PRIOR_GAMES imaginary games at the pod baseline win rate. This pulls
// small-sample players (e.g. 2 wins from 2 games) back toward 25%
// instead of letting them dominate the donut arcs.
const PRIOR_GAMES = 5;

/**
 * Donut chart of each player's share of total wins, with per-player
 * delta against the 25% pod baseline. Hand-rolled SVG, no dependencies.
 *
 * Note: the donut arcs use Bayesian-adjusted (shrunk + renormalized)
 * shares so small samples don't dominate visually. The legend's
 * percentage and delta show the raw, unadjusted win share instead,
 * so the numbers reflect actual results as played.
 *
 * @param {Object} props
 * @param {Array} props.playerStats - Per-player stats ({ player, totalWins, totalGames, color })
 */
export function PodShareDonut({ playerStats }) {
  const totalWins = playerStats.reduce((s, p) => s + p.totalWins, 0);
  const totalGames = playerStats.reduce((s, p) => s + p.totalGames, 0);
  if (totalWins === 0) return null;

  const R = 80;
  const C = 2 * Math.PI * R;

  // Bayesian-adjusted win rate per player: (wins + priorGames * baseline) / (games + priorGames)
  const adjustedRates = playerStats.map(
    p => (p.totalWins + PRIOR_GAMES * BASELINE) / (p.totalGames + PRIOR_GAMES)
  );
  const adjustedTotal = adjustedRates.reduce((s, v) => s + v, 0);
  // Renormalize so the arcs sum to a full circle
  const arcShares = adjustedRates.map(r => r / adjustedTotal);

  const segments = playerStats.map((p, i) => ({
    player: p.player,
    color: p.color,
    arcShare: arcShares[i],
    rawShare: p.totalWins / totalWins,
    offset: arcShares.slice(0, i).reduce((s, v) => s + v, 0),
  }));

  return (
    <div className={styles.wrapper}>
      <svg viewBox="0 0 200 200" className={styles.donut} role="img" aria-label="Spielerstärke">
        {segments.map(s => (
          <circle
            key={s.player}
            cx="100" cy="100" r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="30"
            strokeDasharray={`${s.arcShare * C} ${C - s.arcShare * C}`}
            strokeDashoffset={-s.offset * C}
            transform="rotate(-90 100 100)"
          >
              <title>{`${s.player.charAt(0).toUpperCase() + s.player.slice(1)}: ${(s.arcShare * 100).toFixed(1)}%`}</title>          </circle>
        ))}
        <text x="100" y="97" textAnchor="middle" className={styles.centerValue}>{totalGames}</text>
        <text x="100" y="116" textAnchor="middle" className={styles.centerLabel}>Spiele</text>
      </svg>

      <div className={styles.legend}>
        <div className={styles.legendTitle}>Sieg-Anteil</div>
        {segments.map(s => {
          const delta = s.rawShare - BASELINE;
          return (
            <div key={s.player} className={styles.legendRow}>
              <span className={styles.dot} style={{ background: s.color }} />
              <span className={styles.legendName}>{s.player}</span>
              <span className={styles.legendShare}>{(s.rawShare * 100).toFixed(1)}%</span>
              <span
                className={styles.legendDelta}
                style={{ color: delta >= 0 ? "var(--color-success)" : "var(--color-error)" }}
              >
                {delta >= 0 ? "+" : ""}{(delta * 100).toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

PodShareDonut.propTypes = {
  playerStats: PropTypes.arrayOf(PropTypes.shape({
    player: PropTypes.string.isRequired,
    totalWins: PropTypes.number.isRequired,
    totalGames: PropTypes.number.isRequired,
    color: PropTypes.string.isRequired,
  })).isRequired,
};