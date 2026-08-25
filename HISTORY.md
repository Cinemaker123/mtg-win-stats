# Refactoring History

This file records what changed and when. It is the archive of completed work.
For the rules that current code must follow, read AGENTS.md.


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

Completed in 2026-08 (TanStack Query migration, branch
`refactor/tanstack-query-migration`):

The hand-rolled fetch, cache, realtime, and optimistic-save layer was a partial
re-implementation of one library. TanStack Query replaced it.

| Phase | Changes |
|-------|---------|
| **Read path** | One `QueryClient` (main.jsx) with keys `["games"]` and `["decks"]`. `useGamesQuery` / `useDecksQuery` in `src/data/queries.js` give every view one shared cache. `AppData.jsx` and `useLiveResource.js` deleted. |
| **Realtime** | `src/data/useRealtimeSync.js`, one subscription for the app, invalidates the affected key on a change. A `decks` change invalidates both keys (the rename-join rule), guarded by a test. Replaced the two per-resource subscriptions. |
| **Write path** | Per-row deck mutations in `src/data/mutations.js` (`useAddDeck`, `useRenameDeck`, `useDeleteDeck`, `useRestoreDeck`) with optimistic cache updates and rollback. `useDecks.js` deleted. |
| **supabaseClient** | Added `deleteDeckById` and `restoreDeckRow`. Deleted `getDecks`, `saveDecks`, and `quoteFilterValue`. The full-sync delete-missing path is gone, so a bad load can no longer drive a delete. 349 to 308 lines. |
| **Result** | Two parallel deck caches became one. Two realtime subscriptions became one. The data layer dropped from about 734 to about 440 hand-rolled lines. One new dependency (`@tanstack/react-query`). |
| **Verified** | Add, delete, undo-restore, and rename each browser-tested against the live database. |

See the git history for the detailed commits:

```bash
git log --oneline --all
```

Completed in 2026-08 (review-driven cleanup):

A code review raised eight points. Most were doc or test fixes. The one
structural change is on the deck-write path.

| Item | Change |
|------|--------|
| **player_id server-side** | A `set_deck_player_id` trigger fills `decks.player_id` from the slug on insert or update (SQL in SUPABASE_SETUP.md). The client stops sending `player_id`, and the whole slug-to-id cache (`getPlayerIdMap`, `playerIdMapPromise`) is deleted. `getPlayerSlugs` now reads slugs fresh. A stale cross-tab cache can no longer write a null `player_id`. |
| **Modal tests** | `NewGameModal.test.jsx` covers the dirty-check (backdrop and Escape, touched and untouched) with Testing Library + jsdom. |
| **Docs** | AGENTS.md notes pod-only dashboards and the deliberate client-side compute bound. `stats.js` marks its StatCard view-models as presentation, not math. README points to AGENTS.md for the modal-dirtiness rule instead of restating it. |
| **Test home** | The `useRealtimeSync` cache test moved out of the theme-palette block into its own describe. |
