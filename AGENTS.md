# MTG Win Stats Tracker

## Project Overview

A **React + Vite application** for tracking Magic: The Gathering deck performance statistics across multiple players. Features a mobile-friendly interface for recording wins/losses, importing deck data, and viewing cross-player analytics.

## Technology Stack

- **Framework**: React 18+ with Vite build system
- **Language**: JavaScript (JSX)
- **Styling**: CSS Modules (scoped, colocated styles per component)
- **Storage**: Supabase (PostgreSQL backend) for shared data across players
- **Fonts**: Google Fonts (Outfit, DM Sans) loaded via CSS @import
- **Build Tool**: Vite with Hot Module Replacement

## File Structure

```
mtg win stats vercel/
├── src/
│   ├── App.jsx                    # Main router (100 lines)
│   ├── components/
│   │   ├── D20.jsx               # D20 die display component
│   │   ├── DarkModeToggle.jsx    # Dark mode toggle button
│   │   ├── Logo.jsx              # MTG logo component
│   │   ├── RollingD20.jsx        # D20 rolling animation
│   │   └── StatCard.jsx          # Reusable statistics card
│   ├── hooks/
│   │   ├── useDarkMode.js        # Dark mode state management
│   │   └── useIsMobile.js        # Mobile detection hook
│   ├── utils/
│   │   └── stats.js              # Constants, winRate, getDynamicStats
│   ├── views/
│   │   ├── GlobalStatsView.jsx   # Cross-player statistics page
│   │   ├── LandingPage.jsx       # Player selection screen
│   │   └── TrackerView.jsx       # Main tracker (Dashboard/Decks)
│   ├── supabaseClient.js         # Supabase API client
│   └── main.jsx                  # Vite entry point
├── index.html
├── package.json
├── vite.config.js
├── .env.example                  # Supabase credentials template
├── SUPABASE_SETUP.md             # Setup instructions
└── AGENTS.md                     # This file
```

## Architecture

### State Management
- **Local React state** via `useState` hooks
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

Update color coding and thresholds accordingly:
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

- **CSS Modules**: Each component has a colocated `.module.css` file
  - Use `camelCase` for class names (e.g., `.playerCard`, `.winRateBar`)
  - Dynamic values (theme-dependent colors) still use inline styles where necessary
  - Keep CSS custom properties (variables) in a global `theme.css` for consistency
- **Functional components**: All components are function components
- **Hooks pattern**: Uses `useState`, `useEffect`, `useMemo`, `useRef`
- **Naming**: camelCase for functions/variables, PascalCase for components
- **No external UI libraries**: Pure React + CSS Modules

## Git Workflow Prerogatives

### Author Attribution
When making commits on behalf of the user:

1. **Before committing**, set Git user to "Kimi":
   ```bash
   git config user.name "Kimi"
   git config user.email "kimi@kimi.co"
   ```

2. **Make and push the commit** as usual

3. **After committing**, restore the original user:
   ```bash
   git config user.name "pascal müller"
   git config user.email "54896623+Cinemaker123@users.noreply.github.com"
   ```

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

---
---

# Refactoring Roadmap

This section documents identified technical debt and planned refactoring opportunities. Items are ordered by **optimal execution sequence** - some tasks depend on others being completed first.

> **Core Principle:** Refactor the "shell" (how components look) before the "internals" (how they work). This prevents rework and reduces noise in subsequent changes.

---

## Phase 1: Foundation (Do These First)

These items have no dependencies and enable later refactoring. Do them in order.

### 1. Fix `useDarkMode` Hook
**File:** `src/hooks/useDarkMode.js`  
**Effort:** Small  
**Prerequisite for:** CSS Modules migration (theme switching)

**Issue:** Currently a stub that returns hardcoded values. Dark mode persistence doesn't work.

**Implementation:**
```javascript
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  
  return [isDark, setIsDark, true];
}
```

**Note:** The `data-theme` attribute on `<html>` enables CSS custom property switching for dark/light modes.

---

### 2. Consolidate Win Rate Color Logic
**Files:** `src/utils/stats.js`, `src/views/TrackerView.jsx`, `src/views/GlobalStatsView.jsx`  
**Effort:** Small  
**Prerequisite for:** None (pure utility, safe anytime)

**Issue:** Win rate tier logic (>50% legendary, 25-50% good, <25% struggling) is duplicated across files with slight inconsistencies.

**Implementation:**
```javascript
// src/utils/stats.js
export const WIN_RATE_TIERS = {
  LEGENDARY: { threshold: 0.5, color: '#1e8449', icon: '🏆', label: 'legendary' },
  GOOD: { threshold: 0.25, color: '#2ecc71', icon: '📈', label: 'good' },
  STRUGGLING: { threshold: 0, color: '#e74c3c', icon: '📉', label: 'struggling' },
};

export function getWinRateTier(winRate) {
  if (winRate > 0.5) return WIN_RATE_TIERS.LEGENDARY;
  if (winRate >= 0.25) return WIN_RATE_TIERS.GOOD;
  return WIN_RATE_TIERS.STRUGGLING;
}
```

