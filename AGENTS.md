# MTG Win Stats Tracker

## Project Overview

This is a **single-file React application** for tracking Magic: The Gathering (MTG) deck performance statistics. The application provides a simple, mobile-friendly interface for recording wins/losses per deck and viewing aggregated performance analytics.

The project is intentionally minimal — it consists of a single JSX file that can be deployed directly to Vercel or similar platforms without a build step (using a React runtime like Babel standalone or pre-compiled by the hosting platform).

## Technology Stack

- **Framework**: React 18+ (using hooks: `useState`, `useEffect`)
- **Language**: JavaScript (JSX)
- **Styling**: Inline styles (CSS-in-JS approach)
- **Storage**: Browser localStorage (via `window.storage` API)
- **Fonts**: Google Fonts (Outfit, DM Sans) loaded via CSS @import
- **No Build Tools**: Direct JSX execution (no webpack, vite, etc. required)

## File Structure

```
mtg win stats vercel/
├── mtg.jsx              # Single-file React application (all code)
├── .github/
│   └── copilot-instructions.md   # AI agent guidance (legacy/initial)
└── AGENTS.md            # This file — project documentation for AI agents
```

**Note**: The entire application is contained within `mtg.jsx`. There is no `package.json`, `node_modules/`, or build configuration.

## Architecture

### Component Structure (all in `mtg.jsx`)

| Component | Purpose |
|-----------|---------|
| `App` (default export) | Main application container, state management |
| `useIsMobile` | Custom hook for responsive design |
| `StatCard` | Reusable statistics display card |
| `getDynamicStats` | Analytics calculation function |
| `Btn` | Reusable button component |
| `WinLossBar` | Deck row with win/loss bar and controls |

### State Management

- **Local React state** via `useState` hooks
- **Persistence**: `localStorage` via `window.storage` API
- **Initial data**: `SAMPLE_DECKS` constant provides demo data

### Data Model

```javascript
// Deck object structure
{
  name: string,      // Deck name (e.g., "Azorius Control")
  wins: number,      // Number of wins
  losses: number     // Number of losses
}
```

## Features

1. **Dashboard Tab**
   - Overall win rate statistics
   - Best performing deck highlight
   - Deck needing improvement (lowest win rate)
   - Least played deck indicator
   - Visual bar chart of all decks

2. **Decks Tab**
   - List all decks with win/loss bars
   - Increment/decrement win/loss counters
   - Delete decks
   - Bulk import from text format

3. **Bulk Import**
   - Supports German format: `Gewonnen IIII` / `Verloren II`
   - Updates existing decks by name (case-insensitive)
   - Creates new decks if not found

## Import Format

The bulk import feature expects this format:

```
Deck Name
Gewonnen IIIIII
Verloren III

Another Deck
Gewonnen IIII
Verloren IIIII
```

- `Gewonnen` = Wins (I characters count as tally marks)
- `Verloren` = Losses (I characters count as tally marks)
- Blank lines separate decks

## Development

### No Build Required

This project has **no build process**. The JSX file can be:
1. Deployed directly to Vercel
2. Served with a simple HTML wrapper using Babel standalone
3. Pre-compiled by a hosting platform's JSX transformer

### Running Locally

Since there's no `package.json`, you'll need to serve the file through a platform that supports JSX:

**Option 1: Vercel**
```bash
vercel dev
```

**Option 2: Simple HTML wrapper**
```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" src="mtg.jsx"></script>
</body>
</html>
```

## Code Style Guidelines

- **Inline styles**: All styling is done via inline `style` props (no CSS files)
- **Functional components**: All components are function components
- **Hooks pattern**: Uses `useState`, `useEffect` for state and side effects
- **Naming**: camelCase for functions/variables, PascalCase for components
- **No external UI libraries**: Pure React + inline styles

## Storage API

The app expects a `window.storage` object with:
- `window.storage.get(key)` → returns Promise resolving to `{ value: string }`
- `window.storage.set(key, value)` → returns Promise

On Vercel, this is typically provided by their storage adapter. For local development, you may need to polyfill:

```javascript
window.storage = {
  get: (k) => Promise.resolve({ value: localStorage.getItem(k) }),
  set: (k, v) => { localStorage.setItem(k, v); return Promise.resolve(); }
};
```

## Testing

There are **no automated tests** currently. Manual testing checklist:

1. Add/remove wins and losses
2. Import decks via bulk import
3. Delete decks
4. Refresh page to verify persistence
5. Test responsive layout on mobile width (<640px)

## Deployment

The project name suggests deployment to **Vercel**. Typical setup:

1. Connect GitHub repo to Vercel
2. Framework preset: "Other" (no build framework)
3. Root directory: `/`
4. Output directory: `/` (static)

## Future Enhancements (Potential)

Based on current architecture, potential additions:
- Multi-language support (currently supports German import format)
- Export functionality (JSON/CSV)
- Match history with timestamps
- Deck archetype categorization
- Cloud sync beyond localStorage
