# Auth & RLS — Future Hardening Ideas

Status: **deferred** — captured 2026-07-23, not implemented. The app currently
runs with the Supabase anon key only (public in the JS bundle by design) and
RLS disabled / allow-all on all tables.

## Threat model reality check

- The anon key is embedded in the deployed bundle — anyone with the URL has
  the key, and the key works from `curl` without ever opening the app.
  "Access through a link" is not a security boundary.
- With anonymous access there is no per-request identity, so **per-player
  RLS is impossible without auth**. baum vs. pascal cannot be distinguished
  at the DB level.
- Blast radius today: anyone with the key can read/write/delete all rows in
  `decks` (and `games` / `game_participants` once added).

## Level 1 — Constraints + RLS hygiene (~1h, SQL only, no app changes)

Enable RLS with policies that allow exactly what the app does, plus CHECK
constraints so garbage rows are impossible even with the key. Protection
against people: zero change. Protection against nonsense data: real.

**Status: applied — see `db/level1_rls.sql` (run in the Supabase SQL Editor).**
Covers `decks`, `games`, `game_participants`, and `players` (the last
postdates this doc but is core to the model). Two deviations from the original
draft below:

- **No player-name CHECK.** Players are added dynamically via the `players`
  table, so a hardcoded `player in ('baum','mary',...)` would block new
  inserts. Player validity is enforced by the `player_id` FK instead.
- **`players` table included** in the RLS pass.

Gotcha: enabling RLS without policies makes the app silently return empty
data — the SQL adds the allow-all policies in the same transaction, so test
immediately after regardless.

## Level 2 — PIN gate + RPC-only access (~half a day, real casual protection)

- Revoke all direct table access from the `anon` role.
- Expose a few `security definer` RPC functions (`get_decks(pin)`,
  `save_game(pin, ...)`, ...) that verify a shared PIN server-side.
- App asks for the PIN once, stores it in localStorage, sends it per call.

Effect: link alone no longer leaks data; casual API poking fails without the
PIN; blast radius with the PIN is limited to what the functions allow (no
arbitrary deletes/truncate/DDL). A motivated person with the PIN can still
call the RPCs manually — this is a casual gate, not real isolation.

## Level 3 — Real Supabase Auth (~1–2 days, only true security)

Magic-link email login for the 4 players, then genuine per-player RLS:

```sql
create policy "own decks" on public.decks
  for all using (player = auth.jwt() ->> 'player_name')
  with check (player = auth.jwt() ->> 'player_name');
```

Real isolation and audit trail. Cost: login friction on game night, sign-in
UI, session handling. Overkill for a 4-friend fun tracker.

## Recommendation (as of deferral)

- Do Level 1 whenever convenient (fold policies into new-table SQL so tables
  are born with them).
- Do Level 2 only if "anyone with the link can wipe us" actually bothers us.
- Skip Level 3 unless the app grows beyond the pod.
- Regardless of level: the free Supabase tier has **no automated backups**.
  Periodic CSV export of `decks`/`games` (or the deferred JSON export
  feature) is the real insurance against deletion, malicious or accidental.
