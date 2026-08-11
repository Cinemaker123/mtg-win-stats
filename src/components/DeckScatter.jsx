import { useRef, useState } from "react";
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

// Pinch-zoom limits (1 = full chart, aspect ratio stays locked)
const MAX_ZOOM = 6;
const BASE_VIEW = { x: 0, y: 0, w: W, h: H };

// Keep the visible window inside the chart bounds
const clampView = (v) => {
  const w = Math.min(W, Math.max(W / MAX_ZOOM, v.w));
  const h = (w / W) * H;

  return {
    x: Math.min(W - w, Math.max(0, v.x)),
    y: Math.min(H - h, Math.max(0, v.y)),
    w,
    h,
  };
};

const coordinateKey = d => `${d.totalGames}:${d.winRate.toFixed(6)}`;

const clusterOffsets = count => {
  if (count === 1) return [[0, 0]];

  // Sized for your current maximum cluster of 9 dots
  const radius =
    count <= 2 ? 5 :
    count <= 4 ? 6.5 :
    count <= 6 ? 8 :
    11.5;

  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
    return [
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
    ];
  });
};

/**
 * Activity vs. performance scatter: one dot per played deck,
 * x = games played, y = win rate. Dashed references at the 25%
 * pod baseline and the minimum-games threshold. Hand-rolled SVG.
 *
 * Desktop: hover tooltips. Mobile/keyboard: tap or focus a dot to
 * pin its details below the chart (hover tooltips don't exist on touch).
 * Touch: two-finger pinch zooms, one finger pans while zoomed in.
 * Double-click/double-tap zooms 2x towards the clicked point.
 * @param {Object} props
 * @param {Array} props.decks - Played decks ({ name, player, wins, losses, totalGames, winRate })
 */
