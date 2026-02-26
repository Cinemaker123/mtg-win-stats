// Supabase client for shared storage
// Players: baum, mary, pascal, wewy

import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
// Get these from: https://supabase.com/dashboard → Project Settings → API
const SUPABASE_URL = import.meta.env.SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_KEY = import.meta.env.SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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
 * Save all decks for a player (replaces existing)
 * @param {string} player - player name
 * @param {Array} decks - array of deck objects
 */
export async function saveDecks(player, decks) {
  // Delete existing decks for this player
  const { error: deleteError } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('player', player)
  
  if (deleteError) {
    console.error('Error deleting old decks:', deleteError)
    throw deleteError
  }
  
  // Insert new decks
  if (decks.length === 0) return
  
  const rows = decks.map(deck => ({
    player,
    name: deck.name,
    wins: deck.wins,
    losses: deck.losses,
  }))
  
  const { error: insertError } = await supabase
    .from(TABLE_NAME)
    .insert(rows)
  
  if (insertError) {
    console.error('Error saving decks:', insertError)
    throw insertError
  }
}

/**
 * Add or update a single deck
 * @param {string} player - player name
 * @param {Object} deck - deck object
 */
export async function saveDeck(player, deck) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert({
      player,
      name: deck.name,
      wins: deck.wins,
      losses: deck.losses,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'player,name'
    })
  
  if (error) {
    console.error('Error saving deck:', error)
    throw error
  }
}

/**
 * Delete a deck
 * @param {string} player - player name
 * @param {string} deckName - deck name to delete
 */
export async function deleteDeck(player, deckName) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('player', player)
    .eq('name', deckName)
  
  if (error) {
    console.error('Error deleting deck:', error)
    throw error
  }
}
