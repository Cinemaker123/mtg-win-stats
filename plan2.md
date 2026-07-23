# Plan 2: Match-Based Game Entry, Archive & Data Model v2

Status: **DRAFT — awaiting approval. No code changes yet.**

Core change: results are entered as **games** (one event: participants + decks + winner + date)
instead of per-deck +/- counters. This unlocks history, dates, editing, and later
head-to-head / over-time stats.

Decisions made for the user (flag on review if you disagree):
- Two new tables: `games` + `game_participants` (winner is a flag on the participant).
- Old `decks.wins/losses` counters become a **frozen legacy baseline** — no data
  transformation, stats = legacy + game-derived counts. Zero-downtime migration.
- Winner selection: tap the player's field (border in player color + 👑 badge).
- Archive lives at `#/games`, entry via a 📜 button in the GlobalStatsView header
  and from the landing page.
- Head-to-head matrix / over-time charts are **follow-ups**, not in this plan
  (trivially computable once games exist).

---

## 1. Database schema (SQL for the Supabase SQL Editor)

```sql
-- ============================================================
-- MTG Win Stats — Data Model v2 (match-based game entry)
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1) Games: one row per played game
create table public.games (
  id         uuid primary key default gen_random_uuid(),
  played_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 2) Participants: one row per player per game (2-4 per game)
create table public.game_participants (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  player     text not null,
  deck       text not null,
  is_winner  boolean not null default false
);

create index game_participants_game_id_idx on public.game_participants (game_id);
create index game_participants_player_idx  on public.game_participants (player);

-- 3) RLS: match the decks table setup (no auth → allow all).
--    If RLS is disabled on decks, disable it here too:
alter table public.games disable row level security;
alter table public.game_participants disable row level security;
--    (If you instead use the "Allow all" policy pattern from SUPABASE_SETUP.md:
--     create policy "Allow all" on public.games for all using (true) with check (true);
--     create policy "Allow all" on public.game_participants for all using (true) with check (true);)

-- 4) Realtime for live updates across devices
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_participants;

-- 5) The decks table becomes a pure deck registry.
--    Existing wins/losses stay as the FROZEN legacy baseline;
--    the app no longer increments them. Stats = legacy + games.
comment on column public.decks.wins   is 'Legacy baseline (pre-games era), frozen';
comment on column public.decks.losses is 'Legacy baseline (pre-games era), frozen';
```

## 2. Migration plan for existing data

No rows are transformed — the old counters simply freeze:

1. **Backup first**: Supabase Dashboard → Table Editor → `decks` → export CSV
   (or `create table decks_backup_20260723 as select * from decks;`).
2. Run the schema SQL above.
3. Deploy the new app version. Stats everywhere show **legacy + game-derived**
   combined counts, so totals are identical to before until the first new game
   is entered.
4. Sanity check: each player's Gesamt-Winrate and per-deck W/L must match the
   pre-migration values exactly.
5. Old app versions still work against the `decks` table (their +/- taps would
   move the legacy counters and double-count conceptually) — acceptable during
   the transition since all 4 players use the same deployed URL; after deploy,
   nobody should use the old +/- controls because they won't exist anymore.

Rejected alternative: synthesizing one `games` row per past win/loss. It would
invent fake dates and opponents, polluting every future time-based stat.
The frozen-baseline approach keeps history honest: game-level detail starts
from the migration date.

## 3. Data layer changes

- **`src/supabaseClient.js`** — add:
  - `getGames()` → games with nested participants, ordered by `played_at` desc
  - `addGame({ playedAt, participants })` → insert game + participants
  - `updateGame(id, { playedAt, participants })` → update `played_at`,
    delete + reinsert participants (simplest consistent write)
  - `deleteGame(id)` → delete game (participants cascade)
  - `addDeckToRegistry(player, name)` → insert deck row with 0/0 legacy counts
    (used by quick-add; the existing full-sync `saveDecks` stays for delete)
- **New hook `src/hooks/useGames.js`** — fetch games on mount, realtime
  subscription on `games` + `game_participants` (debounced refetch, same
  pattern as `useDecks`), expose `{ games, loading, error, addGame, updateGame, deleteGame }`.
- **Merge util in `src/utils/stats.js`** —
  `combineDeckStats(legacyDecks, games, player)` → deck list where each deck's
  `wins/losses` = legacy baseline + counts derived from `game_participants`.
  Decks that exist only in games (e.g. deleted from registry) still appear.
- All stats functions (`getDynamicStats`, `adjustedWinRate`, tier logic,
  GlobalStatsView memo) receive **combined** counts and stay unchanged.
- `useDecks` shrinks to a **registry hook**: deck names + frozen legacy counts,
  add/delete deck. `updateDeck` / counter mutations are removed (see §6).

## 4. New Game modal (landing page)

**Entry**: landing page gets two side-by-side buttons: **⚔️ Neues Spiel**
(player-gradient, primary position) and **📊 Gesamtübersicht** (existing).
Stacked full-width on mobile.

**`src/components/NewGameModal.jsx`** (+ CSS module), opened from LandingPage;
also reused by the archive for editing:

