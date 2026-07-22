# Plan: Data-Safety Fixes, Realtime, Quirks, Tooling, Visuals & New Visualizations

Status: **DRAFT — awaiting approval. No code changes yet.**

Decisions locked in with user:
- Refresh persistence → **hash routing** (`#/tracker/pascal`, `#/global`)
- Import merge → keep **replace** semantics, toast reports "X new, Y updated" (no silent overwrite)
- Easter egg → **keep global document listener, but ignore clicks on interactive elements** (buttons, inputs, links, textareas)
- Bayesian prior → **5 imaginary games at 25%** (pod baseline)
- Charts (donut, scatter) → hand-rolled SVG, **no new chart dependency**
- DecksTab does **not** get a win-rate % display
- Not in scope (user deferred): match history, streaks, head-to-head, Scryfall, JSON export, deck rename, deck sort/filter, +/- undo, confetti

---

## Phase 0 — Tooling (ESLint + Vitest)

**Why first:** catches the unused imports / dead code mechanically and gives a safety net for the refactor.

1. `npm install` (node_modules currently missing).
2. Add devDependencies: `eslint`, `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `globals`, `vitest`.
3. Create `eslint.config.js` (flat config): react + react-hooks recommended, JSX runtime, browser globals; ignore `dist/`.
4. `package.json` scripts: `"lint": "eslint ."`, `"lint:fix": "eslint . --fix"`, `"test": "vitest run"`, `"test:watch": "vitest"`.
5. Add `src/utils/stats.test.js` covering: `winRate`, new `adjustedWinRate` (incl. prior math), `getWinRateTier` boundaries (24.9/25/50/exactly-50), `getDynamicStats` best-deck selection under small samples.
6. Baseline: `npm run lint` and `npm test` must pass before later phases are considered done.

---

## Phase 1 — Critical data-layer bugs (`useDecks`, `supabaseClient`)

### 1.1 Bug #1: failed load wipes data
- `src/hooks/useDecks.js`: only set `loaded = true` on **successful** fetch. On error: `loaded` stays false → save effect never fires → error toast + manual retry button ("Erneut versuchen") that re-runs the fetch.
- Add a `dirtyRef` that is set only by local mutations (`updateDeck`, `addDecks`, `deleteDeck`, undo). The save effect returns early unless `dirtyRef.current === true`, and clears it after a successful save.

### 1.2 Bug #2: redundant full upsert after every load
- Solved by the same `dirtyRef`: loading data from Supabase is not a local mutation, so no save is triggered on page load anymore.

### 1.3 Bug #4: stale-state resurrection across devices
- Make local state authoritative: `saveDecks(player, decks)` in `src/supabaseClient.js` becomes a **full sync** — bulk upsert of current decks **plus** delete of rows for that player whose `name` is not in the list (fetch names, delete missing; still 2 API calls max, no N+1).
- Combined with 1.1/1.2 this is safe: saves only happen after real local edits.
- `deleteDeck` in the client and the per-deck `deleteDeckFromDB` call become redundant — local removal + debounced full sync handles deletion. Simplifies the undo feature (Phase 4): undo = reinsert into local state, sync re-creates the row.

### 1.4 Realtime subscription
- `useDecks`: subscribe to `postgres_changes` on `decks` filtered `player=eq.<player>`. On any event: if a local save is in flight or completed < 1s ago → ignore (echo). Otherwise refetch and `setDecks` (dirty flag prevents save loop).
- `GlobalStatsView`: subscribe unfiltered to `decks` changes, debounce-refetch all players (~500ms).
- **User action required (SQL in Supabase dashboard):**
  ```sql
  alter publication supabase_realtime add table public.decks;
  ```
  Will be added to `SUPABASE_SETUP.md`. App degrades gracefully (no realtime, works as before) if not run.

### 1.5 Supabase fallback
- `supabaseClient.js`: if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing, `console.error` a clear message at startup and surface it in the UI error state instead of silently pointing at the placeholder `'https://her-project.supabase.co'` (typo included).

---

## Phase 2 — Stats utils rework (`src/utils/stats.js`)

1. Remove dead `getStorageKey()`.
2. Add `export const MOBILE_BREAKPOINT = 640;` — used by `useIsMobile`, `App.jsx`, `RollingD20`.
3. Add `adjustedWinRate(deck, priorGames = 5, priorWR = 0.25)` → `(wins + priorGames*priorWR) / (total + priorGames)`.
4. `getWinRateTier(wr)`: accept **0–1 only**; delete the `wr > 1` dual-scale heuristic. Fix all callers (`GlobalStatsView` currently passes 0–100 via `parseFloat` — divide by 100 there).
5. `getDynamicStats`: rank "Bestes Deck" / "Ausbaufähig" by `adjustedWinRate`; keep the ≥2-games floor; display raw % + game count as today. Sorting in `DashboardTab` also uses adjusted WR.
6. `GlobalStatsView` Top-5 deck ranking also switches to adjusted WR (player-aggregate comparisons stay raw — large samples).
7. Fix `winRate` type inconsistency in `GlobalStatsView`: always a number, format with `toFixed(1)` only at render time.

---

## Phase 3 — Hash routing (`App.jsx`)

- Routes: `#/` (landing), `#/tracker/<player>`, `#/global`.
- `App.jsx`: derive `view`/`currentPlayer` from `location.hash`; navigation writes the hash; `hashchange` listener syncs back (browser back/forward works).
- Invalid player in hash → redirect to `#/`.
- Remove now-unused `useRef` import in `App.jsx`.
- Remove the document-wide triple-click listener and click-to-dismiss plumbing from `App.jsx` (moved to LandingPage, Phase 5); die dismiss stays as a single click anywhere while the die is shown.

