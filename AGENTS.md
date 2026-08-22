# MTG Win Stats Tracker

## Project Overview

A **React + Vite application** for tracking Magic: The Gathering deck performance statistics across multiple players. Features a mobile-friendly interface for recording wins/losses, importing deck data, and viewing cross-player analytics.

## Technology Stack

- **Framework**: React 18+ with Vite build system
- **Language**: JavaScript (JSX) with PropTypes
- **Styling**: CSS Modules with CSS custom properties
- **Storage**: Supabase (PostgreSQL backend) with Realtime subscriptions
- **Fonts**: Google Fonts (Baloo 2 display, Figtree body, Cinzel as
  `--font-display-alt` for stat-card big values / landing page player
  names / Spielerstärke names & percentages) loaded via `<link>` in
  `index.html`
- **Build Tool**: Vite with Hot Module Replacement
- **Tooling**: ESLint 9 (flat config: react + react-hooks) and Vitest

## File Structure

```
mtg-win-stats/
├── src/
│   ├── App.jsx                    # Hash router (#/, #/tracker/<player>, #/global, #/games)
│   ├── App.module.css             # App root styles
│   ├── assets/
│   │   ├── D20_icon.png           # D20 die image
│   │   └── logo.png               # MTG logo
│   ├── components/
│   │   ├── AddPlayer.jsx         # "Neuer Spieler": inline add-player field (new-game modal seats)
│   │   ├── D20.jsx               # D20 die display component
│   │   ├── DarkModeToggle.jsx    # Dark mode toggle button
│   │   ├── DeckScatter.jsx       # Activity vs. win rate scatter (SVG)
│   │   ├── Logo.jsx              # MTG logo (size prop optional; omit to size from CSS)
│   │   ├── NewGameModal.jsx      # Game entry modal (2x2 grid, winner tap, quick-add deck)
│   │   ├── PlayerAvatar.jsx      # Player initial on their gradient (all 6 avatar sites)
│   │   ├── PlayerStrengthChart.jsx  # Adjusted win-rate ranking per player (SVG)
│   │   ├── RollingD20.jsx        # D20 rolling animation (reads window.innerWidth itself)
│   │   ├── StatCard.jsx          # Reusable statistics card
│   │   ├── StatRow.jsx           # Ranked-list row, player/deck variant (Global Stats)
│   │   ├── Toast.jsx             # The only toast renderer ({type, message, action})
│   │   └── ViewHeader.jsx        # Back button + icon + title + DarkModeToggle
│   ├── hooks/
│   │   ├── useAllDecks.js        # All players' registries: context + hook (read side)
│   │   ├── AllDecksProvider.jsx  # All registries: fetch + realtime, mounted once in App.jsx
│   │   ├── useDarkMode.js        # Dark mode state management
│   │   ├── useDecks.js           # Deck registry: dirty-flag saves, full sync, realtime
│   │   ├── useGames.js           # Games archive context + hook (read side)
│   │   ├── GamesProvider.jsx     # Games archive: fetch + realtime, mounted once in App.jsx
│   │   └── useToast.js           # Shared toast state (show/dismiss/auto-timeout)
│   ├── utils/
│   │   ├── stats.js              # Constants, winRate, adjustedWinRate, tiers, combineDeckStats
│   │   └── stats.test.js         # Vitest unit tests
│   ├── views/
│   │   ├── GamesArchiveView.jsx  # Games archive grouped by day (edit/delete + undo)
│   │   ├── GlobalStatsView.jsx   # Cross-player statistics page
│   │   ├── LandingPage.jsx       # Player selection + "Neues Spiel" button
│   │   ├── TrackerView.jsx       # Main tracker (Dashboard/Decks) + toasts
│   │   └── tracker/              # Sub-components
│   │       ├── DashboardTab.jsx
│   │       ├── DecksTab.jsx      # Read-only deck bars (combined stats)
│   │       ├── ImportPanel.jsx   # Single-deck add
│   │       └── WinLossBar.jsx    # Read-only win/loss bar
│   ├── styles/
│   │   ├── theme.css             # CSS custom properties (light/dark) + reset
│   │   └── viewChrome.module.css # Shell/header/spinner shared by the 3 full views
│   ├── supabaseClient.js         # Supabase API client (decks + games + players CRUD)
│   └── main.jsx                  # Vite entry point
├── public/
│   ├── manifest.webmanifest      # PWA manifest
│   ├── apple-touch-icon.png
│   └── icons/                    # PWA launcher icons (192, 512)
├── db/
│   └── level1_rls.sql           # Level 1 RLS hardening SQL (run once in SQL editor; see auth.md)
├── eslint.config.js              # ESLint flat config
├── index.html
├── package.json
├── vite.config.js
├── .env.example                  # Supabase credentials template
└── AGENTS.md                     # This file
```

