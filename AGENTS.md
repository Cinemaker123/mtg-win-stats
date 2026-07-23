# MTG Win Stats Tracker

## Project Overview

A **React + Vite application** for tracking Magic: The Gathering deck performance statistics across multiple players. Features a mobile-friendly interface for recording wins/losses, importing deck data, and viewing cross-player analytics.

## Technology Stack

- **Framework**: React 18+ with Vite build system
- **Language**: JavaScript (JSX) with PropTypes
- **Styling**: CSS Modules with CSS custom properties
- **Storage**: Supabase (PostgreSQL backend) with Realtime subscriptions
- **Fonts**: Google Fonts (Outfit, DM Sans) loaded via CSS @import
- **Build Tool**: Vite with Hot Module Replacement
- **Tooling**: ESLint 9 (flat config: react + react-hooks) and Vitest

## File Structure

```
mtg-win-stats/
├── src/
│   ├── App.jsx                    # Hash router (#/, #/tracker/<player>, #/global)
│   ├── App.module.css             # App root styles
│   ├── assets/
│   │   ├── D20_icon.png           # D20 die image
│   │   └── logo.png               # MTG logo
│   ├── components/
│   │   ├── D20.jsx               # D20 die display component
│   │   ├── DarkModeToggle.jsx    # Dark mode toggle button
│   │   ├── DeckScatter.jsx       # Activity vs. win rate scatter (SVG)
│   │   ├── Logo.jsx              # MTG logo component
│   │   ├── PodShareDonut.jsx     # Win-share donut per player (SVG)
│   │   ├── RollingD20.jsx        # D20 rolling animation
│   │   └── StatCard.jsx          # Reusable statistics card
│   ├── hooks/
│   │   ├── useDarkMode.js        # Dark mode state management
│   │   ├── useDecks.js           # Deck data: dirty-flag saves, full sync, realtime
│   │   └── useIsMobile.js        # Mobile detection hook (MOBILE_BREAKPOINT)
│   ├── utils/
│   │   ├── stats.js              # Constants, winRate, adjustedWinRate, tiers
│   │   └── stats.test.js         # Vitest unit tests
│   ├── views/
│   │   ├── GlobalStatsView.jsx   # Cross-player statistics page
│   │   ├── LandingPage.jsx       # Player selection screen
│   │   ├── TrackerView.jsx       # Main tracker (Dashboard/Decks) + toasts
│   │   └── tracker/              # Sub-components
│   │       ├── Btn.jsx
│   │       ├── DashboardTab.jsx
│   │       ├── DecksTab.jsx
│   │       ├── ImportPanel.jsx
│   │       └── WinLossBar.jsx
│   ├── styles/
│   │   └── theme.css             # CSS custom properties (light/dark)
│   ├── supabaseClient.js         # Supabase API client (getDecks, saveDecks)
│   └── main.jsx                  # Vite entry point
├── public/
│   ├── manifest.webmanifest      # PWA manifest
│   ├── apple-touch-icon.png
│   └── icons/                    # PWA launcher icons (192, 512)
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
- **Custom hooks**: `useDecks` for data persistence, `useDarkMode` for theming
- **Persistence**: Supabase PostgreSQL database
- **Per-player data isolation**: Decks stored with player identifier

### Routing
Hash-based routing in `App.jsx` (survives page refresh, back/forward works):
- `#/` → `LandingPage`
- `#/tracker/<player>` → `TrackerView` (individual player)
- `#/global` → `GlobalStatsView` (cross-player stats)
- Invalid hashes normalize to `#/`

### Data Layer (`useDecks` + `supabaseClient`)
- **Dirty-flag saves**: Supabase writes only fire after local mutations,
  never on load. A failed fetch keeps `loaded = false`, so saves stay
  disabled and remote data can never be wiped by a failed load.
- **Full sync**: `saveDecks(player, decks)` upserts the given decks and
  deletes rows missing from the list — local state is authoritative.
- **Realtime**: `useDecks` subscribes to `postgres_changes` filtered by
  player and refetches on remote writes (echoes of own saves suppressed
  for 1s). Requires `alter publication supabase_realtime add table public.decks;`
  (see SUPABASE_SETUP.md). `GlobalStatsView` subscribes unfiltered with a
  500ms debounced refresh.
