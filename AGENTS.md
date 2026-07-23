# MTG Win Stats Tracker

## Project Overview

A **React + Vite application** for tracking Magic: The Gathering deck performance statistics across multiple players. Features a mobile-friendly interface for recording wins/losses, importing deck data, and viewing cross-player analytics.

## Technology Stack

- **Framework**: React 18+ with Vite build system
- **Language**: JavaScript (JSX) with PropTypes
- **Styling**: CSS Modules with CSS custom properties
- **Storage**: Supabase (PostgreSQL backend) for shared data across players
- **Fonts**: Google Fonts (Outfit, DM Sans) loaded via CSS @import
- **Build Tool**: Vite with Hot Module Replacement

## File Structure

```
mtg win stats vercel/
├── src/
│   ├── App.jsx                    # Main router ✅
│   ├── App.module.css             # App root styles ✅
│   ├── components/
│   │   ├── D20.jsx               # D20 die display component ✅
│   │   ├── DarkModeToggle.jsx    # Dark mode toggle button ✅
│   │   ├── Logo.jsx              # MTG logo component ✅
│   │   ├── RollingD20.jsx        # D20 rolling animation ✅
│   │   ├── StatCard.jsx          # Reusable statistics card ✅
│   │   └── primitives/           # UI primitives ✅
│   │       ├── Button.jsx
│   │       ├── IconButton.jsx
│   │       ├── Card.jsx
│   │       └── index.js
│   ├── hooks/
│   │   ├── useDarkMode.js        # Dark mode state management
│   │   ├── useDecks.js           # Deck data management ✅
│   │   └── useIsMobile.js        # Mobile detection hook
│   ├── utils/
│   │   └── stats.js              # Constants, winRate, getDynamicStats
│   ├── views/
│   │   ├── GlobalStatsView.jsx   # Cross-player statistics page
│   │   ├── LandingPage.jsx       # Player selection screen
│   │   ├── TrackerView.jsx       # Main tracker (Dashboard/Decks)
│   │   └── tracker/              # Sub-components ✅
│   │       ├── Btn.jsx
│   │       ├── DashboardTab.jsx
│   │       ├── DecksTab.jsx
│   │       ├── ImportPanel.jsx
│   │       └── WinLossBar.jsx
│   ├── styles/
│   │   └── theme.css             # CSS custom properties ✅
│   ├── supabaseClient.js         # Supabase API client
│   └── main.jsx                  # Vite entry point
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
Simple view-based routing in `App.jsx`:
- `view === 'landing'` → `LandingPage`
- `view === 'tracker'` → `TrackerView` (individual player)
- `view === 'global'` → `GlobalStatsView` (cross-player stats)

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

2. **Tracker View (per player)**
   - Dashboard tab with win rate stats
   - Decks tab with win/loss controls
   - Bulk import panel (German format: `Gewonnen IIII` / `Verloren 3`)
   - D20 triple-click easter egg

3. **Global Stats View**
   - Cross-player game totals
   - Player comparison with win rate bars
   - Top 5 decks by win rate
   - Best deck / Most played deck highlights

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
- Dynamic values (player colors, win rate percentages) remain inline

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

Manual testing checklist:
1. Add/remove wins and losses
2. Import decks via bulk import
3. Delete decks
4. Switch between players (data isolation)
5. Test Global Stats page loads all players
6. Test responsive layout on mobile width (<640px)
7. Test D20 easter egg (triple-click)

## Refactoring History

Completed in 2026-02:

| Phase | Changes |
|-------|---------|
| **Foundation** | Fixed useDarkMode hook, consolidated win rate logic, removed sample data |
| **CSS Modules** | Migrated all inline styles to CSS Modules with CSS custom properties |
| **Architecture** | Extracted useDecks hook, split TrackerView into sub-components, created UI primitives |
| **Polish** | Standardized imports, added PropTypes/JSDoc, optimized Supabase bulk operations |
| **Cleanup** | Removed duplicate `supabase.js` file, added PropTypes to all components, created `App.module.css` |

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