---

## Phase 4 — Toast system + delete-undo (`TrackerView`)

1. Small toast state machine in `TrackerView`: `{ id, type: 'success'|'error'|'undo', message, action? }`, one toast at a time; new toast replaces old and **clears the previous timeout** (fixes toast race). Timeout cleaned up on unmount.
2. Import success message becomes e.g. `✅ 3 Decks importiert (1 neu, 2 aktualisiert)` — `addDecks` returns `{ added, updated }` counts to make this possible.
3. Delete flow: `deleteDeck(idx)` removes the deck from local state immediately and shows toast `„<name>" gelöscht` with **Rückgängig** button for 5s. Undo → reinsert at original index. DB deletion happens via the debounced full sync (Phase 1.3); if undo happens after a sync already deleted the row, the next sync simply re-upserts it. `useDecks.deleteDeck` returns the removed deck + index to support reinsertion.
4. +/- counters stay undo-free (per user).

---

## Phase 5 — Quirk fixes (UI)

1. **Easter egg**: keep the document-wide triple-click listener in `App.jsx` (works on all views), but ignore events whose `target` is inside an interactive element (`button, a, input, textarea, select, [role="button"]`). No more false triggers when spam-clicking +1.
2. **Unplayed decks** (`WinLossBar.jsx`): when `wins + losses === 0`, render a neutral gray track with centered muted text "Noch keine Spiele" instead of the fake 50/50 green-red bar.
3. **Global phantom column**: `GlobalStatsView.module.css` `.statsGrid` → `repeat(3, 1fr)`.
4. **"Unter 50%" sub-label**: replace with pod-aware wording via `getWinRateTier` (e.g. "Über 25%-Baseline" / tier label + icon), consistent with the tier system.
5. **Render-time sort**: `GlobalStatsView` sorts a copy (`[...stats.playerStats].sort(...)`), or better: sort once inside the `useMemo`.
6. **Global loading spinner**: give it the accent color like the tracker one.

---

## Phase 6 — Visual fixes (all except DecksTab %)

1. `index.html`:
   - `lang="de"`.
   - Remove `maximum-scale=1.0, user-scalable=no` from viewport.
   - Remove the duplicated hardcoded CSS reset/background (`#f4f6fb`) — keep only what's needed pre-CSS; body bg comes from `theme.css` vars.
   - Anti-FOUC: tiny inline `<script>` before stylesheets that reads `localStorage.theme` and sets `data-theme` on `<html>` immediately, so first paint is already dark when appropriate.
   - `theme-color` meta with `media="(prefers-color-scheme: light/dark)"` variants instead of fixed `#6c3d82`.
2. **JS hover handlers → CSS**: introduce per-element CSS vars set inline (`style={{ '--accent': color }}`) and real `:hover` rules in the CSS modules. Affects: `LandingPage` player cards + global-stats button, `tracker/Btn.jsx`, `ImportPanel` focus borders. Removes all `onMouseEnter/Leave/TouchStart/End` style mutation.
3. **25% baseline tick**: absolutely-positioned marker line at 25% on `DashboardTab` deck bars and `GlobalStatsView` player win-rate bars (subtle, with `title="Zufalls-Baseline (25%)"`).
4. **Capitalization**: remove `charAt(0).toUpperCase()` hacks in `GlobalStatsView`; consistent `text-transform: capitalize` (or none) via CSS.
5. **Colorblind support**: tier icon (🏆/📈/📉 from `getWinRateTier`) shown next to win-rate % in `GlobalStatsView` player rows and Top-5 list — color is no longer the only signal.
6. Breakpoint constant from Phase 2 used everywhere (`useIsMobile`, `App.jsx` screenWidth calc).