export function DeckScatter({ decks }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [view, setView] = useState(BASE_VIEW);
  const svgRef = useRef(null);
  const gestureRef = useRef(null);
  const movedRef = useRef(false);
  const suppressTapRef = useRef(false);

  const zoomed = view.w < W * 0.999;
  const zoom = W / view.w;

  // Double-click/double-tap: zoom 2x towards the clicked point
  const handleDoubleClick = (e) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const w = Math.max(W / MAX_ZOOM, view.w / 2);
    const h = view.h * (w / view.w);
    const focusX = view.x + px * view.w;
    const focusY = view.y + py * view.h;

    setView(clampView({
      x: focusX - px * w,
      y: focusY - py * h,
      w,
      h,
    }));
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      gestureRef.current = {
        mode: "pinch",
        startDist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        startView: view,
      };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      gestureRef.current = {
        mode: "pan",
        startX: t.clientX,
        startY: t.clientY,
        startView: view,
      };
    }
  };

  const handleTouchMove = (e) => {
    const g = gestureRef.current;
    if (!g || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();

    if (g.mode === "pinch" && e.touches.length === 2) {
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const midX = (a.clientX + b.clientX) / 2 - rect.left;
      const midY = (a.clientY + b.clientY) / 2 - rect.top;

      // Zoom around the pinch midpoint
      const w = Math.min(W, Math.max(W / MAX_ZOOM, g.startView.w * (g.startDist / dist)));
      const factor = w / g.startView.w;
      const h = g.startView.h * factor;
      const focusX = g.startView.x + (midX / rect.width) * g.startView.w;
      const focusY = g.startView.y + (midY / rect.height) * g.startView.h;

      setView(clampView({
        x: focusX - (midX / rect.width) * w,
        y: focusY - (midY / rect.height) * h,
        w,
        h,
      }));

      if (Math.abs(dist - g.startDist) > 3) movedRef.current = true;
    } else if (g.mode === "pan" && e.touches.length === 1 && zoomed) {
      const t = e.touches[0];
      const dx = ((t.clientX - g.startX) / rect.width) * g.startView.w;
      const dy = ((t.clientY - g.startY) / rect.height) * g.startView.h;

      setView(clampView({ ...g.startView, x: g.startView.x - dx, y: g.startView.y - dy }));

      if (Math.abs(t.clientX - g.startX) + Math.abs(t.clientY - g.startY) > 3) {
        movedRef.current = true;
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 1 && gestureRef.current?.mode === "pinch") {
      // Second finger lifted: continue as a pan with the remaining one
      const t = e.touches[0];
      gestureRef.current = {
        mode: "pan",
        startX: t.clientX,
        startY: t.clientY,
        startView: view,
      };
      return;
    }

    if (e.touches.length === 0) {
      gestureRef.current = null;

      // Snap back when zoomed all the way out
      if (!zoomed) setView(BASE_VIEW);

      // Swallow the synthetic tap that follows a pan/pinch gesture
      if (movedRef.current) {
        suppressTapRef.current = true;
        setTimeout(() => { suppressTapRef.current = false; }, 350);
      }
      movedRef.current = false;
    }
  };

  if (decks.length === 0) return null;

  const playedDecks = decks.filter(d =>
    d.totalGames > 0 && Number.isFinite(d.winRate)
  );

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  // Keep x=5 visible even if every deck currently has fewer games.
  const maxGames = Math.max(
    1,
    MIN_GAMES * 1.2,
    ...playedDecks.map(d => d.totalGames)
  ) * 1.1;

  const x = g => PAD.l + (g / maxGames) * plotW;
  const y = wr => PAD.t + (1 - wr) * plotH;

  const keyOf = d => `${d.player}-${d.name}`;

  // Group decks occupying the exact same coordinate
  const coordinateGroups = new Map();

  playedDecks.forEach(d => {
    const key = coordinateKey(d);

    if (!coordinateGroups.has(key)) {
      coordinateGroups.set(key, []);
    }

    coordinateGroups.get(key).push(d);
  });

  // Assign every deck a stable position within its coordinate cluster
  const dotLayout = new Map();

  coordinateGroups.forEach(group => {
    const sortedGroup = [...group].sort((a, b) =>
      keyOf(a).localeCompare(keyOf(b))
    );

    const offsets = clusterOffsets(sortedGroup.length);

    sortedGroup.forEach((d, i) => {
      dotLayout.set(keyOf(d), {
        dx: offsets[i][0],
        dy: offsets[i][1],
        clusterSize: sortedGroup.length,
      });
    });
  });

  const selected = playedDecks.find(d => keyOf(d) === selectedKey) || null;

  const toggleSelect = (d) => {
    if (suppressTapRef.current) return;
    const key = keyOf(d);
    setSelectedKey(prev => (prev === key ? null : key));
  };

  const goodZoneX = x(MIN_GAMES);

  return (
    <div className={styles.wrapper}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className={styles.scatter}
        style={{ touchAction: zoomed ? "none" : "pan-y" }}
        role="img"
        aria-label="Deckperformance"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
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
          Min. {MIN_GAMES} Spiele →
        </text>

        {/* Quadrant labels */}
        <text x={PAD.l + 5} y={PAD.t + 9} className={styles.quadrantLabel}>❓</text>
        <text x={W - PAD.r - 5} y={PAD.t + 9} textAnchor="end" className={styles.quadrantLabel}>🏆</text>
        {/*<text x={PAD.l + 5} y={y(0) - 5} className={styles.quadrantLabel}>Unbewährt</text>*/}
        <text x={W - PAD.r - 5} y={y(0) - 5} textAnchor="end" className={styles.quadrantLabel}>🗑️</text>

        {/* X axis label */}
        {/*<text x={(PAD.l + W - PAD.r) / 2} y={H - 6} textAnchor="middle" className={styles.axisLabel}>
          
        </text>*/}

        {/* Deck dots */}
        {playedDecks.map(d => {
          const key = keyOf(d);
          const isSelected = key === selectedKey;

          const layout = dotLayout.get(key) || {
            dx: 0,
            dy: 0,
            clusterSize: 1,
          };

          const isClustered = layout.clusterSize > 1;
          const cx = x(d.totalGames) + layout.dx;
          const cy = y(d.winRate) + layout.dy;

          let dotRadius = isClustered ? 3.8 : 5;
          if (isSelected) {
            dotRadius = isClustered ? 5.5 : 6.5;
          }

          const label = `${d.name} (${d.player}) — ${(d.winRate * 100).toFixed(1)}% · ${d.wins}W ${d.losses}L`;

          return (
            <g key={key}>
              <circle
                cx={cx}
                cy={cy}
                r={dotRadius}
                fill={PLAYER_COLORS[d.player]}
                className={isSelected ? styles.dotSelected : styles.dot}
              />

              {/* Enlarged invisible hit area for touch and keyboard;
                  shrinks with zoom so it stays ~constant on screen */}
              <circle
                cx={cx}
                cy={cy}
                r={(isClustered ? 9 : 14) / zoom}
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

      {/* Pinned details (mobile tap / keyboard) */}
      {selected && (
        <div className={styles.detail}>
          <span className={styles.detailDot} style={{ background: PLAYER_COLORS[selected.player] }} />
          <span className={styles.detailName}>{selected.name}</span>
          <span className={styles.detailMeta}>
            {selected.player} · {(selected.winRate * 100).toFixed(1)}% · {selected.wins}W {selected.losses}L
          </span>
        </div>
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