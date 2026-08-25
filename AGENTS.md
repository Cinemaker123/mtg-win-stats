# MTG Win Stats Tracker — Agent Guide

This file holds the **invariants**: the rules that must stay true, and that the
code alone does not tell you. Break one and nothing throws an error. The data
goes wrong in silence.

Everything else lives elsewhere:

| Question | File |
|---|---|
| What does the app do? How do I run it? | `README.md` |
| What changed in past refactors? | `HISTORY.md` |
| What is still planned? | `progress.md` |
| What is the database schema? | `SUPABASE_SETUP.md` |
| How is it secured? | `auth.md` |
| Where does this symbol live? | `graphify query "<question>"` |

## Layout

`graphify` holds the current file map. Run `graphify query "<question>"` instead
of reading a tree that goes stale. The parts that are not obvious:

```
src/
├── App.jsx                  # Hash router (#/, #/tracker/<player>, #/global, #/games)
├── supabaseClient.js        # Every query. All of them go through unwrap()
├── hooks/
│   ├── AppData.jsx          # AppDataProvider + useAppData. Mounted once
│   ├── useLiveResource.js   # One fetch + one debounced realtime channel
│   └── useDecks.js          # Deck registry: dirty-flag saves, full sync
├── utils/stats.js           # Statistics only. Holds no colours
└── styles/theme.css         # Every colour in the app, each one exactly once
```

## Routing

`App.jsx` uses hash-based routing, so a page refresh and the back button both
work. An invalid hash normalizes to `#/`.

- `#/` → `LandingPage`
- `#/tracker/<player>` → `TrackerView`
- `#/global` → `GlobalStatsView`
- `#/games` → `GamesArchiveView`


## State Management

- **Local React state** through `useState` hooks.
- **Custom hooks**: `useDecks` holds the registry of the player who edits.
  `useDarkMode` holds the theme.
- **One provider, mounted once in `App.jsx`**: `AppDataProvider` holds the games
  archive and the deck registry of every player. It calls `useLiveResource()`
  once per resource, which owns the fetch, the debounced realtime channel, and
  the cleanup. Views read everything through the single `useAppData()` hook.
  **`AppDataProvider` must stay mounted exactly once, at the app root.** `useLiveResource` is a hook and holds per-instance state, so a
  call from a view opens a second fetch and a second realtime channel. A new
  shared resource needs a fetcher and a table list, not a new subscription.
- **Persistence**: a Supabase PostgreSQL database.
- **Per-player rows, not per-player access**: each deck row stores a player
  identifier. This is a data-shape convention, **not** a security boundary.
  `db/level1_rls.sql` enables RLS but grants `anon` allow-all policies on all
  four tables, so any holder of the anon key reads and writes every player's
  rows. Do not treat the player column as an access control. Real per-player
  auth is Level 3 in `auth.md`, and it is not applied.


## Data Layer (`useDecks` + `useAppData` + `supabaseClient`)

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
  no dirty flag. `addGame` and `updateGame` go through the `save_game` and
  `update_game` Postgres functions (`supabase.rpc`), which write the game and
  its participants in **one transaction**. The client cannot write a half-game.
  `update_game` replaces all participants. The definitions live in
  SUPABASE_SETUP.md. Apply them once in the SQL editor.
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
  1 second. In `AppDataProvider`, the games resource subscribes to `games`,
  `game_participants`, and `decks`. The decks resource subscribes to `decks` and
  `players`. Both get the 500 ms debounced refetch from `useLiveResource()`, so
  every view reads the same cache instead of a separate fetch and subscription.
  The games list includes `decks` because a deck rename now touches only the
  `decks` table (see above). Without it, the cached `games` join would keep the
  old name until a reload. This needs the tables in the `supabase_realtime`
  publication (see SUPABASE_SETUP.md).
- **Bulk deck fetch**: `getDecksByPlayer()` fetches the decks of every player in
  one unfiltered query and groups them. It guarantees one entry per player in
  `PLAYERS`. **Only** `AppDataProvider` calls it. `GlobalStatsView` and
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
- **Deck ids in the cache**: each entry in the `decksByPlayer` cache carries
  its `id`. `NewGameModal` resolves the `deck_id` of each participant out of the
  cache by name. `addDeckLocally` throws if a deck arrives without an id, so an
  optimistic quick-add can no longer save a game with a null `deck_id`.
- **Error handling**: every query in `supabaseClient.js` goes through
  `unwrap(result, context)`. This function logs with that context and rethrows.
  Add a new query the same way. Do not re-inline the
  `if (error) { console.error; throw }` block.


