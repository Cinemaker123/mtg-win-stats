import { useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PLAYER_COLORS, POD_BASELINE_WR, PROVEN_DECK_GAMES, WIN_RATE_TIERS } from "../utils/stats.js";
import styles from "./DeckScatter.module.css";

const W = 320;
const H = 200;
const PAD = { l: 30, r: 10, t: 12, b: 24 };

// Gold wash echoes the "Legendär" tier color, distinct from the emerald/red/violet/yellow player dots
const GOOD_ZONE_FILL = WIN_RATE_TIERS.LEGENDARY.color;
const GOOD_ZONE_OPACITY = 0.1;

// Pinch-zoom limits (1 = full chart, aspect ratio stays locked)
const MAX_ZOOM = 6;
const BASE_VIEW = { x: 0, y: 0, w: W, h: H };

// Fixed zoom level for double-click/double-tap (a toggle, not a repeatable zoom-in)
const DOUBLE_TAP_ZOOM = 2;

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

const keyOf = d => `${d.player}-${d.name}`;

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
 * Taps are resolved to the nearest dot anywhere in the plot (not a
 * precise hit on the dot itself), so tightly-packed small decks stay
 * easy to select. Keyboard users still tab dot-by-dot.
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

  // Double-click/double-tap: toggle between fit and a fixed zoom level
  // centered on the tap — not a repeatable zoom-in (that felt like it
  // kept zooming further with every double-tap). Zoomed in already ->
  // zoom back out to fit, regardless of where this tap landed.
  const handleDoubleClick = (e) => {
    if (!svgRef.current) return;

    if (zoomed) {
      setView(BASE_VIEW);
      return;
    }

    const rect = svgRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const w = W / DOUBLE_TAP_ZOOM;
    const h = H / DOUBLE_TAP_ZOOM;
    const focusX = px * W;
    const focusY = py * H;

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

  // The whole chart layout depends only on `decks` — not on pan/zoom or
  // selection. Panning calls setView on every touchmove (~60x/sec), so
  // without this memo a single gesture rebuilt both Maps, re-ran the
  // per-cluster sorts and re-allocated every dot on each frame.
  const layout = useMemo(() => {
    const playedDecks = decks.filter(d =>
      d.totalGames > 0 && Number.isFinite(d.winRate)
    );

    const plotW = W - PAD.l - PAD.r;
    const plotH = H - PAD.t - PAD.b;

    // Keep the "proven deck" gridline visible even if every deck
    // currently has fewer games.
    const maxGames = Math.max(
      1,
      PROVEN_DECK_GAMES * 1.2,
      ...playedDecks.map(d => d.totalGames)
    ) * 1.1;

    const x = g => PAD.l + (g / maxGames) * plotW;
    const y = wr => PAD.t + (1 - wr) * plotH;

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

    // Plotted position of every dot (cluster offsets applied), reused for
    // nearest-point hit testing and for rendering.
    const plotted = playedDecks.map(d => {
      const dot = dotLayout.get(keyOf(d));
      return {
        deck: d,
        dot,
        cx: x(d.totalGames) + dot.dx,
        cy: y(d.winRate) + dot.dy,
      };
    });

    return { playedDecks, x, y, plotted };
  }, [decks]);

  if (decks.length === 0) return null;

  const { playedDecks, x, y, plotted } = layout;

  const selected = playedDecks.find(d => keyOf(d) === selectedKey) || null;

  const toggleSelect = (d) => {
    if (suppressTapRef.current) return;
    const key = keyOf(d);
    setSelectedKey(prev => (prev === key ? null : key));
  };

  // Tap/click anywhere in the plot: select the nearest dot rather than
  // requiring a precise hit on its own small circle. Individual hit
  // circles overlap when dots sit close but not at the exact same
  // coordinate, so "nearest wins" beats fighting over tiny targets —
  // especially for small, tightly-packed clusters on touch.
  const handlePlotTap = (e) => {
    if (suppressTapRef.current || !svgRef.current || plotted.length === 0) return;

    const rect = svgRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const tapX = view.x + px * view.w;
    const tapY = view.y + py * view.h;

    let nearest = plotted[0];
    let bestDist = Infinity;
    for (const p of plotted) {
      const dist = Math.hypot(p.cx - tapX, p.cy - tapY);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = p;
      }
    }

    // Generous, zoom-compensated reach so it still feels precise —
    // this isn't "tap anywhere," just "tap near enough."
    const maxDist = 22 / zoom;
    if (bestDist <= maxDist) {
      toggleSelect(nearest.deck);
    } else {
      setSelectedKey(null);
    }
  };

  const goodZoneX = x(PROVEN_DECK_GAMES);

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
        onClick={handlePlotTap}
      >
        {/* Positive zone: enough games and above the pod baseline */}
        <rect
          x={goodZoneX}
          y={PAD.t}
          width={W - PAD.r - goodZoneX}
          height={y(POD_BASELINE_WR) - PAD.t}
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
          y1={y(POD_BASELINE_WR)}
          x2={W - PAD.r}
          y2={y(POD_BASELINE_WR)}
          className={styles.refLine}
        />
        
        {/* Reference: minimum games played */}
        <line
          x1={x(PROVEN_DECK_GAMES)}
          y1={PAD.t}
          x2={x(PROVEN_DECK_GAMES)}
          y2={y(0)}
          className={styles.refLine}
        />
        <text
          x={x(PROVEN_DECK_GAMES)}
          y={H - PAD.b + 11}
          textAnchor="middle"
          className={styles.refLabel}
        >
          Min. {PROVEN_DECK_GAMES} Spiele →
        </text>

        {/* Quadrant labels */}
        <text x={W - PAD.r - 5} y={PAD.t + 9} textAnchor="end" className={styles.quadrantLabel}>🏆</text>
        <text x={W - PAD.r - 5} y={y(0) - 5} textAnchor="end" className={styles.quadrantLabel}>🗑️</text>

        {/* Deck dots */}
        {plotted.map(({ deck: d, dot, cx, cy }) => {
          const key = keyOf(d);
          const isSelected = key === selectedKey;

          const isClustered = dot.clusterSize > 1;

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

              {/* Keyboard-only focus target (pointer taps are resolved by
                  handlePlotTap's nearest-point search on the whole plot,
                  not per-dot — overlapping small hit areas made close-
                  together dots hard to tap precisely) */}
              <circle
                cx={cx}
                cy={cy}
                r={(isClustered ? 9 : 14) / zoom}
                fill="transparent"
                className={styles.hitArea}
                role="button"
                tabIndex={0}
                aria-label={label}
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