import PropTypes from "prop-types";
import { PLAYER_COLORS, POD_BASELINE_WR } from "../utils/stats.js";
import styles from "./PlayerStrengthChart.module.css";

const W = 320;
const ROW_H = 34;
const PAD = { l: 54, r: 40, t: 18, b: 24 };

/**
 * Player strength ranking: one dot per player, positioned by
 * Bayesian-adjusted win rate (same prior as deck rankings), so small
 * sample sizes don't inflate the ranking. Replaces the win-share donut,
 * which mixed adjusted arc sizes with raw-share numbers in one chart.
 * @param {Object} props
 * @param {Array} props.playerStats - Per-player stats
 *   ({ player, adjusted, totalGames })
 */
export function PlayerStrengthChart({ playerStats }) {
  if (playerStats.length === 0) return null;

  const sorted = [...playerStats].sort((a, b) => b.adjusted - a.adjusted);
  const H = PAD.t + sorted.length * ROW_H + PAD.b;
  const plotW = W - PAD.l - PAD.r;

  // Keep some headroom above the top dot so its value label never
  // crowds the right edge; 50% (the "Legendär" tier) as a floor so the
  // axis doesn't jump around for ordinary data.
  const maxVal = Math.max(0.5, ...sorted.map(d => d.adjusted)) * 1.2;

  const x = (v) => PAD.l + (v / maxVal) * plotW;
  const rowY = (i) => PAD.t + i * ROW_H + ROW_H / 2;

  const ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5].filter(v => v <= maxVal);

  return (
    <div className={styles.wrapper}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.chart}
        role="img"
        aria-label="Spielerstärke, adjustierte Winrate je Spieler"
      >
        {ticks.map(v => (
          <text key={v} x={x(v)} y={PAD.t - 6} textAnchor="middle" className={styles.axisText}>
            {Math.round(v * 100)}
          </text>
        ))}

        {/* Reference: 25% pod baseline */}
        <line
          x1={x(POD_BASELINE_WR)}
          y1={PAD.t - 8}
          x2={x(POD_BASELINE_WR)}
          y2={H - PAD.b}
          className={styles.refLine}
        />
        <text x={x(POD_BASELINE_WR)} y={H - PAD.b + 13} textAnchor="middle" className={styles.refLabel}>
          25%-Baseline
        </text>

        {sorted.map((p, i) => {
          const y = rowY(i);
          const cx = x(p.adjusted);
          const color = PLAYER_COLORS[p.player];
          const label = `${p.player}: ${(p.adjusted * 100).toFixed(1)}% adjustiert (${p.totalGames} Spiele)`;
          return (
            <g key={p.player}>
              <text x={0} y={y + 4} className={styles.rowLabel} fill={color}>
                {p.player}
              </text>
              <circle cx={cx} cy={y} r={6} fill={color} className={styles.dot}>
                <title>{label}</title>
              </circle>
              <text x={W} y={y + 4} textAnchor="end" className={styles.valueLabel} fill={color}>
                {(p.adjusted * 100).toFixed(1)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

PlayerStrengthChart.propTypes = {
  playerStats: PropTypes.arrayOf(PropTypes.shape({
    player: PropTypes.string.isRequired,
    adjusted: PropTypes.number.isRequired,
    totalGames: PropTypes.number.isRequired,
  })).isRequired,
};
