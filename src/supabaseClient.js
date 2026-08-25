// Supabase client for shared storage
// Players: baum, mary, pascal, wewy

import { createClient } from '@supabase/supabase-js'
import { PLAYERS, playerSlug } from './utils/stats.js'

// Get these from: https://supabase.com/dashboard → Project Settings → API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '[MTG Win Stats] Supabase credentials missing. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file (see .env.example).'
  )
}

export const supabase = createClient(
  SUPABASE_URL || 'https://missing-supabase-url.invalid',
  SUPABASE_KEY || 'missing-anon-key'
)

// Table name for decks
const TABLE_NAME = 'decks'
const PLAYERS_TABLE = 'players'

/**
 * Unpack a Supabase response: log and rethrow on failure, return the rows
 * on success. Every query in this module reports failures the same way.
 * @param {{data: *, error: Object|null}} result - resolved Supabase response
 * @param {string} context - what was attempted, used as the log prefix
 * @returns {*} - the response data
 */
function unwrap({ data, error }, context) {
  if (error) {
    console.error(`${context}:`, error)
    throw error
  }
  return data
}

/**
 * Fetch and cache the player slug -> id map from the `players` table.
 * Cached for the page's lifetime; `addPlayer` clears the cache so a newly
 * added player is resolvable straight away.
 * @returns {Promise<Object>} - { [slug]: id }
 */
let playerIdMapPromise = null
async function getPlayerIdMap() {
  if (!playerIdMapPromise) {
    playerIdMapPromise = supabase
      .from(PLAYERS_TABLE)
      .select('id, slug')
      .then(({ data, error }) => {
        if (error) {
          playerIdMapPromise = null
          console.error('Error fetching players:', error)
          throw error
        }
        return Object.fromEntries((data || []).map(p => [p.slug, p.id]))
      })
  }
  return playerIdMapPromise
}

/**
 * Every player slug known to the database, pod members included.
 * @returns {Promise<string[]>} - slugs
 */
export async function getPlayerSlugs() {
  return Object.keys(await getPlayerIdMap())
}

/**
 * Add a player. Their games and decks are recorded like anyone else's, but
 * only the pod (PLAYERS in utils/stats.js) is counted in the statistics, so a
 * new player shows up in the games archive and nowhere else.
 * @param {string} name - display name as typed
 * @returns {Promise<string>} - the player's slug (existing row reused as-is)
 */
export async function addPlayer(name) {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  const slug = playerSlug(name)
  unwrap(
    await supabase
      .from(PLAYERS_TABLE)
      .upsert({ slug, name: trimmed }, { onConflict: 'slug', ignoreDuplicates: true }),
    'Error adding player'
  )
  // The cached map predates this row, so every later player_id lookup would
  // resolve to null without this.
  playerIdMapPromise = null
  return slug
}

/**
 * Fetch all decks for every player in one call.
 * @returns {Promise<Array>} - array of { id, player, name, wins, losses }
 */
export async function getAllDecks() {
  const data = unwrap(
    await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: true }),
    'Error fetching all decks'
  )

  return (data || []).map(row => ({
    id: row.id,
    player: row.player,
    name: row.name,
    wins: row.wins,
    losses: row.losses,
  }))
}

/**
 * Fetch all decks in one call, grouped by player. Every player known to the
 * database gets an entry (empty array if they have no decks yet), the pod
 * included even when the players table cannot be read. Grouping by the table
 * rather than by PLAYERS is what lets an added player own decks at all — the
 * old version silently dropped their rows.
 * @returns {Promise<Object>} - { [player]: Array<{ id, name, wins, losses }> }
 */
export async function getDecksByPlayer() {
  // The pod (PLAYERS) must survive a players-table read failure, so a failed
  // slug fetch degrades to "no extra players" rather than rejecting the whole
  // registry load.
  const [decks, slugs] = await Promise.all([
    getAllDecks(),
    getPlayerSlugs().catch(() => []),
  ])
  const byPlayer = Object.fromEntries([...new Set([...PLAYERS, ...slugs])].map(p => [p, []]))
  decks.forEach(d => {
    byPlayer[d.player] = byPlayer[d.player] || []
    byPlayer[d.player].push(d)
  })
  return byPlayer
}

// ============================================================
// Data Model v2: match-based game entry
// ============================================================

const GAMES_TABLE = 'games'

/**
 * Fetch all games with their participants, newest first
 * @returns {Promise<Array>} - [{ id, playedAt, participants: [{ player, deck, isWinner }] }]
 */
