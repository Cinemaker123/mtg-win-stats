# Migration Plan: hand-rolled data layer → TanStack Query

This is a plan, not applied work. It describes how to replace the hand-rolled
fetch, cache, realtime, and optimistic-save machinery with TanStack Query, and
how to fold in the deck-layer simplifications discussed alongside it.

## When this is worth doing

The current data layer works and is tested. The app is small: four players,
four views, two shared resources. **Do this migration only when the app grows**
— more entities, more views sharing data, or repeated cache-invalidation bugs.
At today's size it is a lateral move. The plan exists so the path is ready when
the size justifies it.

## Why TanStack Query fits

The hand-rolled layer is a partial re-implementation of one library. The match
is close:

| Hand-rolled today | TanStack Query |
|---|---|
| `useLiveResource` fetch + loading + error | `useQuery` |
| One `AppDataProvider` sharing a cache | The `QueryClient` cache, keyed by query key |
| Double fetch and double cache of decks | Query-key dedupe removes it for free |
| `useDecks` dirty flag + debounced save | `useMutation` with `onMutate` optimistic update |
| The 5-second undo | `useMutation` rollback, or a manual inverse mutation |
| Echo suppression of own writes | Mostly unneeded: the mutation owns the local truth |

The one thing TanStack Query does **not** cover is Supabase realtime. That stays
as a small subscription that calls `queryClient.invalidateQueries` on an event.

## Dependency choice

Two options:

1. **TanStack Query alone, plus a ~15-line realtime hook.** One new dependency.
   The realtime glue is small and stays in this repo, in plain sight.
2. **TanStack Query plus `@supabase-cache-helpers`.** Two new dependencies. The
   helper wires Supabase queries, mutations, and `postgres_changes` into the
   cache, so the realtime glue disappears.

**Recommendation: option 1.** One dependency, not two, for a four-player app.
The realtime hook is short and explicit. Reach for option 2 only if the number
of realtime tables grows enough that hand-writing the glue becomes a burden.

Add:

```bash
npm install @tanstack/react-query
```

Approximate bundle cost: 12 to 15 KB gzipped, on top of the current ~110 KB.
Confirm the current figure with `npm run build` before and after.

## Target architecture

```
main.jsx
  └─ QueryClientProvider (one client for the app)

src/data/
  ├─ queries.js     # useGamesQuery, useDecksQuery — thin useQuery wrappers
  ├─ mutations.js   # useAddGame, useUpdateGame, useDeleteGame,
  │                 #   useAddDeck, useRenameDeck, useDeleteDeck
  └─ useRealtimeSync.js  # one hook: subscribe, invalidate on change

src/supabaseClient.js   # pure async fetch/write functions only, no React
```

Rules that carry over from the current design:

- **The query key is the single source of truth.** `['games']` and `['decks']`.
  Every view reads the same cache. This is what deletes the double fetch.
- **`decks` lives in one place.** `TrackerView` reads its player's slice from
  the shared `['decks']` cache, instead of a second per-player fetch.
- **The colours/tier/data-attribute rules are untouched.** This migration is the
  data layer only. It does not touch rendering, theming, or `stats.js`.

## File-by-file changes

### New files

| File | Contents |
|---|---|
| `src/data/queries.js` | `useGamesQuery()`, `useDecksQuery()`. Each is a `useQuery` with a key and the existing `supabaseClient` fetcher. |
| `src/data/mutations.js` | One `useMutation` per write. Optimistic `onMutate`, rollback `onError`, `invalidateQueries` `onSettled`. |
| `src/data/useRealtimeSync.js` | Subscribe once to `decks`, `games`, `game_participants`, `players`. On any event, `invalidateQueries`. Replaces both current subscriptions. |

### Deleted files

| File | Lines | Reason |
|---|---|---|
| `src/hooks/useLiveResource.js` | 65 | `useQuery` replaces it entirely. |
| `src/hooks/AppData.jsx` | 128 | The provider and its context are replaced by the query cache. Keep nothing but the JSDoc typedefs, moved to `queries.js`. |