## Win Rate Ranking

- Raw win rate (`winRate`) is for display. It is always a 0-1 number.
- `adjustedWinRate` is for the **ranking** of decks. It uses a Bayesian prior of
  10 imaginary games at the 25% pod baseline. As a result, a small sample
  regresses to the mean, and a lucky 2-0 no longer outranks a proven 18-2.
- `getWinRateTier` throws a `RangeError` outside 0-1, so a percentage or a
  NaN crashes instead of mislabeling a tier. A test covers it.
- `MIN_GAMES_FOR_BEST_DECK` (2 games) gates the "best" and "worst" deck. Both
  the dashboard and Global Stats import the one constant, so they cannot
  disagree.


## Data Model

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


## 4-Player Pod Win Rate Context

This is a 4-player Commander pod. The random average is 25%:

- **More than 50%** = Legendary 🏆 (2x or more the 25% random average)
- **25-50%** = Good 📈 (more than the 1-in-4 baseline)
- **Less than 25%** = Struggling 📉 (less than the statistical average)

`getWinRateTier()` returns the tier name, the icon and the label. It reads
`WIN_RATE_TIERS` in `utils/stats.js`, which holds the thresholds only. The
thresholds derive from `POD_BASELINE_WR`, not from hardcoded values, so they
follow `PLAYERS.length`.

The colors live in `theme.css`. A component puts the tier name on an element
as `data-tier` and the stylesheet resolves `--tier-color` and
`--tier-gradient`:

- **Gold** for more than 50% (legendary 🏆)
- **Sage green** for 25-50% (good 📈)
- **Crimson** for less than 25% (struggling 📉)

## Feature Invariants

Three rules live in feature behaviour rather than in the data layer. Each one
fails silently.

- **The new-game modal derives dirtiness, it does not track it.** The backdrop
  and Escape close the modal only while the form is untouched. After any input,
  both go inert, and "Abbrechen" is the only way out. The modal diffs the live
  state against `initialFormState`, a snapshot of the opening state, so a new
  field is covered automatically. Do not replace this with a `dirty` flag that
  each handler must remember to set. A stray backdrop tap used to discard a
  fully entered game with no undo.
- **"Spiele insgesamt" is the highest per-player total, not `games.length`.**
  A legacy pre-v2 game survives only as a frozen counter on `decks`, with no row
  in `games`. As a result, `games.length` undercounts. This figure is also not a
  pod win rate: with one winner per game, that number is pinned near
  1/pod-size and says nothing the 25% baseline does not already say.
- **A deck rename is one row update.** `renameDeckRegistry(id, name)` writes the
  `decks` row. Game history points at the same `deck_id`, so the new name
  appears everywhere through the join. Do not add a propagation write across
  `game_participants`.

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

### Colors — CSS only, never in JavaScript

**No JavaScript file holds a color.** No hex, no `rgba()`, no gradient string.
Every value lives in `theme.css` exactly once.

Components pass identity to CSS through a data attribute, and the stylesheet
resolves it into a custom property:

| Attribute | Set from | Resolves |
|---|---|---|
| `data-player` | A player slug | `--player-accent`, `--player-gradient` |
| `data-tier` | `getWinRateTier().tier` | `--tier-color`, `--tier-gradient` |
| `data-accent` | A `StatCard` accent token | `--card-accent` |

This works for SVG too. `<g data-player={slug}>` with `fill="var(--player-accent)"`
replaces a color lookup in JavaScript.

The player palette is a closed set. The four pod players each get a rule. The
bare `[data-player]` rule is the fallback, and every player added later shares
it, no matter how many there are. They appear in the games archive but not in
any statistic, so a distinct color would imply a standing they do not have.

To change a color, edit `theme.css`. Never add a color constant back to
`stats.js`.

A test enforces this. `stats.test.js` scans every `.js` and `.jsx` file under
`src/` for a hex or `rgba()` literal and fails with the offending file name.
The pre-commit hook runs it, so this rule cannot rot.

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
- **Constants**: UPPER_SNAKE_CASE (`WIN_RATE_TIERS`)

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

## Git Workflow Prerogatives

**The pre-commit hook is the gate.** `scripts/precheck.sh` runs lint, test and
build, then refreshes the graph and the wiki. Never weaken it to make a commit
pass. Use `git commit --no-verify` for a one-off, and fix the cause.

The build step is not redundant with lint. It is the only check that catches a
deleted export that another file still imports.

`graphify update .` does not refresh the wiki. The export must run after it, or
`graphify-out/wiki/` silently describes old code.


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