- **Undo on delete**: deletion is local + toast with 5s "Rückgängig";
  undo reinserts locally and the debounced sync restores the DB row.

### Win Rate Ranking
- Raw win rate (`winRate`) for display, always as 0-1 number
- `adjustedWinRate` for **ranking** decks: Bayesian prior of 5 imaginary
  games at the 25% pod baseline, so small samples regress to the mean
  (a lucky 2-0 no longer outranks a proven 18-2)
- `getWinRateTier` accepts **0-1 only** (no percentage heuristic)

### Data Model
```javascript
// Deck object structure
{
  player: string,    // "baum" | "mary" | "pascal" | "wewy"
  name: string,      // Deck name (e.g., "Azorius Control")
  wins: number,      // Number of wins
  losses: number     // Number of losses
}
```

### 4-Player Pod Win Rate Context
Since this is a 4-player Commander pod:
- **>50%** = Legendary 🏆 (2x+ the 25% random average)
- **25-50%** = Good 📈 (above the 1-in-4 baseline)
- **<25%** = Struggling 📉 (below statistical average)

Color coding via `getWinRateTier()` utility:
- **Dark Green (#1e8449)** for >50% (legendary)
- **Green (#2ecc71)** for 25-50% (good)
- **Red (#e74c3c)** for <25% (struggling)

## Features

1. **Landing Page**
   - 4 player selection buttons with unique colors
   - Global statistics button (Gesamtübersicht)
   - Dark mode toggle
   - D20 triple-click easter egg (ignored on interactive elements)

2. **Tracker View (per player)**
   - Dashboard tab with win rate stats (Bayesian-ranked) and deck bars
     with 25% baseline tick
   - Decks tab with win/loss controls; unplayed decks show a neutral bar
   - Delete with 5s undo toast
   - Bulk import panel (German format: `Gewonnen IIII` / `Verloren 3`),
     reports "X neu, Y aktualisiert" on merge
   - Live updates via Supabase Realtime

3. **Global Stats View**
   - Cross-player game totals
   - Player comparison with win rate bars (25% baseline tick, tier icons)
   - Pod-share donut (win shares vs. 25% baseline)
   - Activity vs. win rate scatter with quadrant labels (dots tappable
     for details on touch devices, keyboard accessible)
   - Top 5 decks by Bayesian-adjusted win rate (min. 2 games per deck)
   - Best deck (min. 3 games) / Most played deck highlights
   - Live updates via Supabase Realtime

4. **PWA**
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

Manual testing checklist:
1. Add/remove wins and losses
2. Import decks via bulk import (check "X neu, Y aktualisiert" toast)
3. Delete a deck and undo it via the 5s toast
4. Switch between players (data isolation)
5. Refresh on `#/tracker/<player>` and `#/global` (view is restored)
6. Open two tabs on the same player; edit in one, watch the other update (Realtime)
7. Test Global Stats page loads all players
8. Test responsive layout on mobile width (<640px)
9. Test D20 easter egg (triple-click on background, NOT on buttons)
10. Toggle dark mode and reload (no light flash)

## Refactoring History

Completed in 2026-02:

| Phase | Changes |
|-------|---------|
| **Foundation** | Fixed useDarkMode hook, consolidated win rate logic, removed sample data |
| **CSS Modules** | Migrated inline styles to CSS Modules with CSS custom properties |
| **Architecture** | Extracted useDecks hook, split TrackerView into sub-components |
| **Polish** | Standardized imports, added PropTypes/JSDoc, optimized Supabase bulk operations |
| **Cleanup** | Removed duplicate `supabase.js` file, added PropTypes to all components, created `App.module.css` |

Completed in 2026-07 (see `plan.md`):

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

See git history for detailed commits:
```bash
git log --oneline --all
```

## Git Workflow Prerogatives

### Author Attribution
When making commits on behalf of the user:

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

> Note: Kimi should not push commits to the remote by default. Keep commits local and let the user push when they are ready.

## Deployment

**Vercel setup:**
1. Connect GitHub repo
2. Framework preset: "Vite"
3. Build command: `npm run build` (auto-detected)
4. Output directory: `dist` (auto-detected)
5. Add environment variables in Vercel dashboard

## Future Enhancements (Potential)

- Match history with timestamps
- Deck archetype categorization
- Win/loss streak tracking
- Head-to-head matchup records
- Seasonal statistics reset
