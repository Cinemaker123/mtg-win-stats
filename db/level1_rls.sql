-- Level 1 hardening (auth.md): RLS + allow-all policies + sanity CHECKs.
-- Run once in the Supabase SQL Editor. Idempotent (safe to re-run).
-- Scope: MTG tables only (decks, games, game_participants, players).
-- NOTE: the player-name CHECK from auth.md's draft is intentionally omitted --
-- players are added dynamically via the players table, so a hardcoded list
-- would block new inserts. Player validity is enforced by the player_id FK.

-- Sanity CHECK: counts can never go negative.
alter table public.decks add constraint decks_counts_check
  check (wins >= 0 and losses >= 0);

-- Enable RLS.
alter table public.decks             enable row level security;
alter table public.games             enable row level security;
alter table public.game_participants enable row level security;
alter table public.players           enable row level security;

-- Allow-all policies: anon keeps full access (same as today), but RLS is now
-- explicit ON, so future per-role tightening is possible without a lockout.
do $$
declare t text;
begin
  foreach t in array array['decks','games','game_participants','players'] loop
    execute format('drop policy if exists "anon read"   on public.%I', t);
    execute format('drop policy if exists "anon write"  on public.%I', t);
    execute format('drop policy if exists "anon update" on public.%I', t);
    execute format('drop policy if exists "anon delete" on public.%I', t);
    execute format('create policy "anon read"   on public.%I for select using (true)', t);
    execute format('create policy "anon write"  on public.%I for insert with check (true)', t);
    execute format('create policy "anon update" on public.%I for update using (true) with check (true)', t);
    execute format('create policy "anon delete" on public.%I for delete using (true)', t);
  end loop;
end $$;

-- Pin the RPC functions' search_path so they can't be hijacked via a mutable
-- one (Supabase advisor: function_search_path_mutable). Idempotent.
alter function public.save_game(timestamptz, jsonb)          set search_path = public;
alter function public.update_game(uuid, timestamptz, jsonb)  set search_path = public;
