import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { getDecks, saveDecks } from "../supabaseClient.js";

/**
 * @typedef {Object} Deck
 * @property {string} name - Deck name
 * @property {number} wins - Number of wins
 * @property {number} losses - Number of losses
 */

/**
 * @typedef {Object} UseDecksReturn
 * @property {Deck[]} decks - Current deck list
 * @property {boolean} loading - Whether data is being loaded
 * @property {boolean} loaded - Whether initial load completed
 * @property {string|null} error - Error message if any
 * @property {Function} clearError - Clear error state
 * @property {Function} updateDeck - Update a specific deck by index
 * @property {Function} addDecks - Add or merge new decks
 * @property {Function} deleteDeck - Delete a deck by index
 */

/**
 * Hook for managing deck data with Supabase persistence
 * @param {string} player - Player identifier
 * @returns {UseDecksReturn} Deck state and operations
 */
export function useDecks(player) {
  const [decks, setDecks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load from Supabase on mount
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    getDecks(player)
      .then(data => {
        if (data.length > 0) {
          setDecks(data);
        }
        setLoaded(true);
      })
      .catch(e => {
        console.error("Failed to load from Supabase:", e);
        setError("Fehler beim Laden. Bitte Seite neu laden.");
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [player]);

  // Save to Supabase whenever decks change (debounced)
  useEffect(() => {
    if (!loaded) return;
    
    const timeout = setTimeout(() => {
      saveDecks(player, decks).catch(e => {
        console.error("Failed to save to Supabase:", e);
        setError("Speichern fehlgeschlagen. Änderungen gehen möglicherweise verloren.");
      });
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [decks, loaded, player]);

  const updateDeck = useCallback((idx, fn) => {
    setDecks(ds => ds.map((d, i) => i === idx ? fn(d) : d));
  }, []);

  const addDecks = useCallback((newDecks) => {
    setDecks(ds => {
      const updated = [...ds];
      for (const nd of newDecks) {
        const idx = updated.findIndex(d => d.name.toLowerCase() === nd.name.toLowerCase());
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], wins: nd.wins, losses: nd.losses };
        } else {
          updated.push(nd);
        }
      }
      return updated;
    });
  }, []);

  const deleteDeck = useCallback((idx) => {
    setDecks(ds => ds.filter((_, i) => i !== idx));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    decks,
    setDecks,
    loading,
    loaded,
    error,
    clearError,
    updateDeck,
    addDecks,
    deleteDeck,
  };
}

// PropTypes for Deck object
export const DeckPropType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  wins: PropTypes.number.isRequired,
  losses: PropTypes.number.isRequired,
});
