# Supabase Setup für MTG Win Stats

Damit alle 4 Spieler (baum, mary, pascal, wewy) auf dieselben Daten zugreifen können, musst du ein Supabase-Projekt erstellen.

## Schritt 1: Supabase-Projekt erstellen

1. Gehe zu https://supabase.com und erstelle einen kostenlosen Account
2. Klicke "New Project"
3. Wähle einen Namen (z.B. "mtg-win-stats")
4. Warte bis die Datenbank bereit ist (ca. 2 Minuten)

## Schritt 2: Tabelle erstellen

1. Gehe zum **Table Editor** (linkes Menü)
2. Klicke **"New table"**
3. Erstelle eine Tabelle mit folgenden Einstellungen:

**Table name:** `decks`

**Columns:**
| Name | Type | Default | Primary | Other |
|------|------|---------|---------|-------|
| id | uuid | gen_random_uuid() | ✅ | - |
| player | text | - | - | - |
| name | text | - | - | - |
| wins | int8 | 0 | - | - |
| losses | int8 | 0 | - | - |
| created_at | timestamptz | now() | - | - |
| updated_at | timestamptz | now() | - | - |

4. Klicke **"Save"**

## Schritt 3: Row Level Security (RLS) deaktivieren

Für diesen einfachen Use-Case ohne Authentifizierung:

1. Klicke auf die Tabelle **"decks"**
2. Gehe zum Tab **"Policies"**
3. Klicke auf den roten Button **"Enable RLS"** um ihn zu deaktivieren (oder erstelle eine Policy die alles erlaubt)

Alternative: Erstelle eine Policy:
```sql
CREATE POLICY "Allow all" ON decks FOR ALL USING (true) WITH CHECK (true);
```

## Schritt 4: Realtime aktivieren

Damit Änderungen anderer Spieler live erscheinen (ohne Neuladen), muss die `decks`-Tabelle zur Realtime-Publication hinzugefügt werden. Im **SQL Editor** ausführen:

```sql
alter publication supabase_realtime add table public.decks;
```

Ohne diesen Schritt funktioniert die App normal, aber ohne Live-Updates.

## Schritt 5: API-Keys in Vercel eintragen

1. Gehe in Supabase zu **Project Settings** → **API**
2. Kopiere:
   - **Project URL** (z.B. `https://abcdefghijklmnop.supabase.co`)
   - **anon public** API key (beginnt mit `eyJ...`)

3. Gehe zu deinem Vercel-Projekt → **Settings** → **Environment Variables**
4. Füge hinzu:
   - `VITE_SUPABASE_URL` = Deine Project URL
   - `VITE_SUPABASE_ANON_KEY` = Dein anon key

5. Klicke **"Deploy"** um neu zu bauen

## Fertig! 🎉

Alle Spieler können jetzt unter derselben URL die Daten bearbeiten und sehen.

---

## Lokale Entwicklung

Für lokale Tests erstelle eine `.env` Datei im Projekt-Root:

```
VITE_SUPABASE_URL=https://dein-project.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

Dann starte wie gewohnt:
```bash
npm run dev
```

---

## Data Model v2: Spiele-Tabellen (games + game_participants)

Seit v2 werden Ergebnisse als **Spiele** (mit Datum, Teilnehmern, Gewinner)
gespeichert statt als manuelle Zähler pro Deck. Die `decks`-Tabelle bleibt
als reines Deck-Register bestehen; ihre `wins`/`losses`-Spalten sind die
**eingefrorene Legacy-Baseline** (Zählerstand vor der Umstellung). Angezeigte
Statistiken = Legacy-Baseline + aus `game_participants` abgeleitete Zähler.

Im **SQL Editor** ausführen:

```sql
-- 1) Spiele
create table public.games (
  id         uuid primary key default gen_random_uuid(),
  played_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 2) Teilnehmer: eine Zeile pro Spieler pro Spiel (2-4 pro Spiel)
create table public.game_participants (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  player     text not null,
  deck       text not null,
  is_winner  boolean not null default false
);

create index game_participants_game_id_idx on public.game_participants (game_id);
create index game_participants_player_idx  on public.game_participants (player);

-- 3) RLS: wie bei der decks-Tabelle (kein Auth → alles erlauben)
alter table public.games disable row level security;
alter table public.game_participants disable row level security;

-- 4) Realtime für Live-Updates
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_participants;

-- 5) decks.wins/losses einfrieren (nur Dokumentation)
comment on column public.decks.wins   is 'Legacy baseline (pre-games era), frozen';
comment on column public.decks.losses is 'Legacy baseline (pre-games era), frozen';
```

## IDs statt Namen: `players`-Tabelle + Fremdschlüssel

Ursprünglich identifizierten `decks.player` und `game_participants.player`/
`deck` per Klartext. Diese Textspalten bleiben unverändert bestehen (u.a.
als dauerhafter Namens-Schnappschuss für gelöschte Decks), bekommen aber
zusätzlich `player_id`/`deck_id`-Fremdschlüssel an die Seite gestellt.
Vorteil: Ein Deck umbenennen wird ein einzelnes Update auf `decks.name`
statt eines Propagations-Writes über die komplette Spielhistorie, und
Namenskollisionen zwischen Decks können Statistiken nicht mehr
zusammenlegen.

Im **SQL Editor** ausführen:

```sql
-- 1) Spieler-Tabelle
create table public.players (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,   -- "baum" | "mary" | "pascal" | "wewy"
  name       text not null,
  created_at timestamptz not null default now()
);

