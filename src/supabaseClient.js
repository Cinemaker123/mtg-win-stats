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