export async function getGames() {
  const data = unwrap(
    await supabase
      .from(GAMES_TABLE)
      .select('id, played_at, game_participants(player, deck, is_winner, decks(name))')
      .order('played_at', { ascending: false }),
    'Error fetching games'
  )

  return (data || []).map(g => ({
    id: g.id,
    playedAt: g.played_at,
    participants: (g.game_participants || []).map(p => ({
      player: p.player,
      // Prefer the live deck name via deck_id join, so renames are
      // instant; fall back to the frozen snapshot text for games whose
      // deck was since deleted from the registry (deck_id -> null)
      deck: p.decks?.name ?? p.deck,
      isWinner: p.is_winner,
    })),
  }))
}

/**
 * Insert a game with its participants, atomically.
 * The `save_game` Postgres function inserts the game row and all participant
 * rows in one transaction, so a mid-write failure can no longer leave a game
 * with no participants (see SUPABASE_SETUP.md for the function definition).
 * `player_id` is resolved server-side by slug; `deck_id` comes from the
 * `deckId` the caller looked up in the AllDecks cache.
 * @param {Object} game
 * @param {string} [game.playedAt] - ISO timestamp (defaults to now)
 * @param {Array} game.participants - [{ player, deck, deckId, isWinner }]
 * @returns {Promise<string>} - the new game's id
 */
export async function addGame({ playedAt, participants }) {
  return unwrap(
    await supabase.rpc('save_game', {
      p_played_at: playedAt || new Date().toISOString(),
      p_participants: participants,
    }),
    'Error inserting game'
  )
}

/**
 * Update a game: new played_at, participants replaced wholesale — atomically.
 * The `update_game` Postgres function updates the game, deletes the old
 * participants and inserts the new ones in one transaction, so a failed insert
 * can no longer wipe the original line-up.
 * @param {string} id - game id
 * @param {Object} game - { playedAt, participants }
 */
export async function updateGame(id, { playedAt, participants }) {
  unwrap(
    await supabase.rpc('update_game', {
      p_id: id,
      p_played_at: playedAt,
      p_participants: participants,
    }),
    'Error updating game'
  )
}

/**
 * Delete a game (participants cascade)
 * @param {string} id - game id
 */
export async function deleteGame(id) {
  unwrap(
    await supabase
      .from(GAMES_TABLE)
      .delete()
      .eq('id', id),
    'Error deleting game'
  )
}

/**
 * Add a deck to the registry with zeroed legacy counters.
 * Existing decks are left untouched (ignoreDuplicates).
 * @param {string} player - player name
 * @param {string} name - deck name
 * @returns {Promise<string|null>} - the deck's id, or null if it already
 *   existed (ignoreDuplicates skips the row, so there's nothing to return)
 */
export async function addDeckToRegistry(player, name) {
  const playerIdMap = await getPlayerIdMap()
  const data = unwrap(
    await supabase
      .from(TABLE_NAME)
      .upsert(
        { player, player_id: playerIdMap[player] ?? null, name, wins: 0, losses: 0, updated_at: new Date().toISOString() },
        { onConflict: 'player,name', ignoreDuplicates: true }
      )
      .select('id')
      .maybeSingle(),
    'Error adding deck to registry'
  )

  return data?.id ?? null
}

/**
 * Rename a deck by id. Since `game_participants.deck_id` points at this
 * same row, every game's displayed deck name updates instantly via the
 * join in `getGames()` — no need to touch game history rows at all.
 * @param {string} id - deck id
 * @param {string} newName - new deck name
 */
export async function renameDeckRegistry(id, newName) {
  unwrap(
    await supabase
      .from(TABLE_NAME)
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', id),
    'Error renaming deck'
  )
}

/**
 * Delete one deck by id. Per-row, so a failed load can never drive it (the old
 * full-sync saveDecks deleted every row missing from local state).
 * game_participants.deck_id is ON DELETE SET NULL, so past games keep their
 * frozen text name.
 * @param {string} id - deck id
 */
export async function deleteDeckById(id) {
  unwrap(
    await supabase.from(TABLE_NAME).delete().eq('id', id),
    'Error deleting deck'
  )
}

/**
 * Re-insert a deck with its counts, for undo after a delete. Upserts by
 * (player, name), so the legacy wins/losses survive the round trip.
 * @param {string} player - player slug
 * @param {{name: string, wins: number, losses: number}} deck
 */
export async function restoreDeckRow(player, deck) {
  const playerIdMap = await getPlayerIdMap()
  unwrap(
    await supabase.from(TABLE_NAME).upsert(
      {
        player,
        player_id: playerIdMap[player] ?? null,
        name: deck.name,
        wins: deck.wins,
        losses: deck.losses,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'player,name' }
    ),
    'Error restoring deck'
  )
}