insert into public.players (slug, name) values
  ('baum', 'baum'), ('mary', 'mary'), ('pascal', 'pascal'), ('wewy', 'wewy');

alter table public.players disable row level security;
alter publication supabase_realtime add table public.players;

-- 2) Fremdschlüssel-Spalten (nullable, nichts bricht dabei)
alter table public.decks             add column player_id uuid references public.players(id);
alter table public.game_participants add column player_id uuid references public.players(id);
alter table public.game_participants add column deck_id   uuid references public.decks(id) on delete set null;

-- 3) Backfill anhand der bestehenden Textspalten
update public.decks d set player_id = p.id
  from public.players p where p.slug = d.player;

update public.game_participants gp set player_id = p.id
  from public.players p where p.slug = gp.player;

update public.game_participants gp set deck_id = d.id
  from public.decks d
  where d.player = gp.player and d.name = gp.deck;
  -- Zeilen ohne Treffer (Deck war zum Zeitpunkt der Migration bereits aus
  -- der Registry gelöscht) bleiben deck_id = null — korrekt, das ist genau
  -- das "gelöschtes Deck"-Signal, auf das der App-Code sich verlässt

-- 4) Erst NOT NULL setzen, wenn der App-Code (supabaseClient.js) auf den
--    neuen Spalten schreibt — sonst schlagen Inserts aus altem Code fehl.
--    deck_id bleibt für immer nullable (das ist das "gelöscht"-Signal).
alter table public.decks             alter column player_id set not null;
alter table public.game_participants alter column player_id set not null;
```

Nach diesem Schritt ggf. den PostgREST-Schema-Cache neu laden (Dashboard →
Database → API → "Reload schema"), damit der `decks(name)`-Embed in
`getGames()` sofort funktioniert, statt auf den automatischen Reload zu
warten.

## Atomare Spiel-Writes: `save_game` / `update_game`

Ein Spiel besteht aus einer `games`-Zeile plus mehreren
`game_participants`-Zeilen. Würde die App diese in getrennten Requests
schreiben, könnte ein Fehler zwischen den beiden Schritten ein Spiel ohne
Teilnehmer hinterlassen (bzw. beim Bearbeiten die alte Aufstellung löschen,
bevor die neue gespeichert ist). Die beiden folgenden Funktionen kapseln das
in **je einer Transaktion** — `addGame` / `updateGame` in `supabaseClient.js`
rufen nur noch `supabase.rpc(...)` auf. Einmalig im **SQL Editor** ausführen:

```sql
create or replace function public.save_game(p_played_at timestamptz, p_participants jsonb)
returns uuid
language plpgsql
as $$
declare
  v_game_id uuid;
begin
  insert into public.games (played_at)
  values (coalesce(p_played_at, now()))
  returning id into v_game_id;

  insert into public.game_participants (game_id, player, player_id, deck, deck_id, is_winner)
  select
    v_game_id,
    e->>'player',
    (select id from public.players where slug = e->>'player'),
    e->>'deck',
    nullif(e->>'deckId', '')::uuid,
    coalesce((e->>'isWinner')::boolean, false)
  from jsonb_array_elements(p_participants) as e;

  return v_game_id;
end;
$$;

create or replace function public.update_game(p_id uuid, p_played_at timestamptz, p_participants jsonb)
returns void
language plpgsql
as $$
begin
  update public.games set played_at = p_played_at where id = p_id;
  delete from public.game_participants where game_id = p_id;

  insert into public.game_participants (game_id, player, player_id, deck, deck_id, is_winner)
  select
    p_id,
    e->>'player',
    (select id from public.players where slug = e->>'player'),
    e->>'deck',
    nullif(e->>'deckId', '')::uuid,
    coalesce((e->>'isWinner')::boolean, false)
  from jsonb_array_elements(p_participants) as e;
end;
$$;
```

`p_participants` ist das JSON-Array, das der New-Game-Modal baut:
`[{ player, deck, deckId, isWinner }]`. `player_id` wird serverseitig über den
Slug aufgelöst (unabhängig vom Client-Cache), `deck_id` kommt aus dem `deckId`,
das der Client im AllDecks-Cache nachgeschlagen hat.


## Deck-Writes: `player_id` serverseitig setzen (Trigger)

Deck-Zeilen (`addDeckToRegistry`, `restoreDeckRow`) senden kein `player_id`
mehr mit. Ein Trigger füllt es aus dem Slug, genau wie `save_game` es für
Spiele tut. So kann ein veralteter Client-Cache keinen `player_id = null`
mehr schreiben, wenn ein anderer Tab kurz vorher einen Spieler angelegt hat.

Im **SQL Editor** ausführen:

```sql
create or replace function public.set_deck_player_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.player_id is null then
    select id into new.player_id from public.players where slug = new.player;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_deck_player_id on public.decks;
create trigger trg_set_deck_player_id
  before insert or update on public.decks
  for each row execute function public.set_deck_player_id();
```

`security definer` plus `set search_path = public` folgt der gleichen
Härtung wie `save_game`/`update_game`. Der Trigger löst den Slug auch dann
auf, wenn die `players`-RLS später verschärft wird.
