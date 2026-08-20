// Supabase client for shared storage
// Players: baum, mary, pascal, wewy

import { createClient } from '@supabase/supabase-js'
import { PLAYERS } from './utils/stats.js'

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
 * Cached for the lifetime of the page since the 4 players never change.
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
 * Fetch all decks for a player
 * @param {string} player - player name (baum, mary, pascal, wewy)
 * @returns {Promise<Array>} - array of deck objects
 */
export async function getDecks(player) {
  const data = unwrap(
    await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('player', player)
      .order('created_at', { ascending: true }),
    'Error fetching decks'
  )

  // Transform to app format
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    wins: row.wins,
    losses: row.losses,
  }))
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
 * Fetch all decks in one call, grouped by player. Every player in PLAYERS
 * gets an entry (empty array if they have no decks yet); rows belonging to
 * an unknown player are ignored.
 * @returns {Promise<Object>} - { [player]: Array<{ id, name, wins, losses }> }
 */
export async function getDecksByPlayer() {
  const decks = await getAllDecks()
  const byPlayer = Object.fromEntries(PLAYERS.map(p => [p, []]))
  decks.forEach(d => { byPlayer[d.player]?.push(d) })
  return byPlayer
}

/**
 * Quote a value for use inside a PostgREST `in` filter list
 * @param {string} value - raw filter value
 * @returns {string} - quoted and escaped value
 */
function quoteFilterValue(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`
}

/**
 * Sync all decks for a player (local state is authoritative).
 * Upserts the given decks in one call and deletes rows for this player
 * whose name is no longer present in the list.
 * @param {string} player - player name
 * @param {Array} decks - array of deck objects
 */
export async function saveDecks(player, decks) {
  // Bulk upsert all decks in a single API call
  let upsert = null
  if (decks.length > 0) {
    const playerIdMap = await getPlayerIdMap()
    upsert = supabase
      .from(TABLE_NAME)
      .upsert(
        decks.map(deck => ({
          player,
          player_id: playerIdMap[player] ?? null,
          name: deck.name,
          wins: deck.wins,
          losses: deck.losses,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'player,name' }
      )
  }

  // Delete rows that are no longer in local state (full sync)
  let remove = supabase
    .from(TABLE_NAME)
    .delete()
    .eq('player', player)

  if (decks.length > 0) {
    const names = decks.map(d => quoteFilterValue(d.name)).join(',')
    remove = remove.not('name', 'in', `(${names})`)
  }

  // Disjoint row sets (the delete excludes everything the upsert writes),
  // so the two round trips can overlap instead of running back to back.
  const [upsertResult, removeResult] = await Promise.all([upsert, remove])

  if (upsertResult) unwrap(upsertResult, 'Error upserting decks')
  unwrap(removeResult, 'Error deleting removed decks')
}

// ============================================================
// Data Model v2: match-based game entry (see plan2.md)
// ============================================================

const GAMES_TABLE = 'games'
const PARTICIPANTS_TABLE = 'game_participants'

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
 * Insert a game's participant rows. Shared by addGame and updateGame,
 * which build the identical payload. Both the id foreign keys and the
 * original text columns are written — see the note in AGENTS.md on why
 * the text is kept.
 * @param {string} gameId - game the participants belong to
 * @param {Array} participants - [{ player, deck, deckId, isWinner }]
 */
async function insertParticipants(gameId, participants) {
  const playerIdMap = await getPlayerIdMap()
  unwrap(
    await supabase
      .from(PARTICIPANTS_TABLE)
      .insert(participants.map(p => ({
        game_id: gameId,
        player: p.player,
        player_id: playerIdMap[p.player] ?? null,
        deck: p.deck,
        deck_id: p.deckId ?? null,
        is_winner: p.isWinner,
      }))),
    'Error inserting participants'
  )
}

/**
 * Insert a game with its participants
 * @param {Object} game
 * @param {string} [game.playedAt] - ISO timestamp (defaults to now)
 * @param {Array} game.participants - [{ player, deck, deckId, isWinner }]
 * @returns {Promise<string>} - the new game's id
 */
export async function addGame({ playedAt, participants }) {
  const game = unwrap(
    await supabase
      .from(GAMES_TABLE)
      .insert({ played_at: playedAt || new Date().toISOString() })
      .select('id')
      .single(),
    'Error inserting game'
  )

  await insertParticipants(game.id, participants)

  return game.id
}

/**
 * Update a game: new played_at, participants replaced wholesale
 * @param {string} id - game id
 * @param {Object} game - { playedAt, participants }
 */
export async function updateGame(id, { playedAt, participants }) {
  // Different tables, neither depends on the other's result — overlap them.
  const [updateResult, deleteResult] = await Promise.all([
    supabase
      .from(GAMES_TABLE)
      .update({ played_at: playedAt })
      .eq('id', id),
    supabase
      .from(PARTICIPANTS_TABLE)
      .delete()
      .eq('game_id', id),
  ])

  unwrap(updateResult, 'Error updating game')
  unwrap(deleteResult, 'Error replacing participants')

  // The insert must follow the delete — it replaces the same rows.
  await insertParticipants(id, participants)
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
