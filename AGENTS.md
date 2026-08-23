# MTG Win Stats Tracker

## Project Overview

This is a **React and Vite application**. It tracks Magic: The Gathering deck
performance for several players. The interface is mobile-friendly. It records
wins and losses, imports deck data, and shows cross-player analytics.

## Technology Stack

- **Framework**: React 18+ with the Vite build system
- **Language**: JavaScript (JSX) with PropTypes
- **Styling**: CSS Modules with CSS custom properties
- **Storage**: Supabase (PostgreSQL backend) with Realtime subscriptions
- **Fonts**: Google Fonts, loaded with a `<link>` in `index.html`. Baloo 2 is
  the display font. Figtree is the body font. Cinzel is `--font-display-alt`,
  used for the big values on stat cards, the player names on the landing page,
  and the Spielerstärke names and percentages.
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

- **Local React state** through `useState` hooks.
- **Custom hooks**: `useDecks` holds the registry of the player who edits.
  `useDarkMode` holds the theme.
- **Two providers, mounted once in `App.jsx`**: `GamesProvider` holds the games
  archive. `AllDecksProvider` holds the registry of every player. Each provider
  owns one fetch and one debounced realtime subscription. Every view reads them
  through `useGames()` and `useAllDecks()`. If a feature needs a third copy of
  this machinery, extend a provider instead.
- **Persistence**: a Supabase PostgreSQL database.
- **Per-player data isolation**: each deck row stores a player identifier.

### Routing

`App.jsx` uses hash-based routing. It survives a page refresh, and the back and
forward buttons work:

- `#/` → `LandingPage`
- `#/tracker/<player>` → `TrackerView` (one player)
- `#/global` → `GlobalStatsView` (cross-player stats)
- `#/games` → `GamesArchiveView` (games archive)
- An invalid hash normalizes to `#/`.

### Data Layer (`useDecks` + `useGames` + `supabaseClient`)

- **Data Model v2**: the app records results as *games* (the `games` and
  `game_participants` tables), not as manual per-deck counters. The `decks`
  table is a pure deck registry. Its `wins` and `losses` columns are the
  **frozen legacy baseline**. These are pre-v2 counts, and the app no longer
  increments them.
- **Combined stats**: every place that shows stats calls
  `combineDeckStats(registryDecks, games, player)`. This function merges the
  legacy baseline with the game-derived counts. A deck that exists only in
  games still appears.
- **Dirty-flag saves**: Supabase writes fire only after local mutations, never
  on load. A failed fetch keeps `loaded = false`. As a result, saves stay
  disabled, and a failed load can never wipe remote data.
- **Full sync**: `saveDecks(player, decks)` upserts the given decks and deletes
  the rows that are not in the list. Local state is authoritative. The app uses
  this only for registry changes (add or delete a deck).
- **Game CRUD**: `addGame`, `updateGame`, and `deleteGame` write directly, with
  no dirty flag. `addGame` and `updateGame` call the `save_game` and
  `update_game` Postgres functions through `supabase.rpc(...)`. This writes the
  game row and its participants in **one transaction**. As a result, a
  mid-write failure can no longer leave a game with zero participants or wipe
  the original line-up on an edit. `update_game` replaces all participants. The
  function definitions live in SUPABASE_SETUP.md. Apply them once in the SQL
  editor.
- **IDs alongside names**: the `decks` and `game_participants` tables carry
  `player_id` and `deck_id` foreign keys (into `players` and `decks`), next to
  their original `player` and `deck` text columns. The app never drops the text
  columns. `getGames()` embeds `decks(name)` through `deck_id` and prefers that
  live name over the stored `deck` text. `deck_id` is `ON DELETE SET NULL`. As
  a result, when a registry deck is deleted, the join returns null, and the
  stored text becomes a permanent historical snapshot instead of a dangling
  reference. `getPlayerIdMap()` caches the lookup from player slug to id for the
  page lifetime. It is used whenever the app writes a deck row (`saveDecks`,
  `addDeckToRegistry`), so `player_id` stays populated. For games, `save_game`
  and `update_game` resolve `player_id` on the server from the slug. As a
  result, participant rows do not depend on a fresh client cache.
