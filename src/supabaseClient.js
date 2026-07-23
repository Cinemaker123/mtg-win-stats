// Supabase client for shared storage
// Players: baum, mary, pascal, wewy

import { createClient } from '@supabase/supabase-js'

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
  if (decks.length > 0) {
    // Bulk upsert all decks in a single API call
    const { error } = await supabase
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

    if (error) {
      console.error('Error upserting decks:', error)
      throw error
    }
  }

  // Delete rows that are no longer in local state (full sync)
  let query = supabase
    .from(TABLE_NAME)
    .delete()
    .eq('player', player)

  if (decks.length > 0) {
    const names = decks.map(d => quoteFilterValue(d.name)).join(',')
    query = query.not('name', 'in', `(${names})`)
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting removed decks:', error)
    throw error
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

  const { error: pError } = await supabase
    .from(PARTICIPANTS_TABLE)
    .insert(participants.map(p => ({
      game_id: game.id,
      player: p.player,
      deck: p.deck,
      is_winner: p.isWinner,
    })))

  if (pError) {
    console.error('Error inserting participants:', pError)
    throw pError
  }

  return game.id
}

/**
 * Update a game: new played_at, participants replaced wholesale
 * @param {string} id - game id
 * @param {Object} game - { playedAt, participants }
 */
export async function updateGame(id, { playedAt, participants }) {
  const { error } = await supabase
    .from(GAMES_TABLE)
    .update({ played_at: playedAt })
    .eq('id', id)

  if (error) {
    console.error('Error updating game:', error)
    throw error
  }

  const { error: delError } = await supabase
    .from(PARTICIPANTS_TABLE)
    .delete()
    .eq('game_id', id)

  if (delError) {
    console.error('Error replacing participants:', delError)
    throw delError
  }

  const { error: insError } = await supabase
    .from(PARTICIPANTS_TABLE)
    .insert(participants.map(p => ({
      game_id: id,
      player: p.player,
      deck: p.deck,
      is_winner: p.isWinner,
    })))

  if (insError) {
    console.error('Error inserting participants:', insError)
    throw insError
  }
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
