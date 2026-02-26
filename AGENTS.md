# MTG Win Stats Tracker

## Project Overview

A **React + Vite application** for tracking Magic: The Gathering deck performance statistics across multiple players. Features a mobile-friendly interface for recording wins/losses, importing deck data, and viewing cross-player analytics.

## Technology Stack

- **Framework**: React 18+ with Vite build system
- **Language**: JavaScript (JSX)
- **Styling**: Inline styles (CSS-in-JS approach)
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

- **Inline styles**: All styling via inline `style` props (no CSS files)
- **Functional components**: All components are function components
- **Hooks pattern**: Uses `useState`, `useEffect`, `useMemo`, `useRef`
- **Naming**: camelCase for functions/variables, PascalCase for components
- **No external UI libraries**: Pure React + inline styles

## Git Workflow Prerogatives

### Author Attribution
When making commits on behalf of the user:

1. **Before committing**, set Git user name to "Kimi":
   ```bash
   git config user.name "Kimi"
   ```

2. **Make and push the commit** as usual

3. **After committing**, restore the original user name:
   ```bash
   git config user.name "pascal müller"
   ```

The email should remain unchanged (your GitHub noreply email) throughout.

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