- **Realtime**: `useDecks` subscribes to `postgres_changes` filtered by player
  and refetches on remote writes. It suppresses the echoes of its own saves for
  1 second. `GamesProvider` subscribes to `games`, `game_participants`, and
  `decks`. `AllDecksProvider` subscribes to `decks`. Both use a 500 ms debounced
  refetch, and both are mounted once in `App.jsx`. As a result, every view
  reads the same cache instead of a separate fetch and subscription.
  `GamesProvider` includes `decks` because a deck rename now touches only the
  `decks` table (see above). Without it, the cached `games` join would keep the
  old name until a reload. This needs the tables in the `supabase_realtime`
  publication (see SUPABASE_SETUP.md).
- **Bulk deck fetch**: `getDecksByPlayer()` fetches the decks of every player in
  one unfiltered query and groups them. It guarantees one entry per player in
  `PLAYERS`. **Only** `AllDecksProvider` calls it. `GlobalStatsView` and
  `NewGameModal` read the shared cache, so opening the game modal costs no
  query. `useDecks` still calls the per-player `getDecks(player)`. That call is
  correctly scoped.
- **Added players**: `addPlayer(name)` comes from the `AddPlayer` component, in
  the empty seats of the new-game modal. It upserts one row into the `players`
  table. The slug comes from `playerSlug`. The unique constraint on the table
  is the real dedupe guard. The function then busts the `getPlayerIdMap` cache,
  so the new slug resolves at once. The app records an added player like anyone
  else (games, decks, archive). But every statistic keys off `PLAYERS` in
  `stats.js`. As a result, an added player stays out of all rankings until you
  add them there on purpose. `getDecksByPlayer()` unions `PLAYERS` with the live
  slugs. This is what lets an added player own decks at all.
- **Deck ids in the cache**: each entry in the `AllDecksProvider` cache carries
  its `id`. `NewGameModal` resolves the `deck_id` of each participant out of the
  cache by name. A deck that is added optimistically through `addDeckLocally`
  must include the id that `addDeckToRegistry` returns. If it does not, a game
  saved right after a quick-add gets a null `deck_id`.
- **Error handling**: every query in `supabaseClient.js` goes through
  `unwrap(result, context)`. This function logs with that context and rethrows.
  Add a new query the same way. Do not re-inline the
  `if (error) { console.error; throw }` block.
- **Undo on delete**: a deck deletion is local, with a toast and a 5 s
  "Rückgängig". The undo reinserts the deck locally, and the debounced sync
  restores the DB row. A game deletion offers the same 5 s undo. The undo
  re-inserts the game with a new id.

### Win Rate Ranking

- Raw win rate (`winRate`) is for display. It is always a 0-1 number.
- `adjustedWinRate` is for the **ranking** of decks. It uses a Bayesian prior of
  10 imaginary games at the 25% pod baseline. As a result, a small sample
  regresses to the mean, and a lucky 2-0 no longer outranks a proven 18-2.
- `getWinRateTier` accepts **0-1 only**. There is no percentage heuristic.
- `MIN_GAMES_FOR_BEST_DECK` (2 games) is the shared threshold before a deck can
  be the "best" or the "worst". Both the per-player dashboard
  (`getDynamicStats`) and the `bestDeck` in Global Stats use it, so they always
  agree.

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

This is a 4-player Commander pod. The random average is 25%:

- **More than 50%** = Legendary 🏆 (2x or more the 25% random average)
- **25-50%** = Good 📈 (more than the 1-in-4 baseline)
- **Less than 25%** = Struggling 📉 (less than the statistical average)