---

## Phase 7 — Dead code removal

1. Delete `src/components/primitives/` entirely (Button, IconButton, Card, index.js + CSS) — unused; also resolves the duplicate-import bug #3 by removal.
2. Delete unused images: `src/0ccd18781462a1bb7aec350c96006fd3.jpg`, `...fd3.png`, `...fd3_2.jpg`, `src/14979228-wurfel-d20-icon-design-kostenlos-vektor.jpg`.
3. Rename used hash asset `src/6214ff04ba3c68672b23d6cf.png` → `src/assets/logo.png`; move `D20_icon.png` → `src/assets/`; update imports in `Logo.jsx` / `D20.jsx`.
4. Delete stray empty file `100MB` in repo root.
5. Remove unused CSS classes: `.title`, `.titleMobile`, `.subtitle`, `.subtitleMobile` (`LandingPage.module.css`); `.sectionTitle`, `.sectionSubtitle`, `.sectionTitleRow`, `.deckWinRate` (`TrackerView.module.css`); `.surface`, `.text-gradient` (`theme.css`).
6. Final `npm run lint` sweep for any remaining unused imports/vars.

---

## Phase 8 — New visualizations (`GlobalStatsView`, hand-rolled SVG)

1. **Pod-share donut**: each player's share of total wins as donut segments in player colors; center shows total games; a reference marker/label at 25% per player; legend lists `name — X% (±Δ vs. 25%)`. New component `src/components/PodShareDonut.jsx` (+ CSS module), props: `playerStats`. Pure SVG arcs, no dependency.
2. **Activity vs. performance scatter**: x = games played, y = win rate (0–100%), one dot per deck colored by player, dashed reference lines at 25% WR and at average games played; quadrant labels ("Verstecktes Juwel", "Viel gespielt, hohe WR", etc.); `<title>` tooltips with deck name + record. New component `src/components/DeckScatter.jsx` (+ CSS module).
3. Both placed as new sections in `GlobalStatsView` below "Spieler-Vergleich"; render only when data exists; mobile-responsive (fixed viewBox, `width: 100%`).

---

## Phase 9 — PWA manifest + icons

1. Generate `public/icons/icon-192.png` and `icon-512.png` (and `apple-touch-icon.png` 180px) from the existing logo PNG via `sips` (macOS built-in, no dependency).
2. `public/manifest.webmanifest`: name "MTG Win Stats", `display: standalone`, theme/background colors matching theme, icons, `start_url: "/"`.
3. `index.html`: `<link rel="manifest">`, `apple-touch-icon`, keep existing apple-mobile-web-app metas.
4. No service worker / offline caching in this round.

---

## Phase 10 — Docs & verification

1. `AGENTS.md` updates:
   - Tooling section: `npm run lint`, `npm test`, stack now includes ESLint flat config + Vitest.
   - Data layer: dirty-flag save semantics, full-sync `saveDecks`, realtime subscription, undo-toast pattern.
   - Routing: hash routes.
   - Stats: bayesian adjusted win rate (prior 5 games @ 25%), `getWinRateTier` is 0–1 only.
   - Structure: remove `primitives/`, add `assets/`, new chart components; fix stale `mtg win stats vercel/` header; correct the "all inline styles migrated" claim.
   - Testing checklist: add lint/test/build steps.
2. `SUPABASE_SETUP.md`: add realtime publication SQL (Phase 1.4).
3. Verification: `npm run lint` clean, `npm test` green, `npm run build` succeeds, quick manual smoke (`npm run dev`): refresh persistence, undo delete, realtime via two browser tabs, dark mode FOUC, mobile width.

---

## Explicit non-goals (deferred by user)

Match history/timestamps, streaks, head-to-head matrix, Scryfall art, JSON export, deck rename, deck sort/filter, undo for +/- counters, tier-up confetti, service worker/offline mode, import parser strictness improvements.

## Risks / notes

- Full-sync `saveDecks` (1.3) makes local state authoritative — safe only because saves are gated by the dirty flag and realtime keeps tabs fresh. Two tabs editing simultaneously: last writer wins (unchanged from today, now visible via realtime).
- Realtime requires the SQL in Phase 1.4; without it everything still works, just no live updates.
- Hash routing changes URLs (none existed before, so nothing breaks).
