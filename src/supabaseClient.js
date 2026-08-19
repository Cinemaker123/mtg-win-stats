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

/**
 * Fetch all decks for a player
 * @param {string} player - player name (baum, mary, pascal, wewy)
 * @returns {Promise<Array>} - array of deck objects
 */
export async function getDecks(player) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('player', player)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching decks:', error)
    throw error
  }

  // Transform to app format
  return (data || []).map(row => ({
    name: row.name,
    wins: row.wins,
    losses: row.losses,
  }))
}

/**
 * Fetch all decks for every player in one call.
 * @returns {Promise<Array>} - array of { player, name, wins, losses }
 */
export async function getAllDecks() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching all decks:', error)
    throw error
  }

  return (data || []).map(row => ({
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
 * @returns {Promise<Object>} - { [player]: Array<{ name, wins, losses }> }
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
  const upsert = decks.length > 0
    ? supabase
      .from(TABLE_NAME)
      .upsert(
        decks.map(deck => ({
          player,
          name: deck.name,
          wins: deck.wins,
          losses: deck.losses,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'player,name' }
      )
    : null

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

  if (upsertResult?.error) {
    console.error('Error upserting decks:', upsertResult.error)
    throw upsertResult.error
  }

  if (removeResult.error) {
    console.error('Error deleting removed decks:', removeResult.error)
    throw removeResult.error
  }
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
  const { data, error } = await supabase
    .from(GAMES_TABLE)
    .select('id, played_at, game_participants(player, deck, is_winner)')
    .order('played_at', { ascending: false })

  if (error) {
    console.error('Error fetching games:', error)
    throw error
  }

  return (data || []).map(g => ({
    id: g.id,
    playedAt: g.played_at,
    participants: (g.game_participants || []).map(p => ({
      player: p.player,
      deck: p.deck,
      isWinner: p.is_winner,
    })),
  }))
}

/**
 * Insert a game's participant rows. Shared by addGame and updateGame,
 * which build the identical payload.
 * @param {string} gameId - game the participants belong to
 * @param {Array} participants - [{ player, deck, isWinner }]
 */
async function insertParticipants(gameId, participants) {
  const { error } = await supabase
    .from(PARTICIPANTS_TABLE)
    .insert(participants.map(p => ({
      game_id: gameId,
      player: p.player,
      deck: p.deck,
      is_winner: p.isWinner,
    })))

  if (error) {
    console.error('Error inserting participants:', error)
    throw error
  }
}

/**
 * Insert a game with its participants
 * @param {Object} game
 * @param {string} [game.playedAt] - ISO timestamp (defaults to now)
 * @param {Array} game.participants - [{ player, deck, isWinner }]
 * @returns {Promise<string>} - the new game's id
 */
export async function addGame({ playedAt, participants }) {
  const { data: game, error } = await supabase
    .from(GAMES_TABLE)
    .insert({ played_at: playedAt || new Date().toISOString() })
    .select('id')
    .single()

  if (error) {
    console.error('Error inserting game:', error)
    throw error
  }

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
  const [{ error }, { error: delError }] = await Promise.all([
    supabase
      .from(GAMES_TABLE)
      .update({ played_at: playedAt })
      .eq('id', id),
    supabase
      .from(PARTICIPANTS_TABLE)
      .delete()
      .eq('game_id', id),
  ])

  if (error) {
    console.error('Error updating game:', error)
    throw error
  }

  if (delError) {
    console.error('Error replacing participants:', delError)
    throw delError
  }

  // The insert must follow the delete — it replaces the same rows.
  await insertParticipants(id, participants)
}

/**
 * Delete a game (participants cascade)
 * @param {string} id - game id
 */
export async function deleteGame(id) {
  const { error } = await supabase
    .from(GAMES_TABLE)
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting game:', error)
    throw error
  }
}

/**
 * Add a deck to the registry with zeroed legacy counters.
 * Existing decks are left untouched (ignoreDuplicates).
 * @param {string} player - player name
 * @param {string} name - deck name
 */
export async function addDeckToRegistry(player, name) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(
      { player, name, wins: 0, losses: 0, updated_at: new Date().toISOString() },
      { onConflict: 'player,name', ignoreDuplicates: true }
    )

  if (error) {
    console.error('Error adding deck to registry:', error)
    throw error
  }
}

/**
 * Rename a deck in all recorded games of a player.
 * The registry rename happens via saveDecks (full sync); this keeps the
 * game history pointing at the same deck so combined stats don't split.
 * @param {string} player - player name
 * @param {string} oldName - current deck name
 * @param {string} newName - new deck name
 */
export async function renameDeckInGames(player, oldName, newName) {
  const { error } = await supabase
    .from(PARTICIPANTS_TABLE)
    .update({ deck: newName })
    .eq('player', player)
    .eq('deck', oldName)

  if (error) {
    console.error('Error renaming deck in games:', error)
    throw error
  }
}
