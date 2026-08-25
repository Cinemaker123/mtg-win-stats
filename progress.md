# Progress and Planned Work

This file holds work that is not done yet. Completed work moves to HISTORY.md.

## Ideas

- Deck archetype categorization
- Win/loss streak tracking
- Head-to-head matchup records (possible with the v2 game data)
- Seasonal statistics reset
- **Auth — Level 2/3 in `auth.md`.** Level 1 is **applied** through
  `db/level1_rls.sql` and verified live (RLS enabled, allow-all policies,
  `decks_counts_check`, pinned RPC `search_path`). The net anon access is
  unchanged. A PIN gate (Level 2) or real per-player auth (Level 3) stay
  optional.
