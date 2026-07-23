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