- Overlay + centered card, 2×2 grid of player cells (1 column × 4 rows on
  narrow mobile, still compact).
- Each cell: colored avatar initial + player name, and a deck `<select>`
  listing that player's decks (sorted by most played).
- **Winner selection**: tapping a cell marks that player as winner — border in
  the player's color + 👑 badge in the cell corner. Tapping another cell moves
  the win; tapping the winner again deselects.
- **Remove participant**: small ✕ in the cell corner → cell becomes an empty
  "＋ Spieler" slot with a select for the remaining players. 2–4 participants.
- **Quick-add deck**: "＋ Neues Deck" link inside a cell opens an inline text
  input (+ Enter/button); creates the deck via `addDeckToRegistry`, selects it
  immediately, and it appears in that player's registry going forward.
- **Save** (`Spiel speichern`): disabled until ≥2 participants, every cell has
  a deck, and exactly one winner is chosen. Writes game + participants, shows
  the ✅ toast, closes. Stats update via realtime on all open devices.
- **Edit mode** (from archive): same component prefilled (participants, winner,
  `played_at` via `<input type="datetime-local">`), plus a **Löschen** button
  with a 5s undo toast (same pattern as deck deletion).

On open, the modal fetches all 4 players' decks (`Promise.all(getDecks)`),
same pattern as GlobalStatsView.

## 5. Game archive (`#/games`)

New route + `src/views/GamesArchiveView.jsx`:

- Reverse-chronological list grouped by day ("Heute", "Gestern", then date
  headings like "21. Juli 2026").
- Each game row: winner first with 👑 and player colors, losers below —
  `👑 pascal — Fallout` / `baum — Daleks · mary — Toxic · wewy — Hobbits`,
  plus time. Compact card per game.
- Tap a game → `NewGameModal` in edit mode (change winner, decks, date,
  participants) or delete with undo.
- Empty state: "Noch keine Spiele eingetragen — starte mit ⚔️ Neues Spiel".
- Realtime: new games from other devices appear live.
- Entry points: 📜 icon button in the GlobalStatsView header (next to the dark
  toggle) and a small "Spielarchiv" text link under the landing buttons.

## 6. Deprecation plan (Decks view)

What dies, what survives, in order:

| Element | Fate | Reason |
|---|---|---|
| WinLossBar +/- buttons | **Remove** | Counters frozen; results come from games |
| WinLossBar itself | **Keep, read-only** | Still the per-deck overview (bar + counts, combined) |
| Deck delete (trash + undo) | **Keep** | Registry management; deleting a registry deck keeps its game history (games store deck name as text) |
| Single-deck add input | **Keep** | Registry management (also available inline in the modal) |
| Bulk W/L import textarea | **Remove** | Writes counters, which no longer exist as a concept |
| `useDecks.updateDeck` | **Remove** | No more counter edits |
| Dashboard tab | **Keep unchanged** | Consumes combined counts |
| `saveDecks` full sync | **Keep** | Still syncs the registry; counters written back unchanged |

The "Decks" tab becomes: read-only deck bars + add deck + delete deck.
Optionally rename the tab "Decks" → stays "Decks" (it already means registry).

## 7. Implementation phases

- **Phase A — Schema**: user runs §1 SQL; backup per §2.1. (App unchanged.)
- **Phase B — Data layer**: supabaseClient game functions, `useGames`,
  `combineDeckStats` + unit tests (legacy + games merge, winner counting,
  decks only in games). Wire `TrackerView` and `GlobalStatsView` to combined
  counts. Verify totals match pre-migration.
- **Phase C — New Game modal**: component, landing buttons, winner/deck/
  participant interactions, quick-add deck, save flow.
- **Phase D — Archive**: `#/games` route, list view, edit mode, delete + undo,
  realtime.
- **Phase E — Deprecation**: remove +/- controls, `updateDeck`, bulk import;
  WinLossBar read-only; clean up dead code and tests.
- **Phase F — Docs & verification**: AGENTS.md (data model v2, routes,
  deprecation table), SUPABASE_SETUP.md (new SQL), lint/tests/build, manual
  checklist (enter game on phone, edit from desktop, watch both update live).

Commit after every phase (local only, Kimi identity per AGENTS.md).

## 8. New stat possibilities unlocked (follow-ups, not this plan)

- **Head-to-head matrix** (who beats whom, per deck pairing) — trivial from
  `game_participants`
- **Win rate over time** / rolling form per deck and player
- **Game-night grouping** (sessions), streaks
- **Season reset** = filter games by date, legacy stays lifetime

## 9. Risks / notes

- Deck names are stored as text on participants (not FK) — renaming a deck in
  the registry later won't rewrite history. Deliberate: history should reflect
  what was played. (Deck rename is still not a feature.)
- Editing a game's deck to a deck that no longer exists in the registry is
  allowed; it just won't appear in the registry list.
- `combineDeckStats` must handle decks present in games but not in the
  registry (deleted decks) — they show up in stats with their game counts.
- The modal is the most complex UI in the app so far; keep it self-contained
  in one component + one CSS module, no new dependencies.
