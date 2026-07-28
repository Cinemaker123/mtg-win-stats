import { useState } from "react";
import PropTypes from "prop-types";
import { PLAYER_COLORS } from "../utils/stats.js";
import styles from "./DeckScatter.module.css";

const W = 320;
const H = 200;
const PAD = { l: 30, r: 10, t: 12, b: 24 };

// 4-player pod baseline win rate
const BASELINE_WR = 0.25;

// Minimum sample size for the positive top-right zone
const MIN_GAMES = 5;

// Cyan/teal keeps the zone distinct from the red, purple, orange and green player dots
const GOOD_ZONE_FILL = "#4cc9f0";
const GOOD_ZONE_OPACITY = 0.1;

/**
 * Activity vs. performance scatter: one dot per played deck,
 * x = games played, y = win rate. Dashed references at the 25%
 * pod baseline and the minimum-games threshold. Hand-rolled SVG.
 *
 * Desktop: hover tooltips. Mobile/keyboard: tap or focus a dot to
 * pin its details below the chart (hover tooltips don't exist on touch).
 * @param {Object} props
 * @param {Array} props.decks - Played decks ({ name, player, wins, losses, totalGames, winRate })
 */
export function DeckScatter({ decks }) {
  const [selectedKey, setSelectedKey] = useState(null);

  if (decks.length === 0) return null;

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  // Keep x=5 visible even if every deck currently has fewer games.
  const maxGames = Math.max(
    1,
    MIN_GAMES * 1.2,
    ...decks.map(d => d.totalGames)
  ) * 1.1;

  const x = g => PAD.l + (g / maxGames) * plotW;
  const y = wr => PAD.t + (1 - wr) * plotH;

  const keyOf = d => `${d.player}-${d.name}`;
  const selected = decks.find(d => keyOf(d) === selectedKey) || null;

  const toggleSelect = (d) => {
    const key = keyOf(d);
    setSelectedKey(prev => (prev === key ? null : key));
  };

  const goodZoneX = x(MIN_GAMES);

  return (
    <div className={styles.wrapper}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.scatter} role="img" aria-label="Deckperformance">
        {/* Positive zone: enough games and above the pod baseline */}
        <rect
          x={goodZoneX}
          y={PAD.t}
          width={W - PAD.r - goodZoneX}
          height={y(BASELINE_WR) - PAD.t}
          fill={GOOD_ZONE_FILL}
          opacity={GOOD_ZONE_OPACITY}
          pointerEvents="none"
        />

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
        <line
          x1={PAD.l}
          y1={y(BASELINE_WR)}
          x2={W - PAD.r}
          y2={y(BASELINE_WR)}
          className={styles.refLine}
        />
        <text x={W - PAD.r} y={y(BASELINE_WR) - 3} textAnchor="end" className={styles.refLabel}>
          25% Baseline
        </text>

        {/* Reference: minimum games played */}
        <line
          x1={x(MIN_GAMES)}
          y1={PAD.t}
          x2={x(MIN_GAMES)}
          y2={y(0)}
          className={styles.refLine}
        />
        <text
          x={x(MIN_GAMES)}
          y={H - PAD.b + 11}
          textAnchor="middle"
          className={styles.refLabel}
        >
          Min. {MIN_GAMES}
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
        {decks.map(d => {
          const key = keyOf(d);
          const isSelected = key === selectedKey;
          const label = `${d.name} (${d.player}) — ${(d.winRate * 100).toFixed(1)}% · ${d.wins}W ${d.losses}L`;

          return (
            <g key={key}>
              <circle
                cx={x(d.totalGames)}
                cy={y(d.winRate)}
                r={isSelected ? 6.5 : 5}
                fill={PLAYER_COLORS[d.player]}
                className={isSelected ? styles.dotSelected : styles.dot}
              />

              {/* Enlarged invisible hit area for touch and keyboard */}
              <circle
                cx={x(d.totalGames)}
                cy={y(d.winRate)}
                r={14}
                fill="transparent"
                className={styles.hitArea}
                role="button"
                tabIndex={0}
                aria-label={label}
                onClick={() => toggleSelect(d)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSelect(d);
                  }
                }}
              >
                <title>{label}</title>
              </circle>
            </g>
          );
        })}
      </svg>

      {/* Pinned details (mobile tap / keyboard) or usage hint */}
      {selected ? (
        <div className={styles.detail}>
          <span className={styles.detailDot} style={{ background: PLAYER_COLORS[selected.player] }} />
          <span className={styles.detailName}>{selected.name}</span>
          <span className={styles.detailMeta}>
            {selected.player} · {(selected.winRate * 100).toFixed(1)}% · {selected.wins}W {selected.losses}L
          </span>
        </div>
      ) : (
        <div className={styles.hint}>Punkt antippen für Details</div>
      )}
    </div>
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