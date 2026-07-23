import PropTypes from "prop-types";
import { PLAYER_COLORS } from "../utils/stats.js";
import styles from "./DeckScatter.module.css";

const W = 320;
const H = 200;
const PAD = { l: 30, r: 10, t: 12, b: 24 };
// 4-player pod baseline win rate
const BASELINE_WR = 0.25;

/**
 * Activity vs. performance scatter: one dot per played deck,
 * x = games played, y = win rate. Dashed references at the 25%
 * pod baseline and the average games played. Hand-rolled SVG.
 * @param {Object} props
 * @param {Array} props.decks - Played decks ({ name, player, wins, losses, totalGames, winRate })
 */
export function DeckScatter({ decks }) {
  if (decks.length === 0) return null;

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const maxGames = Math.max(1, ...decks.map(d => d.totalGames)) * 1.1;
  const avgGames = decks.reduce((s, d) => s + d.totalGames, 0) / decks.length;

  const x = g => PAD.l + (g / maxGames) * plotW;
  const y = wr => PAD.t + (1 - wr) * plotH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.scatter} role="img" aria-label="Aktivität vs. Winrate">
      {/* Axes */}
      <line x1={PAD.l} y1={y(0)} x2={W - PAD.r} y2={y(0)} className={styles.axis} />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={y(0)} className={styles.axis} />

      {/* Y ticks (win rate %) */}
      {[0, 25, 50, 75, 100].map(v => (
        <text key={v} x={PAD.l - 4} y={y(v / 100) + 2.5} textAnchor="end" className={styles.axisText}>
          {v}
        </text>
      ))}

      {/* Reference: 25% pod baseline */}
      <line x1={PAD.l} y1={y(BASELINE_WR)} x2={W - PAD.r} y2={y(BASELINE_WR)} className={styles.refLine} />
      <text x={W - PAD.r} y={y(BASELINE_WR) - 3} textAnchor="end" className={styles.refLabel}>
        25% Baseline
      </text>

      {/* Reference: average games played */}
      <line x1={x(avgGames)} y1={PAD.t} x2={x(avgGames)} y2={y(0)} className={styles.refLine} />
      <text x={x(avgGames)} y={H - PAD.b + 11} textAnchor="middle" className={styles.refLabel}>
        Ø {Math.round(avgGames)}
      </text>

      {/* Quadrant labels */}
      <text x={PAD.l + 5} y={PAD.t + 9} className={styles.quadrantLabel}>💎 Geheimtipp</text>
      <text x={W - PAD.r - 5} y={PAD.t + 9} textAnchor="end" className={styles.quadrantLabel}>🏆 Top-Decks</text>
      <text x={PAD.l + 5} y={y(0) - 5} className={styles.quadrantLabel}>Unbewährt</text>
      <text x={W - PAD.r - 5} y={y(0) - 5} textAnchor="end" className={styles.quadrantLabel}>Sorgenkind</text>

      {/* X axis label */}
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 6} textAnchor="middle" className={styles.axisLabel}>
        Gespielte Spiele →
      </text>

      {/* Deck dots */}
      {decks.map(d => (
        <circle
          key={`${d.player}-${d.name}`}
          cx={x(d.totalGames)}
          cy={y(d.winRate)}
          r={5}
          fill={PLAYER_COLORS[d.player]}
          className={styles.dot}
        >
          <title>{`${d.name} (${d.player}) — ${(d.winRate * 100).toFixed(1)}% · ${d.wins}W ${d.losses}L`}</title>
        </circle>
      ))}
    </svg>
  );
}

DeckScatter.propTypes = {
  decks: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    player: PropTypes.string.isRequired,
    wins: PropTypes.number.isRequired,
    losses: PropTypes.number.isRequired,
    totalGames: PropTypes.number.isRequired,
    winRate: PropTypes.number.isRequired,
  })).isRequired,
};