---

### 3. Remove `SAMPLE_DECKS` from Production
**File:** `src/views/TrackerView.jsx` (line 107)  
**Effort:** Small  
**Prerequisite for:** Extract `useDecks` hook (cleaner initial state)

**Issue:** Sample data flashes briefly before real data loads from Supabase.

**Implementation:**
- Change `useState(SAMPLE_DECKS)` to `useState([])`
- Ensure loading spinner shows during initial fetch
- Optional: Add empty state UI for new players

---

## Phase 2: CSS Modules Migration (The Big Architectural Change)

Complete this entire phase before moving to Phase 3. Mixing CSS Modules with component splitting creates confusion.

### 4. CSS Modules - Phase 1: Setup
**Files:** New files only  
**Effort:** Small  
**Prerequisite for:** All component CSS migrations

**Tasks:**
1. **Create `src/styles/theme.css`** with CSS custom properties:
```css
:root {
  --color-bg: #f4f6fb;
  --color-card: #ffffff;
  --color-text: #1a1a2e;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-card: 0 1px 12px rgba(0,0,0,0.07);
  /* ... etc */
}

[data-theme="dark"] {
  --color-bg: #1a1a2e;
  --color-card: #252536;
  --color-text: #f0f0f0;
  --shadow-card: 0 1px 12px rgba(0,0,0,0.3);
  /* ... etc */
}
```

2. **Import theme in `main.jsx`** (or `index.html`)
3. **Verify Vite CSS Modules config** (usually works by default)

---

### 5. CSS Modules - Phase 2: Components
**Files:** `src/components/*.module.css`  
**Effort:** Medium  
**Migration order:** Least dependent first

| Order | Component | Notes |
|-------|-----------|-------|
| 1 | `StatCard` | Simple, also fixes the duplicate `StatCard` in `GlobalStatsView` |
| 2 | `DarkModeToggle` | Icon button patterns |
| 3 | `Logo` | Minimal styles, quick win |
| 4 | `D20` + `RollingD20` | Keep animation styles inline (dynamic), static styles to CSS |

**Pattern for each component:**
```jsx
// Component.jsx
import styles from './Component.module.css';

// Before: style={{ background: isDark ? '#252536' : '#fff' }}
// After:  className={styles.card} (CSS handles theme via vars)
```

**Note on `StatCard`:** The inline `StatCard` in `GlobalStatsView` (lines 120-152) should be removed during this step, using the shared component from `src/components/` instead.

---

### 6. CSS Modules - Phase 3: Views
**Files:** `src/views/*.module.css`  
**Effort:** Large  
**Migration order:** Simplest to most complex

| Order | View | Complexity |
|-------|------|------------|
| 1 | `LandingPage` | Player grid, hover states |
| 2 | `GlobalStatsView` | Tables, stat cards, already has StatCard migrated |
| 3 | `TrackerView` | Tabs, import panel, WinLossBar — most complex |

**Key patterns:**
- Use CSS `:hover` instead of `onMouseEnter/Leave`
- Use CSS variables for theme-dependent colors
- Keep inline styles only for dynamic values (player colors, `width: ${x}%`)

---

### 7. CSS Modules Cleanup
**Files:** All migrated components  
**Effort:** Small  
**Do this immediately after Phases 4-6**

**Tasks:**
- Remove unused inline style objects
- Delete `onMouseEnter`/`onMouseLeave` handlers that only toggle styles
- Remove `isDark` ternary conditionals where CSS variables handle it
- Verify no inline styles remain except for truly dynamic values

---

## Phase 3: Component Architecture (After CSS is Stable)

Now that components have their visual "shell" defined via CSS Modules, refactor their internal logic.

### 8. Extract `useDecks` Hook
**Source:** `src/views/TrackerView.jsx` (lines 106-186)  
**Effort:** Medium  
**Prerequisite:** CSS Modules complete (cleaner separation of concerns)

**Rationale:** Extracting logic is cleaner when the component's visual structure isn't changing simultaneously.

**Implementation:**
```javascript
// src/hooks/useDecks.js
export function useDecks(player) {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const incrementWin = (deckName) => { ... };
  const decrementWin = (deckName) => { ... };
  const deleteDeck = (deckName) => { ... };
  const importDecks = (text) => { ... };
  
  return { decks, loading, error, incrementWin, decrementWin, deleteDeck, importDecks };
}
```

---

### 9. Split `TrackerView` into Sub-Components
**Source:** `src/views/TrackerView.jsx` (454 lines)  
**Effort:** Large  
**Prerequisites:** CSS Modules + `useDecks` hook

