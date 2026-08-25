# MTG Win Stats Tracker

A React and Vite application that tracks Magic: The Gathering deck performance
for a Commander pod. The interface is mobile-friendly. It records games, keeps
a deck registry per player, and shows cross-player analytics.

Working on the code? Read `AGENTS.md` first. It holds the architecture and the
rules that the code must follow.

## Quick Start

```bash
npm install
npm run hooks:install   # once per clone, see below
cp .env.example .env    # then fill in the two Supabase values below
npm run dev
```

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm test` | Run the Vitest suite |
| `npm run lint` | Run ESLint |
| `npm run build` | Build into `dist/` |
| `npm run check` | Lint, test, build, then refresh the graph and the wiki |
| `npm run hooks:install` | Install the pre-commit hook |

## The pre-commit hook

`npm run hooks:install` points `.git/hooks/pre-commit` at `scripts/precheck.sh`.
Every commit then runs, in order:

1. `npm run lint`
2. `npm test`
3. `npm run build`
4. `graphify update .`
5. `graphify export wiki`

The whole run takes about 3 seconds.

Steps 1 to 3 **block** the commit. Step 3 is there on purpose: the build is the
only gate that catches a deleted export that some file still imports. Lint and
the tests both miss that.

Steps 4 and 5 never block. They keep `graphify-out/` current. `graphify update`
refreshes the graph but not the wiki, so the export must run after it every
time. If graphify is not installed, both steps are skipped.

Git hooks live in `.git/`, which is not tracked. Each clone must run
`npm run hooks:install` once. To skip the hook for one commit, use
`git commit --no-verify`.

The `post-commit` hook belongs to graphify (`graphify hook install`). The
installer here does not touch it.

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

## Environment Variables

These are necessary for the Supabase integration:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The database schema and the SQL functions live in `SUPABASE_SETUP.md`.
Security hardening is documented in `auth.md`.

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
     player currently has a streak (player name capitalized). The streak cards
     sit in the 2x2 grid with "Bestes Deck" and "Meistgespielt", below "Spiele
     insgesamt" (full width) and the player-strength chart. At mobile width the
     2x2 cells are narrow, so long values (deck names, "X Niederlagen in Folge")
     truncate with an ellipsis.
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

## More Documentation

| File | Contents |
|---|---|
| `AGENTS.md` | Architecture, invariants, and code conventions |
| `HISTORY.md` | What changed in past refactors |
| `progress.md` | Planned and unfinished work |
| `SUPABASE_SETUP.md` | Database schema and SQL functions |
| `auth.md` | Security levels and the applied RLS hardening |