`getWinRateTier()` applies the color code. It reads `WIN_RATE_TIERS` in
`utils/stats.js`. This is the single source of truth for both the colors and
the thresholds. The thresholds derive from `POD_BASELINE_WR`, not from hardcoded
values, so they follow `PLAYERS.length`:

- **Gold (#b4923f)** for more than 50% (legendary 🏆)
- **Sage green (#3d7a56)** for 25-50% (good 📈)
- **Crimson (#a8384a)** for less than 25% (struggling 📉)

JS applies these as inline `style` props. They have no counterpart in
`theme.css` on purpose. A duplicate as custom properties created a second,
unreferenced source of truth that could drift.

## Features

1. **Landing Page**
   - 4 player selection buttons, each with a unique color
   - "Neues Spiel" button opens the game entry modal
   - Global statistics button (Gesamtübersicht)
   - "Spielarchiv" link to the games archive
   - Dark mode toggle
   - A D20 triple-click easter egg (ignored on interactive elements)

2. **New Game Modal**
   - A 2x2 grid of players. Tap a cell to crown the winner (border + 👑).
   - A deck select per player (sorted by games played)
   - "＋ Neues Deck" quick-add writes to the deck registry
   - You can remove a participant (✕, minimum `MIN_PARTICIPANTS`) and add them
     again through an empty slot
   - "＋ Neuer Spieler" in an empty seat adds a brand-new player (`AddPlayer` →
     `players` table). They can play at once but stay out of the pod stats (see
     Data Layer → Added players).
   - Edit mode (from the archive): change the date, decks, or winner; delete the
     game
   - **The modal never discards input by accident.** The backdrop and Escape
     close the modal only while the form is untouched. After you enter
     anything, both go inert, and "Abbrechen" is the only way out. Every field
     is local state, and the modal unmounts on close. In the past, a stray
     backdrop tap could throw away a fully entered game with no undo. The app
     derives dirtiness. It diffs the live state against a snapshot of the
     opening state (`initialFormState`), so a new field is covered
     automatically. Do not replace this with a `dirty` flag that each handler
     must remember to set.

3. **Games Archive (`#/games`)**
   - All games grouped by day (Heute/Gestern/date), newest first
   - The winner shows first with 👑. Tap a card to edit it.
   - Delete with a 5 s undo toast (re-insert)
   - Live updates through Supabase Realtime

4. **Tracker View (per player)**
   - A Dashboard tab with win rate stats (Bayesian-ranked) and deck bars with a
     25% baseline tick
   - "Zuletzt gespielt" (deck and date of the most recent recorded game of the
     player) and "Serie" (the current win or loss streak, shown once it is 2 or
     more games). The app derives both from `games`, not just from win and loss
     totals, through `playerGameHistory`, `getCurrentStreak`, and
     `getLastPlayed`.
   - A Decks tab with read-only win/loss bars (legacy and game-derived). An
     unplayed deck shows a neutral bar. A games-only deck has no delete control.
   - Rename a registry deck inline (pencil). The app persists this as a single
     `renameDeckRegistry(id, name)` update on the row of the deck. Game history
     references the same `deck_id`, so the new name shows up everywhere through
     the join. No propagation write is necessary.
   - Delete a registry deck with a 5 s undo toast
   - A single-deck add panel
   - Live updates through Supabase Realtime

5. **Global Stats View**
   - Games played, pod-wide. This is not a "Gesamt-Winrate". With one winner per
     multiplayer game, an all-players win rate is pinned near 1/pod-size and
     says nothing that the 25% baseline does not already say. The value is the
     highest per-player total (wins + losses), not `games.length`. A legacy
     pre-Data-Model-v2 game survives only as a frozen counter on `decks`, with
     no row in `games`. As a result, `games.length` alone would undercount.
   - "Serie": the longest active win streak and the longest active loss streak
     pod-wide, shown as separate cards. Each card appears only if at least one
     player currently has a streak (player name capitalized). Both cards render
     `wide`. The `wide` prop of StatCard spans the full grid row with
     `grid-column: 1 / -1`. "X Niederlagen in Folge" is too long to share a
     half-width mobile cell without clipping.
   - Player strength: one dot per player at their Bayesian-adjusted win rate
     (the same prior as the deck rankings), sorted, against the 25% baseline.
     This surfaces a case where the raw win-rate ranking below and the
     games-weighted ranking here disagree (small sample vs. proven).
   - An activity vs. win rate scatter with quadrant labels. A tap anywhere in
     the plot resolves to the *nearest* dot, and does not need a precise hit, so
     tightly-packed small decks stay easy to select. Keyboard users still tab
     dot-by-dot. The plot supports pinch-zoom, double-click zoom, and pan on
     touch.
   - A player comparison with win rate bars (25% baseline tick, tier icons)
   - The full list of all played decks, ranked by Bayesian-adjusted win rate
   - Best deck (minimum 2 games) and Most played deck highlights
   - A 📜 shortcut to the games archive
   - Live updates through Supabase Realtime

6. **PWA**
   - A web app manifest, launcher icons (192/512), and an apple-touch-icon

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

- Colocate a `.module.css` file with its component.
- Use the CSS custom properties from `src/styles/theme.css`.
- For a per-instance dynamic value (player colors, glows), set a CSS custom
  property inline (for example `style={{ "--accent": color }}`) and consume it
  in a real `:hover` or `:focus` rule. Do not use JS mouse event handlers.
- Keep only a truly computed value inline (win rate bar widths).
- Share a rule **across** stylesheets with
  `composes: x from "../styles/viewChrome.module.css"`. Do not copy a block
  between views. The three view stylesheets had drifted apart while they were
  character-for-character identical for 80 lines.

### Responsive Layout — CSS only

Breakpoint decisions live in `@media (max-width: 639px)` blocks, one per
stylesheet. There is **no JS breakpoint hook**. `useIsMobile` was deleted, with
every `isMobile ? styles.xMobile : styles.x` ternary and its `composes:`-based
`*Mobile` twin. Do not add them again. A layout in two languages needs two
edits per tweak and can flash the wrong layout on the first paint.
`MOBILE_BREAKPOINT` (640) survives in `utils/stats.js` for `RollingD20`, which
genuinely needs the pixel width in JS. The `639px` in the media queries mirrors
it.

### Theming — `data-theme`, not props

`useDarkMode` stamps `data-theme="dark"|"light"` on `<html>`. `index.html` does
it again before the first paint, so there is no flash. A dark variant belongs in
a `:global([data-theme="dark"]) .foo` rule. The app still passes `isDark` down,
but **only** to reach `DarkModeToggle`, which renders from it. `isDark` must not
drive styling, and a dark-mode color must not appear as an rgba literal in JSX.

### Shared UI Components

Prefer these over a re-render of the same markup:

- `Toast` — the only toast renderer. `showToast` accepts
  `{type, message, actionLabel?, onAction?}`. `type` is one of `success`,
  `error`, or `undo`. **Never derive the type from the message text.** Two views
  used to check the leading emoji, so a reworded message silently restyled
  itself. The code that builds the message names the type.
- `ViewHeader` — a back button, an icon, a title, extra buttons as children,
  then the toggle.
- `PlayerAvatar` — a player initial on their gradient. The caller passes only a
  size or radius class. `background` overrides the gradient with a flat color.
- `StatRow` — one ranked-list row, `variant="player"` or `"deck"`.

### Naming Conventions

- **Components**: PascalCase (`TrackerView.jsx`)
- **Hooks**: camelCase with a `use` prefix (`useDecks.js`)
- **CSS Modules**: camelCase classes (`.playerCard`)
- **Constants**: UPPER_SNAKE_CASE (`PLAYER_COLORS`)

## Environment Variables

These are necessary for the Supabase integration:

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

`stats.test.js` covers the pure logic only: win rates, tiers,
`combineDeckStats`, and the streak and history helpers (`playerGameHistory`,
`getCurrentStreak`, `getLastPlayed`, `streakDisplay`). **There are no component
tests.** As a result, you must test anything that touches the UI by hand:

1. Enter a game through "Neues Spiel": pick the decks, tap a winner, and save.
   Make sure that the toast and the archive entry appear.
2. Quick-add a new deck inside the modal ("＋ Neues Deck").
3. Open the modal and tap the backdrop or press Escape. It closes while the form
   is untouched, and it refuses after you enter anything. "Abbrechen" always
   closes.
4. Edit a game in the archive (change the winner or date). Delete it, then undo
   through the 5 s toast.
5. Delete a registry deck, then undo it through the 5 s toast.
6. Switch between players (data isolation).
7. Refresh on `#/tracker/<player>`, `#/global`, and `#/games`. The view is
   restored.
8. Open two tabs. Enter a game in one, and watch the other update (Realtime).
9. Make sure that the Global Stats page loads all players.
10. Resize across 640px. The layout now switches through media queries. Check
    both sides of the breakpoint, and make sure that nothing depends on a
    re-render to reflow.
11. Test the D20 easter egg (triple-click on the background, NOT on a button).
12. Toggle dark mode and reload (no light flash). Check the two gradient buttons
    on the landing page and their hover glow in both themes, because they are
    now styled from `[data-theme="dark"]`.

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
| **Consistency** | Unified "best deck" logic behind `MIN_GAMES_FOR_BEST_DECK`. The dashboard and Global Stats had used different thresholds (2 vs. 3 games) and could disagree. |
| **Data layer** | `getAllDecks()` replaces 4x parallel per-player `getDecks()` calls in `GlobalStatsView`/`NewGameModal`. `useGames` split into a context (`GamesContext`/`useGames()`) + `GamesProvider` mounted once in `App.jsx`, so games are fetched and subscribed once instead of per-view. |
| **Cleanup** | `useToast` hook replaces duplicated toast state in `LandingPage`/`TrackerView`/`GamesArchiveView`. Dead commented-out JSX removed from `DeckScatter`. Inline win-rate math in `GlobalStatsView` now reuses `winRate()`. |
| **Global Stats content** | `PodShareDonut` (win-share donut, mixed adjusted arc sizes with raw-share numbers) replaced by `PlayerStrengthChart`. This shows one dot per player at their Bayesian-adjusted win rate against the 25% baseline, with no raw-vs-adjusted comparison. It moved from the bottom-most section to right after "Gesamtübersicht", and swapped places with "Spieler-Vergleich". |

Completed in 2026-08 ("Kartenrahmen" visual redesign, merged from
`design/kartenrahmen`):

A dark cardstock and foil theme, with a light parchment card-face, replaces the
original purple/green/Outfit look app-wide:

- **Typography**: `Cinzel` (display, engraved-capitals headers and labels) and
  `Work Sans` (body) replace `Outfit` and `DM Sans`.
- **Palette**: `PLAYER_COLORS` is re-mapped to emerald (baum), red (mary),
  violet-magenta (pascal), and gold-yellow (wewy). The hex is the same in both
  themes, which matches the theme-independent architecture that was already
  there. The `theme.css` tokens are rebuilt for both a dark cardstock surface
  (`#1c1712`) and a light parchment surface (`#ece0c8`). The win-rate tiers are
  restyled to gold, sage-green, and crimson, so they stay distinct from the new
  player hues. The colors were picked by eye for this direction. They did not go
  through colorblind-safety validation (see the `no-colorblind-palette-validation`
  project memory).
- Every hardcoded color that did not already flow through a `theme.css` token
  was found and updated one at a time. `DarkModeToggle` icons now use
  `currentColor` instead of baked-in old-theme hex. This also covers the
  critical-hit and critical-fail colors of `D20`, the button gradients and glow
  shadows of `LandingPage`, the ad-hoc `StatCard` accents of `GlobalStatsView`,
  and the "good zone" wash of `DeckScatter`.

Completed in 2026-08 (DB IDs migration):

The `player` and `deck` text columns stay. The app never drops them, and they
remain the permanent historical snapshot for a deleted deck. The `decks` and
`game_participants` tables gained `player_id` and `deck_id` foreign keys, and a
new `players` table was added. The user ran the SQL by hand in the Supabase SQL
Editor (see SUPABASE_SETUP.md). This phase is the code side:

- `getPlayerIdMap()` in `supabaseClient.js` caches the lookup from player slug to
  id. Every write path (`saveDecks`, `addDeckToRegistry`, `addGame`,
  `updateGame`) used it to populate `player_id`. The atomic `save_game` and
  `update_game` RPC later superseded this for games: they resolve `player_id` on
  the server, so only the deck writes still use `getPlayerIdMap()` (see the
  current-state Data Layer section above).
- `getGames()` embeds `decks(name)` through `deck_id` and prefers the live name
  over the stored text, so a rename shows up everywhere at once.
- `renameDeckInGames` (a propagation write into every game row) was removed. It
  is replaced by `renameDeckRegistry(id, name)`, a single-row update on the deck
  itself. The `renameDeck` in `useDecks` no longer marks the change dirty for
  the debounced full-sync. A race between that name-keyed upsert and the new
  id-keyed update could otherwise create a duplicate row.
- The realtime subscription of `GamesProvider` added `decks` alongside `games`
  and `game_participants`, because a rename now touches only `decks`. Without
  it, the cached join would show the old name until a reload.

Completed in 2026-08 (`/simplify` pass over `src/`, branch
`worktree-simplify-codebase`):

A four-angle review (reuse, simplification, efficiency, altitude), applied in
two halves. The mechanical half went in at once. The structural half went in one
commit at a time afterwards. Each commit was verified with lint, tests, and
build.

| Phase | Changes |
|-------|---------|
| **Applied first** | Deduped constants into `stats.js` (`POD_BASELINE_WR`, `formatPct`, `streakDisplay`, `MIN_STREAK_GAMES`, `PROVEN_DECK_GAMES`). Memoized the `DeckScatter` layout (it was rebuilt on every touchmove) and the `GlobalStatsView` stats. `combineDeckStats` called once per player instead of three times. `useIsMobile` switched to `matchMedia`. Dead theme tokens and CSS removed. |
| **Tests** | 16 cases for the previously untested `playerGameHistory` / `getCurrentStreak` / `getLastPlayed` / `streakDisplay` |
| **Bug fix** | The new-game modal no longer discards a filled-in game when the backdrop is tapped |
| **Components** | `Toast`, `ViewHeader`, `PlayerAvatar`, `StatRow` extracted. The toast type is no longer sniffed from the leading emoji of the message. |
| **CSS** | `styles/viewChrome.module.css` for the shell, header, and spinner that the three views had duplicated. The JS responsive layer was replaced by media queries (17 `*Mobile` classes and about 25 ternaries deleted, `useIsMobile` removed). Dark mode moved to `[data-theme="dark"]` rules. |
| **Data layer** | `AllDecksProvider` owns the fetch and realtime for the registries. This was a third hand-rolled subscription in `GlobalStatsView`, and no subscription at all in `NewGameModal`. `unwrap()` replaces 13 copies of the error block in `supabaseClient.js`. |
| **Small** | `RollingD20` reads `window.innerWidth` itself (App was passing a hardcoded 1024 on desktop, so the die aimed at the wrong center). The `loaded` flag of `useDarkMode` was dropped. The two click handlers of App were merged. `TAB_H` moved to CSS. `MIN_PARTICIPANTS` named. The reset of `index.html` was folded into `theme.css`. |

Deferred items and the reasoning for each are in `CLEANUP-BACKLOG.md`
(gitignored, a local working note). It also records one **do not do**: the
`useRef` and `useEffect` focus handling in `ImportPanel` is *not* a
reimplementation of the `autoFocus` of React. The prop flips false→true after
the decks load asynchronously, which the built-in `autoFocus` (mount-only) would
not catch.

See the git history for the detailed commits:

```bash
git log --oneline --all
```

## Git Workflow Prerogatives

### Author Attribution

When you make a commit for the user, each AI tool attributes its own commits.
The steps differ per tool. The operating rules of Claude Code never permit a
change to git config (see below), so it uses a different mechanism than Kimi to
reach the same result.

**Kimi:**

1. **Before you commit**, set the Git user to "Kimi":
   ```bash
   git config user.name "Kimi"
   git config user.email "kimi@kimi.co"
   ```

2. **Make the commit locally** as usual. Do not push to the remote unless the
   user asks for it.

3. **After you commit**, restore the original user:
   ```bash
   git config user.name "pascal müller"
   git config user.email "54896623+Cinemaker123@users.noreply.github.com"
   ```

**Claude Code:**

Claude Code must never run `git config`, so it does not do the mutate-then-restore
steps above. Instead it sets the author of the commit directly with
`git commit --author`. This needs no config change and leaves nothing to
restore:

```bash
git commit --author="Claude <noreply@anthropic.com>" -m "..."
```

The committer identity (and the default `git log` view) stays pascal müller
either way. Only the recorded author changes.

> Note: neither Kimi nor Claude Code pushes commits to the remote by default.
> Keep the commits local, and let the user push when they are ready.

### Branch Naming

A feature branch uses `<type>/<short-kebab-description>`, and follows the
Conventional Commits types:

| Type | For |
|------|-----|
| `feat/` | a new capability or user-facing feature |
| `fix/` | a bug fix |
| `chore/` | tooling, deps, config, or DB ops with no app-behavior change |
| `docs/` | documentation only |
| `refactor/` | a code change that neither fixes a bug nor adds a feature |

The description is lowercase kebab-case, with no trailing ticket noise. For
example: `feat/level1-rls-hardening`, `fix/deck-rename-race`,
`docs/auth-hardening-notes`.

## Deployment

**Vercel setup:**

1. Connect the GitHub repo.
2. Framework preset: "Vite".
3. Build command: `npm run build` (auto-detected).
4. Output directory: `dist` (auto-detected).
5. Add the environment variables in the Vercel dashboard.

## CI & Backups

`.github/workflows/ci.yml` runs `lint`, `test`, and `build` on every PR and on
every push to `main`. It only reports status. To make it a real merge gate,
enable a branch protection rule on `main` that requires the `check` job.

`.github/workflows/backup.yml` runs weekly (Sundays, about evening Central
European time), and also on a manual `workflow_dispatch`. It exports `decks`,
`games`, and `game_participants` as JSON. The free Supabase tier has no
automated backups, so this is the real data-loss insurance (see `auth.md`). The
export is pushed to a **separate private repo**
(`Cinemaker123/mtg-win-stats-backups`), not committed here. This repo is public,
and the data includes player names. Both workflows need `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` added as **GitHub Actions secrets** (repo Settings →
Secrets and variables → Actions). These are the same values as the Vercel env
vars, but Actions cannot read those directly. `backup.yml` also needs
`BACKUP_REPO_TOKEN`, a fine-grained PAT scoped to `contents: write` on the
private backup repo only.

## Future Enhancements (Potential)

- Deck archetype categorization
- Win/loss streak tracking
- Head-to-head matchup records (possible with the v2 game data)
- Seasonal statistics reset
- **Auth — Level 2/3 in `auth.md`.** Level 1 is **applied** through
  `db/level1_rls.sql` and verified live (RLS enabled, allow-all policies,
  `decks_counts_check`, pinned RPC `search_path`). The net anon access is
  unchanged. A PIN gate (Level 2) or real per-player auth (Level 3) stay
  optional.