**New structure:**
```
src/views/tracker/
├── TrackerView.jsx          # Container: data, tab state, layout
├── TrackerView.module.css   # Main layout styles
├── DashboardTab.jsx         # Stats cards, deck list
├── DashboardTab.module.css  # Dashboard-specific styles
├── DecksTab.jsx             # Win/loss controls
├── DecksTab.module.css      # Deck list styles
├── ImportPanel.jsx          # Bulk import UI
├── ImportPanel.module.css   # Import panel styles
└── WinLossBar.jsx           # Individual deck row
└── WinLossBar.module.css    # Win/loss bar styles
```

**Note:** `WinLossBar` currently exists as an internal component in `TrackerView.jsx`. Extract it properly here.

---

### 10. Create UI Primitives
**Files:** New `src/components/ui/` directory  
**Effort:** Medium  
**Prerequisite:** All CSS migrations (so you know the patterns)

**Why wait until now:** You need to see the patterns that emerged from CSS Modules migration before abstracting them.

**Components:**
| Component | Purpose | Derived from |
|-----------|---------|--------------|
| `Button` | Primary/secondary/icon variants | Button patterns in `TrackerView` |
| `Card` | Base card with consistent shadow/radius | `.card` classes from migration |
| `IconButton` | Back button, delete button | Header buttons, delete in `WinLossBar` |
| `LoadingSpinner` | Standardized loading | Spinner in `TrackerView` and `GlobalStatsView` |
| `Toast` | Import message notifications | Import message toast in `TrackerView` |

---

## Phase 4: Polish (When Code Structure is Stable)

Do these last - they touch many files and create merge conflicts if done earlier.

### 11. Standardize Import Order
**Files:** All JS files  
**Effort:** Small (but touches everything)

**Pattern:**
```javascript
// 1. React imports
import { useState, useEffect } from "react";

// 2. Third-party imports
import { createClient } from '@supabase/supabase-js';

// 3. Absolute internal imports (hooks, utils, components)
import { useIsMobile } from "../hooks/useIsMobile.js";
import { getWinRateTier } from "../utils/stats.js";
import { StatCard } from "../components/StatCard.jsx";

// 4. Relative imports (sibling files)
import styles from "./Component.module.css";
import { SubComponent } from "./SubComponent.jsx";
```

---

### 12. Add PropTypes or JSDoc Types
**Files:** All component files  
**Effort:** Medium  
**Prerequisite:** All structural changes complete (interfaces are now stable)

**Example:**
```javascript
/**
 * @param {Object} props
 * @param {string} props.player - Player identifier (baum|mary|pascal|wewy)
 * @param {() => void} props.onBack - Back button handler
 * @param {boolean} props.isDark - Dark mode state
 */
export function TrackerView({ player, onBack, isDark }) { ... }
```

---

### 13. Accessibility Improvements
**Files:** All interactive components  
**Effort:** Medium  

**Tasks:**
- Add `aria-label` to all icon-only buttons
- Ensure `:focus-visible` styles are visible (CSS Modules makes this easy)
- Add keyboard navigation (Arrow keys for tabs, Escape for panels)
- Verify color contrast for win rate indicators

---

### 14. Optimize Supabase Operations
**File:** `src/supabaseClient.js` (lines 47-77)  
**Effort:** Small  
**Independent:** Can be done anytime, but later is fine

**Issue:** `saveDecks` uses sequential `upsert` in a loop (N+1 queries).

**Options:**
- Use `Promise.all()` for parallel upserts (quick win)
- Check if Supabase supports bulk upsert
- Add optimistic updates for better UX

---

## Summary: Recommended Order

| Phase | Order | Item | Est. Effort |
|-------|-------|------|-------------|
| **1: Foundation** | 1 | ~~Fix `useDarkMode` hook~~ ✅ | Small | Done |
| | 2 | ~~Consolidate win rate logic~~ ✅ | Small | Done |
| | 3 | ~~Remove `SAMPLE_DECKS`~~ ✅ | Small | Done |
| **2: CSS Migration** | 4 | CSS Modules Phase 1: Setup | Small |
| | 5 | CSS Modules Phase 2: Components | Medium |
| | 6 | CSS Modules Phase 3: Views | Large |
| | 7 | CSS Modules Cleanup | Small |
| **3: Architecture** | 8 | Extract `useDecks` hook | Medium |
| | 9 | Split `TrackerView` | Large |
| | 10 | Create UI primitives | Medium |
| **4: Polish** | 11 | Standardize import order | Small |
| | 12 | Add PropTypes/JSDoc | Medium |
| | 13 | Accessibility improvements | Medium |
| | 14 | Optimize Supabase | Small |

---

## Refactoring Principles

1. **Shell before internals** - CSS/styling before logic extraction
2. **Complete each phase before starting the next** - Don't mix CSS migration with component splitting
3. **One component per commit** - Easier to bisect if issues arise
4. **Preserve behavior** - All existing functionality should work identically after each step
5. **Test on mobile** - Layout changes must be verified at <640px width
6. **Keep dynamic values inline** - Player colors, percentages stay as `style` props
7. **Use CSS variables for theming** - Dark/light mode via `data-theme` attribute
8. **Update this document** - Mark items as complete when done
