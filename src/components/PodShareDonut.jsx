import PropTypes from "prop-types";
import styles from "./PodShareDonut.module.css";

// Expected win share per player in a 4-player pod
const BASELINE = 0.25;

/**
 * Donut chart of each player's share of total wins, with per-player
 * delta against the 25% pod baseline. Hand-rolled SVG, no dependencies.
 * @param {Object} props
 * @param {Array} props.playerStats - Per-player stats ({ player, totalWins, totalGames, color })
 */
export function PodShareDonut({ playerStats }) {
  const totalWins = playerStats.reduce((s, p) => s + p.totalWins, 0);
  const totalGames = playerStats.reduce((s, p) => s + p.totalGames, 0);
  if (totalWins === 0) return null;

  const R = 80;
  const C = 2 * Math.PI * R;
  const shares = playerStats.map(p => p.totalWins / totalWins);
  const segments = playerStats.map((p, i) => ({
    player: p.player,
    color: p.color,
    share: shares[i],
    offset: shares.slice(0, i).reduce((s, v) => s + v, 0),
  }));

  return (
    <div className={styles.wrapper}>
      <svg viewBox="0 0 200 200" className={styles.donut} role="img" aria-label="Sieg-Anteile pro Spieler">
        {segments.map(s => (
          <circle
            key={s.player}
            cx="100" cy="100" r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="30"
            strokeDasharray={`${s.share * C} ${C - s.share * C}`}
            strokeDashoffset={-s.offset * C}
            transform="rotate(-90 100 100)"
          >
            <title>{`${s.player}: ${(s.share * 100).toFixed(1)}% der Siege`}</title>
          </circle>
        ))}
        <text x="100" y="97" textAnchor="middle" className={styles.centerValue}>{totalGames}</text>
        <text x="100" y="116" textAnchor="middle" className={styles.centerLabel}>Spiele</text>
      </svg>

      <div className={styles.legend}>
        <div className={styles.legendTitle}>Sieg-Anteil</div>
        {segments.map(s => {
          const delta = s.share - BASELINE;
          return (
            <div key={s.player} className={styles.legendRow}>
              <span className={styles.dot} style={{ background: s.color }} />
              <span className={styles.legendName}>{s.player}</span>
              <span className={styles.legendShare}>{(s.share * 100).toFixed(1)}%</span>
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