### Rewritten files

| File | Before | After |
|---|---|---|
| `src/hooks/useDecks.js` | 192 lines | ~40 lines. Delete the fetch, the dirty flag, the debounced save effect, and the realtime effect. Keep `DeckPropType` (three components import it) and thin helpers over the mutations. Or delete the hook and move `DeckPropType` to `src/data/deckTypes.js`. |
| `src/hooks/useGames.js`, `useAllDecks.js` | already folded into `AppData.jsx` | The read hooks become `useGamesQuery` / `useDecksQuery` in `queries.js`. Call sites change import path only. |

### Touched files (import and call-site changes only)

| File | Change |
|---|---|
| `src/main.jsx` | Wrap the app in `QueryClientProvider`. Mount `useRealtimeSync` once at the root. |
| `src/App.jsx` | Remove `AppDataProvider`. The `QueryClientProvider` in `main.jsx` replaces it. |
| `src/views/TrackerView.jsx` | Read decks from `useDecksQuery` (its player's slice) instead of `useDecks(player)`. Call the deck mutations for add, rename, delete, undo. |
| `src/views/GlobalStatsView.jsx` | `useAppData()` → `useGamesQuery()` + `useDecksQuery()`. |
| `src/views/GamesArchiveView.jsx` | `useAppData()` → `useGamesQuery()`. Game delete and undo use the mutations. |
| `src/components/NewGameModal.jsx` | `useAppData()` → `useDecksQuery()`. Quick-add and game save use the mutations. |
| `src/views/tracker/DashboardTab.jsx`, `DecksTab.jsx`, `WinLossBar.jsx` | Update the `DeckPropType` import path if it moves. |

## How much of `supabaseClient.js` gets simpler

`supabaseClient.js` stays. It becomes **pure async functions** with no React and
no caching. TanStack Query calls them. But three functions are duplication that
the migration deletes, because the library or a sibling function already does
the job.

| Function | Fate | Why |
|---|---|---|
| `getDecks(player)` | **Delete** | One `['decks']` cache holds every player. `TrackerView` filters its slice in memory. The per-player server fetch is no longer needed. |
| `saveDecks(player, decks)` | **Delete** | The full-sync upsert-and-delete-missing is the risky path. Replace with per-row `addDeckToRegistry` (exists) and a new `deleteDeckById`. |
| `quoteFilterValue(value)` | **Delete** | Only `saveDecks` used it, to build the `not in (...)` delete filter. It leaves with `saveDecks`. |

Add one small function:

| Function | New | Why |
|---|---|---|
| `deleteDeckById(id)` | ~8 lines | Per-row delete to replace the full-sync delete. A `.delete().eq('id', id)`, the same shape as `deleteGame`. |

Net effect on `supabaseClient.js`: about **75 lines removed, 8 added**, from 349
to roughly 280. More important than the line count: the **full-sync delete path
is gone**, so a bad load can no longer drive a delete. That removes a real
silent-data-loss path, not just duplication.

Functions that stay, unchanged, as the query and mutation fetchers:

- `getGames`, `getDecksByPlayer` — the two `useQuery` fetchers.
- `addGame`, `updateGame`, `deleteGame` — game mutations (still the atomic RPCs).
- `addDeckToRegistry`, `renameDeckRegistry`, `deleteDeckById` — deck mutations.
- `addPlayer`, `getPlayerIdMap`, `getPlayerSlugs`, `unwrap` — supporting.

## Total code delta

| Area | Before | After (approx) |
|---|---|---|
| `useLiveResource.js` | 65 | 0 |
| `AppData.jsx` | 128 | 0 |
| `useDecks.js` | 192 | ~40 |
| `supabaseClient.js` | 349 | ~280 |
| New `src/data/*` | 0 | ~120 |
| **Net** | 734 | ~440 |

About 290 fewer lines of hand-rolled cache and sync code, replaced by one
dependency and thin wrappers. Two parallel deck caches become one. Two realtime
subscriptions become one.

## Realtime: the one piece the library does not give you

`useRealtimeSync` subscribes once and invalidates the affected query:

```js
// sketch — confirm the current TanStack API at implementation time
useEffect(() => {
  const channel = supabase
    .channel("app-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "decks" },
        () => queryClient.invalidateQueries({ queryKey: ["decks"] }))
    .on("postgres_changes", { event: "*", schema: "public", table: "players" },
        () => queryClient.invalidateQueries({ queryKey: ["decks"] }))
    .on("postgres_changes", { event: "*", schema: "public", table: "games" },
        () => queryClient.invalidateQueries({ queryKey: ["games"] }))
    .on("postgres_changes", { event: "*", schema: "public", table: "game_participants" },
        () => queryClient.invalidateQueries({ queryKey: ["games"] }))
    .subscribe();
  return () => supabase.removeChannel(channel);
}, [queryClient]);
```

Notes:

- The debounce is now optional. TanStack Query already dedupes refetches in a
  short window. Keep a small debounce only if the realtime event rate is high.
- Echo suppression is mostly unneeded. An optimistic mutation sets the cache
  before the write, so the echoed event re-fetches the same value.
- The `decks` table wakes the `['decks']` query, which is the rule the current
  `GAMES_TABLES` test guards. Keep an equivalent test on this subscription.

## Migration order (each step ships and passes CI on its own)

1. **Add the dependency and the provider.** Install `@tanstack/react-query`,
   wrap the app in `QueryClientProvider`. No behaviour change yet.
2. **Read path first.** Add `useGamesQuery` and `useDecksQuery`. Move
   `GamesArchiveView` and `GlobalStatsView` onto them. Delete nothing yet. Run
   both caches in parallel for one commit to confirm parity.
3. **Realtime.** Add `useRealtimeSync`. Remove the `AppData` subscriptions.
4. **Delete `AppData.jsx` and `useLiveResource.js`.** Move `NewGameModal` onto
   `useDecksQuery`.
5. **Write path.** Add the mutations. Move `TrackerView` off `useDecks` onto the
   shared `['decks']` cache plus mutations. Add `deleteDeckById`.
6. **Delete the dead code.** Remove `getDecks`, `saveDecks`, `quoteFilterValue`,
   and the gutted `useDecks` internals.
7. **Docs.** Rewrite the AGENTS.md Data Layer section: one cache, mutations,
   one realtime hook. Several current invariants disappear, because the library
   enforces them (the dirty-flag rule, the double-subscription note).

## Testing impact

- `stats.test.js` is untouched. It tests pure logic, not the data layer.
- `supabaseClient.test.js` loses the `saveDecks` and `getDecks` cases, gains a
  `deleteDeckById` case. The mock harness stays.
- The mutations want a small test each: optimistic update applied, rollback on
  error. TanStack Query is testable without a DOM.
- Keep the manual UI checklist. The two-tab realtime check is still the only
  end-to-end proof.
- Add a test that `useRealtimeSync` maps `decks` → `['decks']` and `games` →
  `['games']`, the successor to the current `GAMES_TABLES` test.

## Risks and rollback

- **Optimistic mutation correctness** is the main risk. The undo flows
  (`restoreDeck`, game delete undo) must become explicit inverse mutations. Test
  each before deleting the old path.
- **Bundle growth** of ~12 to 15 KB gzipped. Measure it. It is the price of the
  dependency.
- **Rollback**: each step is a separate commit. Steps 1 to 4 are read-only and
  reversible. The write-path step (5 to 6) is the point of no easy return, so
  land it only after the read path has run in production for a while.

## What this does not change

- `stats.js` and all statistics logic.
- Colours, theming, the data-attribute rendering rules.
- The atomic game RPCs (`save_game`, `update_game`). They stay exactly as they
  are — they are already the right abstraction.
- The frozen legacy baseline and `combineDeckStats`. Still the merge of two
  sources at read time.