## Architecture

### State Management
- **Local React state** via `useState` hooks
- **Custom hooks**: `useDecks` for the editing player's registry,
  `useDarkMode` for theming
- **Two providers, mounted once in `App.jsx`**: `GamesProvider` (games
  archive) and `AllDecksProvider` (every player's registry). Each owns
  one fetch + one debounced realtime subscription, and every view reads
  them via `useGames()` / `useAllDecks()`. Anything needing a *third*
  copy of that machinery should extend a provider instead.
- **Persistence**: Supabase PostgreSQL database
- **Per-player data isolation**: Decks stored with player identifier

### Routing
Hash-based routing in `App.jsx` (survives page refresh, back/forward works):
- `#/` → `LandingPage`
- `#/tracker/<player>` → `TrackerView` (individual player)
- `#/global` → `GlobalStatsView` (cross-player stats)
- `#/games` → `GamesArchiveView` (games archive)
- Invalid hashes normalize to `#/`

### Data Layer (`useDecks` + `useGames` + `supabaseClient`)
- **Data Model v2**: results are recorded as *games* (`games` +
  `game_participants` tables), not as manual per-deck counters. The
  `decks` table is a pure deck registry; its `wins`/`losses` columns are
  the **frozen legacy baseline** (pre-v2 counts, no longer incremented).
- **Combined stats**: everywhere stats are shown,
  `combineDeckStats(registryDecks, games, player)` merges legacy baseline
  with game-derived counts. Decks that exist only in games still appear.
- **Dirty-flag saves**: Supabase writes only fire after local mutations,
  never on load. A failed fetch keeps `loaded = false`, so saves stay
  disabled and remote data can never be wiped by a failed load.
- **Full sync**: `saveDecks(player, decks)` upserts the given decks and
  deletes rows missing from the list — local state is authoritative.
  Used only for registry changes (add/delete deck).
- **Game CRUD**: `addGame` / `updateGame` / `deleteGame` write directly
  (no dirty flag). `addGame` and `updateGame` call the `save_game` /
  `update_game` Postgres functions (`supabase.rpc(...)`) so the game row
  and its participants are written in **one transaction** — a mid-write
  failure can no longer leave a game with zero participants or wipe the
  original line-up on edit. `update_game` replaces participants wholesale.
  The function definitions live in SUPABASE_SETUP.md and must be applied
  once in the SQL editor.
- **IDs alongside names**: `decks` and `game_participants` carry
  `player_id`/`deck_id` foreign keys (into `players`/`decks`) next to
  their original `player`/`deck` text columns — the text columns are
  never dropped. `getGames()` embeds `decks(name)` via `deck_id` and
  prefers that live name over the stored `deck` text; `deck_id` is
  `ON DELETE SET NULL`, so once a registry deck is deleted the join
  returns null and the stored text becomes a permanent historical
  snapshot instead of a dangling reference. `getPlayerIdMap()` caches
  the player slug→id lookup for the page lifetime and is used whenever
  a deck row is written (`saveDecks`, `addDeckToRegistry`) so `player_id`
  stays populated. For games, `save_game` / `update_game` resolve
  `player_id` server-side from the slug, so participant rows never depend
  on the client cache being fresh.
- **Realtime**: `useDecks` subscribes to `postgres_changes` filtered by
  player and refetches on remote writes (echoes of own saves suppressed
  for 1s). `GamesProvider` subscribes to `games` + `game_participants`
  + `decks`, and `AllDecksProvider` to `decks`, both with a 500ms
  debounced refetch and both mounted once in `App.jsx`, so every view
  reads the same cache instead of fetching and subscribing
  independently. `GamesProvider` includes `decks` because a deck rename
  only touches the `decks` table now (see above); without it, the cached
  `games` join would keep showing the pre-rename name until reload.
  Requires the tables in the `supabase_realtime` publication (see
  SUPABASE_SETUP.md).
- **Bulk deck fetch**: `getDecksByPlayer()` fetches every player's decks
  in one unfiltered query and groups them, guaranteeing an entry per
  player in `PLAYERS`. It is called **only** by `AllDecksProvider`;
  `GlobalStatsView` and `NewGameModal` read the shared cache, so opening
  the game modal costs no query. `useDecks` still calls the per-player
  `getDecks(player)` — that one's correctly scoped.
- **Added players**: `addPlayer(name)` (from the `AddPlayer` component in
  the new-game modal's empty seats) upserts one row into the `players`
  table — slug from `playerSlug`, the table's unique constraint being the
  real dedupe guard — then busts the `getPlayerIdMap` cache so the new
  slug resolves immediately. An added player is recorded like anyone else
  (games, decks, archive), but every statistic keys off `PLAYERS` in
  `stats.js`, so they stay out of all rankings until added there
  deliberately. `getDecksByPlayer()` unions `PLAYERS` with the live slugs,
  which is what lets an added player own decks at all.
- **Deck ids in the cache**: entries in the `AllDecksProvider` cache
  carry their `id`, and `NewGameModal` resolves each participant's
  `deck_id` out of it by name. A deck added optimistically via
  `addDeckLocally` must therefore include the id returned by
  `addDeckToRegistry`, or a game saved right after a quick-add would be
  written with a null `deck_id`.
- **Error handling**: every query in `supabaseClient.js` goes through
  `unwrap(result, context)`, which logs with that context and rethrows.
  Add new queries the same way rather than re-inlining the
  `if (error) { console.error; throw }` block.
- **Undo on delete**: deck deletion is local + toast with 5s "Rückgängig";
  undo reinserts locally and the debounced sync restores the DB row.
  Game deletion offers the same 5s undo; undo re-inserts the game with a
  new id.

### Win Rate Ranking
- Raw win rate (`winRate`) for display, always as 0-1 number
- `adjustedWinRate` for **ranking** decks: Bayesian prior of 10 imaginary
  games at the 25% pod baseline, so small samples regress to the mean
  (a lucky 2-0 no longer outranks a proven 18-2)
- `getWinRateTier` accepts **0-1 only** (no percentage heuristic)
- `MIN_GAMES_FOR_BEST_DECK` (2 games): shared threshold before a deck can
  be crowned "best"/"worst" — used by both the per-player dashboard
  (`getDynamicStats`) and Global Stats' `bestDeck`, so they always agree

### Data Model
```javascript
// Deck object structure (registry; wins/losses = frozen legacy baseline)
{
  id: string,        // uuid — what game_participants.deck_id points at
  player: string,    // "baum" | "mary" | "pascal" | "wewy"
  name: string,      // Deck name (e.g., "Azorius Control")
  wins: number,      // Legacy wins (frozen, pre-v2)
  losses: number     // Legacy losses (frozen, pre-v2)
}

// Game object structure (v2)
{
  id: string,        // uuid
  playedAt: string,  // ISO timestamp
  participants: [
    {
      player: string,     // player identifier
      deck: string,       // deck name — live via deck_id join when the
                           // deck still exists, else the frozen text
                           // snapshot from when the game was recorded
      isWinner: boolean   // exactly one winner per game
    }
  ]                  // 2-4 participants
}
```

### 4-Player Pod Win Rate Context
Since this is a 4-player Commander pod:
- **>50%** = Legendary 🏆 (2x+ the 25% random average)
- **25-50%** = Good 📈 (above the 1-in-4 baseline)
- **<25%** = Struggling 📉 (below statistical average)

Color coding via `getWinRateTier()`, which reads `WIN_RATE_TIERS` in
`utils/stats.js` — the single source of truth for both the colors and the
thresholds (the thresholds are derived from `POD_BASELINE_WR`, not
hardcoded, so they follow `PLAYERS.length`):
- **Gold (#b4923f)** for >50% (legendary 🏆)
- **Sage green (#3d7a56)** for 25-50% (good 📈)
- **Crimson (#a8384a)** for <25% (struggling 📉)

These are applied as inline `style` props from JS. They deliberately have
no `theme.css` counterparts — duplicating them as custom properties
created a second, unreferenced source of truth that could drift.

## Features

1. **Landing Page**
   - 4 player selection buttons with unique colors
   - "Neues Spiel" button opens the game entry modal
   - Global statistics button (Gesamtübersicht)
   - "Spielarchiv" link to the games archive
   - Dark mode toggle
   - D20 triple-click easter egg (ignored on interactive elements)

2. **New Game Modal**
   - 2x2 grid of players; tap a cell to crown the winner (border + 👑)
   - Deck select per player (sorted by games played)
   - "＋ Neues Deck" quick-add writes to the deck registry
   - Participants removable (✕, min. `MIN_PARTICIPANTS`) and re-addable
     via empty slots
   - "＋ Neuer Spieler" in an empty seat adds a brand-new player
     (`AddPlayer` → `players` table); they can play immediately but stay
     out of pod stats (see Data Layer → Added players)
   - Edit mode (from archive): change date, decks, winner; delete game
   - **Never discards input by accident**: the backdrop and Escape close
     the modal only while the form is untouched. Once anything has been
     entered, both go inert and "Abbrechen" is the only way out. Every
     field is local state and the modal is unmounted on close, so a
     stray backdrop tap used to throw away a fully entered game with no
     undo. Dirtiness is derived by diffing live state against a snapshot
     of the opening state (`initialFormState`), so a newly added field
     is covered automatically — do not replace this with a `dirty` flag
     that each handler has to remember to set.

3. **Games Archive (`#/games`)**
   - All games grouped by day (Heute/Gestern/date), newest first
   - Winner shown first with 👑, tap a card to edit
   - Delete with 5s undo toast (re-insert)
   - Live updates via Supabase Realtime

4. **Tracker View (per player)**
   - Dashboard tab with win rate stats (Bayesian-ranked) and deck bars
     with 25% baseline tick
   - "Zuletzt gespielt" (deck + date of the player's most recent
     recorded game) and "Serie" (current win/loss streak, shown once
     it's 2+ games) — both derived from `games`, not just win/loss
     totals, via `playerGameHistory`/`getCurrentStreak`/`getLastPlayed`
   - Decks tab with read-only win/loss bars (legacy + game-derived);
     unplayed decks show a neutral bar; games-only decks have no delete
   - Rename registry decks inline (pencil); persisted as a single
     `renameDeckRegistry(id, name)` update on the deck's row — game
     history references the same `deck_id`, so the new name shows up
     everywhere via the join, no propagation write needed
   - Delete registry decks with 5s undo toast
   - Single-deck add panel
   - Live updates via Supabase Realtime

5. **Global Stats View**
   - Games played, pod-wide (not a "Gesamt-Winrate" — with one winner
     per multiplayer game, an all-players win rate is mathematically
     pinned near 1/pod-size and doesn't say anything the 25% baseline
     doesn't already say). Value is the highest per-player total
     (wins + losses), not `games.length` — legacy pre-Data-Model-v2
     games only survive as frozen counters on `decks`, with no row in
     `games` at all, so `games.length` alone would undercount
   - "Serie": the longest active win streak and the longest active
     loss streak pod-wide, shown as separate cards, each only if at
     least one player currently has one (player name capitalized).
     Both render `wide` (StatCard's `wide` prop spans the full grid
     row via `grid-column: 1 / -1`) — "X Niederlagen in Folge" is too
     long to share a half-width mobile cell without clipping
   - Player strength: one dot per player at their Bayesian-adjusted win
     rate (same prior as deck rankings), sorted, against the 25%
     baseline — surfaces cases where the raw win-rate ranking below and
     the games-weighted ranking here disagree (small sample vs. proven)
   - Activity vs. win rate scatter with quadrant labels; a tap anywhere
     in the plot resolves to the *nearest* dot rather than requiring a
     precise hit, so tightly-packed small decks stay easy to select
     (keyboard users still tab dot-by-dot); pinch-zoom / double-click
     zoom + pan on touch
   - Player comparison with win rate bars (25% baseline tick, tier icons)
   - Full list of all played decks, ranked by Bayesian-adjusted win rate
   - Best deck (min. 2 games) / Most played deck highlights
   - 📜 shortcut to the games archive
   - Live updates via Supabase Realtime

6. **PWA**
   - Web app manifest + launcher icons (192/512) and apple-touch-icon

## Code Style Guidelines

### Import Order
```javascript
// 1. React
import { useEffect, useState } from "react";
import PropTypes from "prop-types";

// 2. Hooks (internal)
import { useDecks } from "../hooks/useDecks.js";

// 3. Components (internal)
import { DarkModeToggle } from "../components/DarkModeToggle.jsx";

// 4. Utils / API
import { getDecks } from "../supabaseClient.js";

// 5. Sub-components
import { DashboardTab } from "./tracker/DashboardTab.jsx";

// 6. Styles
import styles from "./TrackerView.module.css";
```

### CSS Modules Pattern
- Colocate `.module.css` files with components
- Use CSS custom properties from `src/styles/theme.css`
- Per-instance dynamic values (player colors, glows): set CSS custom
  properties inline (e.g. `style={{ "--accent": color }}`) and consume
  them in real `:hover`/`:focus` rules — no JS mouse event handlers
- Only truly computed values (win rate bar widths) stay inline
- Share rules **across** stylesheets with
  `composes: x from "../styles/viewChrome.module.css"` rather than
  copying blocks between views — the three view stylesheets had drifted
  apart while being character-for-character identical for 80 lines

### Responsive Layout — CSS only
Breakpoint decisions live in `@media (max-width: 639px)` blocks, one per
stylesheet. There is **no JS breakpoint hook** — `useIsMobile` was
deleted, along with every `isMobile ? styles.xMobile : styles.x` ternary
and its `composes:`-based `*Mobile` twin. Do not reintroduce them: a
layout expressed in two languages needs two edits per tweak and can
flash the wrong layout on first paint. `MOBILE_BREAKPOINT` (640) survives
in `utils/stats.js` for `RollingD20`, which genuinely needs the pixel
width in JS; the `639px` in the media queries mirrors it.

### Theming — `data-theme`, not props
`useDarkMode` stamps `data-theme="dark"|"light"` on `<html>` (and
`index.html` does it again before first paint, hence no flash). Dark
variants belong in `:global([data-theme="dark"]) .foo` rules. `isDark`
is still passed down, but **only** to reach `DarkModeToggle`, which
renders from it — it must not drive styling, and dark-mode colors must
not appear as rgba literals in JSX.

### Shared UI Components
Prefer these over re-rendering the same markup:
- `Toast` — the only toast renderer. `showToast` accepts
  `{type, message, actionLabel?, onAction?}` with `type` one of
  `success` / `error` / `undo`. **Never derive the type by sniffing the
  message text** (two views used to check the leading emoji, so
  rewording a message silently restyled it); the code that builds the
  message names the type.
- `ViewHeader` — back button, icon, title, extra buttons as children,
  then the toggle.
- `PlayerAvatar` — player initial on their gradient. Caller passes only
  a size/radius class; `background` overrides the gradient with a flat
  color.
- `StatRow` — one ranked-list row, `variant="player"` or `"deck"`.

### Naming Conventions
- **Components**: PascalCase (`TrackerView.jsx`)
- **Hooks**: camelCase with `use` prefix (`useDecks.js`)
- **CSS Modules**: camelCase classes (`.playerCard`)
- **Constants**: UPPER_SNAKE_CASE (`PLAYER_COLORS`)

## Environment Variables

Required for Supabase integration:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Testing

Automated:
```bash
npm run lint    # ESLint (flat config), must stay at 0 errors
npm test        # Vitest unit tests (src/utils/stats.test.js)
npm run build   # Production build must succeed
```

`stats.test.js` covers the pure logic only — win rates, tiers,
`combineDeckStats`, and the streak/history helpers
(`playerGameHistory`, `getCurrentStreak`, `getLastPlayed`,
`streakDisplay`). **There are no component tests**, so anything touching
the UI has to be verified by hand:

1. Enter a game via "Neues Spiel": pick decks, tap a winner, save
   (check toast + archive entry)
2. Quick-add a new deck inside the modal ("＋ Neues Deck")
3. Open the modal and tap the backdrop / press Escape — closes while
   untouched, refuses once anything is entered; "Abbrechen" always closes
4. Edit a game in the archive (change winner/date), delete it and undo
   via the 5s toast
5. Delete a registry deck and undo it via the 5s toast
6. Switch between players (data isolation)
7. Refresh on `#/tracker/<player>`, `#/global` and `#/games` (view restored)
8. Open two tabs; enter a game in one, watch the other update (Realtime)
9. Test Global Stats page loads all players
10. Resize across 640px — the layout now switches via media queries, so
    check both sides of the breakpoint and that nothing depends on a
    re-render to reflow
11. Test D20 easter egg (triple-click on background, NOT on buttons)
12. Toggle dark mode and reload (no light flash); check the landing
    page's two gradient buttons and their hover glow in both themes,
    since those are now styled from `[data-theme="dark"]`

## Refactoring History

Completed in 2026-02:

| Phase | Changes |
|-------|---------|
| **Foundation** | Fixed useDarkMode hook, consolidated win rate logic, removed sample data |
| **CSS Modules** | Migrated inline styles to CSS Modules with CSS custom properties |
| **Architecture** | Extracted useDecks hook, split TrackerView into sub-components |
| **Polish** | Standardized imports, added PropTypes/JSDoc, optimized Supabase bulk operations |
| **Cleanup** | Removed duplicate `supabase.js` file, added PropTypes to all components, created `App.module.css` |

Completed in 2026-07:

| Phase | Changes |
|-------|---------|
| **Tooling** | ESLint 9 flat config + Vitest with stats unit tests |
| **Data safety** | Dirty-flag saves (no wipe on failed load, no redundant upserts), full-sync `saveDecks`, Realtime subscriptions, loud env-var failure |
| **Stats** | Bayesian `adjustedWinRate` (5 games @ 25%) for deck rankings, strict 0-1 tiers, `MOBILE_BREAKPOINT` |
| **Routing** | Hash routes (`#/tracker/<player>`) survive refresh |
| **UX** | Toast state machine with 5s delete-undo, import merge counts, neutral bar for unplayed decks, pod-aware labels |
| **Visual** | Anti-FOUC dark mode, CSS `:hover` via custom properties (no JS handlers), 25% baseline ticks, tier icons, `lang="de"` |
| **Cleanup** | Removed unused primitives library, images, CSS classes, `100MB` file; assets moved to `src/assets/` |
| **Features** | Pod-share donut, activity/winrate scatter (hand-rolled SVG), PWA manifest + icons |

Completed in 2026-07 (Data Model v2):

| Phase | Changes |
|-------|---------|
| **Schema** | `games` + `game_participants` tables (SQL in SUPABASE_SETUP.md); `decks.wins/losses` frozen as legacy baseline |
| **Data layer** | Game CRUD in `supabaseClient.js`, `useGames` hook with realtime, `combineDeckStats` merge util, `addDeckToRegistry` quick-add |
| **Game entry** | `NewGameModal`: 2x2 player grid, tap-to-crown winner, deck selects, participant remove/re-add, quick-add deck, edit mode with date |
| **Archive** | `GamesArchiveView` at `#/games`: day grouping, edit, delete with 5s undo (re-insert) |
| **Deprecation** | Read-only deck bars (no +/- controls), single-deck add replaces bulk import, `updateDeck` removed, name-based `deleteDeckByName`, `Btn.jsx` deleted |

Completed in 2026-08 (post-review cleanup):

| Phase | Changes |
|-------|---------|
| **Consistency** | Unified "best deck" logic behind `MIN_GAMES_FOR_BEST_DECK` — dashboard and Global Stats previously used different thresholds (2 vs. 3 games) and could disagree |
| **Data layer** | `getAllDecks()` replaces 4x parallel per-player `getDecks()` calls in `GlobalStatsView`/`NewGameModal`; `useGames` split into a context (`GamesContext`/`useGames()`) + `GamesProvider` mounted once in `App.jsx`, so games are fetched/subscribed once instead of per-view |
| **Cleanup** | `useToast` hook replaces duplicated toast state in `LandingPage`/`TrackerView`/`GamesArchiveView`; dead commented-out JSX removed from `DeckScatter`; inline win-rate math in `GlobalStatsView` now reuses `winRate()` |
| **Global Stats content** | `PodShareDonut` (win-share donut, mixed adjusted arc sizes with raw-share numbers) replaced by `PlayerStrengthChart` — one dot per player at their Bayesian-adjusted win rate against the 25% baseline, no raw-vs-adjusted comparison; moved from the bottom-most section to right after "Gesamtübersicht", swapping places with "Spieler-Vergleich" |

Completed in 2026-08 ("Kartenrahmen" visual redesign, merged from `design/kartenrahmen`):

Dark cardstock + foil / light parchment card-face theme, replacing the
original purple/green/Outfit look app-wide:
- **Typography**: `Cinzel` (display, engraved-capitals headers/labels) +
  `Work Sans` (body) replace `Outfit` + `DM Sans`
- **Palette**: `PLAYER_COLORS` re-mapped to emerald (baum), red
  (mary), violet-magenta (pascal), gold-yellow (wewy) — same hex in
  both themes, matching the pre-existing theme-independent architecture.
  `theme.css` tokens rebuilt for both a dark cardstock surface
  (`#1c1712`) and a light parchment surface (`#ece0c8`); win-rate tiers
  restyled to gold/sage-green/crimson so they stay visually distinct
  from the new player hues. Colors were picked by eye for this
  direction, not run through colorblind-safety validation (see
  `no-colorblind-palette-validation` project memory).
- Every hardcoded color that didn't already flow through a `theme.css`
  token was hunted down and updated individually: `DarkModeToggle`
  icons now use `currentColor` instead of baked-in old-theme hex,
  `D20`'s critical-hit/fail colors, `LandingPage`'s button gradients
  and glow shadows, `GlobalStatsView`'s ad-hoc `StatCard` accents, and
  `DeckScatter`'s "good zone" wash.

Completed in 2026-08 (DB IDs migration):

`player`/`deck` text columns stay (never dropped, and remain the
permanent historical snapshot for deleted decks), but `decks` and
`game_participants` gained `player_id`/`deck_id` foreign keys (new
`players` table added). SQL run manually by the user in the Supabase
SQL Editor (see SUPABASE_SETUP.md); this phase is the code side:
- `getPlayerIdMap()` in `supabaseClient.js` caches the player slug→id
  lookup, used by every write path (`saveDecks`, `addDeckToRegistry`,
  `addGame`, `updateGame`) to populate `player_id` (later superseded for
  games: the atomic `save_game`/`update_game` RPC resolves `player_id`
  server-side, so only the deck writes still use `getPlayerIdMap()` —
  see the current-state Data Layer section above)
- `getGames()` embeds `decks(name)` via `deck_id` and prefers the live
  name over the stored text, so renames show up everywhere instantly
- `renameDeckInGames` (propagation write into every game row) removed
  entirely; replaced by `renameDeckRegistry(id, name)`, a single-row
  update on the deck itself — `useDecks`'s `renameDeck` no longer marks
  the change dirty for the debounced full-sync, since racing that
  name-keyed upsert against the new id-keyed update could otherwise
  create a duplicate row
- `GamesProvider`'s realtime subscription added `decks` alongside
  `games`/`game_participants`, since a rename now only touches `decks`
  — without it, the cached join would show the old name until reload

Completed in 2026-08 (`/simplify` pass over `src/`, branch
`worktree-simplify-codebase`):

A four-angle review (reuse, simplification, efficiency, altitude) applied
in two halves — the mechanical half immediately, the structural half one
commit at a time afterwards, each verified with lint + tests + build.

| Phase | Changes |
|-------|---------|
| **Applied first** | Deduped constants into `stats.js` (`POD_BASELINE_WR`, `formatPct`, `streakDisplay`, `MIN_STREAK_GAMES`, `PROVEN_DECK_GAMES`); memoized `DeckScatter`'s layout (it was rebuilt on every touchmove) and `GlobalStatsView`'s stats; `combineDeckStats` called once per player instead of three times; `useIsMobile` switched to `matchMedia`; dead theme tokens and CSS removed |
| **Tests** | 16 cases for the previously untested `playerGameHistory` / `getCurrentStreak` / `getLastPlayed` / `streakDisplay` |
| **Bug fix** | New-game modal no longer discards a filled-in game when the backdrop is tapped |
| **Components** | `Toast`, `ViewHeader`, `PlayerAvatar`, `StatRow` extracted; toast type no longer sniffed from the message's leading emoji |
| **CSS** | `styles/viewChrome.module.css` for the shell/header/spinner the three views had duplicated; the JS responsive layer replaced by media queries (17 `*Mobile` classes and ~25 ternaries deleted, `useIsMobile` removed); dark mode moved to `[data-theme="dark"]` rules |
| **Data layer** | `AllDecksProvider` owns the registries' fetch + realtime (was a third hand-rolled subscription in `GlobalStatsView`, and no subscription at all in `NewGameModal`); `unwrap()` replaces 13 copies of the error block in `supabaseClient.js` |
| **Small** | `RollingD20` reads `window.innerWidth` itself (App was passing a hardcoded 1024 on desktop, so the die aimed at the wrong center); `useDarkMode`'s `loaded` flag dropped; App's two click handlers merged; `TAB_H` moved to CSS; `MIN_PARTICIPANTS` named; `index.html`'s reset folded into `theme.css` |

Deferred items and the reasoning behind each are in `CLEANUP-BACKLOG.md`
(gitignored, local working note). It also records one **do not do**:
`ImportPanel`'s `useRef` + `useEffect` focus handling is *not* a
reimplementation of React's `autoFocus` — the prop flips false→true after
decks load asynchronously, which built-in `autoFocus` (mount-only) would
not catch.

See git history for detailed commits:
```bash
git log --oneline --all
```

## Git Workflow Prerogatives

### Author Attribution
When making commits on behalf of the user, each AI tool attributes its own commits — the steps differ per tool because Claude Code's operating rules never permit changing git config (see below), so it uses a different mechanism than Kimi to reach the same result.

**Kimi:**

1. **Before committing**, set Git user to "Kimi":
   ```bash
   git config user.name "Kimi"
   git config user.email "kimi@kimi.co"
   ```

2. **Make the commit locally** as usual. Do not push to the remote unless the user explicitly asks for it.

3. **After committing**, restore the original user:
   ```bash
   git config user.name "pascal müller"
   git config user.email "54896623+Cinemaker123@users.noreply.github.com"
   ```

**Claude Code:**

Claude Code must never run `git config`, so it doesn't do the mutate-then-restore dance above. Instead it sets the commit's author directly via `git commit --author`, which needs no config change and leaves nothing to restore:

```bash
git commit --author="Claude <noreply@anthropic.com>" -m "..."
```

The committer identity (and the default `git log` view) stays pascal müller either way — only the recorded author changes.

> Note: neither Kimi nor Claude Code should push commits to the remote by default. Keep commits local and let the user push when they're ready.

### Branch Naming

Feature branches use `<type>/<short-kebab-description>`, following Conventional
Commits types:

| Type | For |
|------|-----|
| `feat/` | new capability or user-facing feature |
| `fix/` | bug fix |
| `chore/` | tooling, deps, config, DB ops with no app-behavior change |
| `docs/` | documentation only |
| `refactor/` | code change that neither fixes a bug nor adds a feature |

Description is lowercase kebab-case, no trailing ticket noise. Example:
`feat/level1-rls-hardening`, `fix/deck-rename-race`, `docs/auth-hardening-notes`.

## Deployment

**Vercel setup:**
1. Connect GitHub repo
2. Framework preset: "Vite"
3. Build command: `npm run build` (auto-detected)
4. Output directory: `dist` (auto-detected)
5. Add environment variables in Vercel dashboard

## CI & Backups

`.github/workflows/ci.yml` runs `lint` + `test` + `build` on every PR and
push to `main`. It only reports status — to make it an actual merge gate,
enable a branch protection rule on `main` requiring the `check` job.

`.github/workflows/backup.yml` runs weekly (Sundays, ~evening Central
European time, plus manual `workflow_dispatch`) and exports `decks`,
`games`, and `game_participants` as JSON — the free Supabase tier has
no automated backups, so this is the actual data-loss insurance (see
`auth.md`). The export is pushed to a **separate private repo**
(`Cinemaker123/mtg-win-stats-backups`), not committed here — this repo
is public and the data includes player names. Both workflows need
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` added as **GitHub
Actions secrets** (repo Settings → Secrets and variables → Actions) —
same values as the Vercel env vars, but Actions can't read those
directly. `backup.yml` additionally needs `BACKUP_REPO_TOKEN`, a
fine-grained PAT scoped to `contents: write` on the private backup
repo only.

## Future Enhancements (Potential)

- Deck archetype categorization
- Win/loss streak tracking
- Head-to-head matchup records (possible with v2 game data)
- Seasonal statistics reset
- **Auth — Level 2/3 in `auth.md`.** Level 1 (RLS enabled + allow-all
  policies, `decks_counts_check`, pinned RPC `search_path`) is **applied**
  via `db/level1_rls.sql` and verified live; net anon access is unchanged.
  A PIN gate (Level 2) or real per-player auth (Level 3) remain optional.
