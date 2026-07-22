import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { supabase, getDecks, saveDecks } from "../supabaseClient.js";

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
 * @property {boolean} loaded - Whether initial load completed successfully
 * @property {string|null} error - Error message if any
 * @property {Function} clearError - Clear error state
 * @property {Function} retry - Retry the initial load after a failure
 * @property {Function} updateDeck - Update a specific deck by index
 * @property {Function} addDecks - Add or merge new decks, returns { added, updated }
 * @property {Function} deleteDeck - Delete a deck by index, returns { deck, index } for undo
 * @property {Function} restoreDeck - Reinsert a previously deleted deck (undo)
 */

// Ignore realtime events caused by our own writes within this window
const ECHO_SUPPRESSION_MS = 1000;

/**
 * Hook for managing deck data with Supabase persistence.
 *
 * Saves are gated by a dirty flag: they only fire after local mutations,
 * never on load — so a failed fetch can never wipe remote data, and
 * page loads don't trigger redundant upserts. Local state is authoritative;
 * `saveDecks` performs a full sync (upsert + delete missing).
 *
 * Subscribes to realtime changes for this player and refetches on remote
 * writes (echoes of own saves are suppressed).
 *
 * @param {string} player - Player identifier
 * @returns {UseDecksReturn} Deck state and operations
 */
export function useDecks(player) {
  const [decks, setDecks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dirtyRef = useRef(false);
  const lastLocalWriteRef = useRef(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    return getDecks(player)
      .then(data => {
        setDecks(data);
        setLoaded(true); // only on success — a failed load must not enable saves
      })
      .catch(e => {
        console.error("Failed to load from Supabase:", e);
        setError("Fehler beim Laden. Bitte erneut versuchen.");
      })
      .finally(() => setLoading(false));
  }, [player]);

  // Load from Supabase on mount
  useEffect(() => {
    load();
  }, [load]);

  // Save to Supabase after local mutations only (debounced)
  useEffect(() => {
    if (!loaded || !dirtyRef.current) return;

    const timeout = setTimeout(() => {
      lastLocalWriteRef.current = Date.now();
      saveDecks(player, decks)
        .then(() => {
          dirtyRef.current = false;
        })
        .catch(e => {
          console.error("Failed to save to Supabase:", e);
          setError("Speichern fehlgeschlagen. Änderungen gehen möglicherweise verloren.");
        });
    }, 300);

    return () => clearTimeout(timeout);
  }, [decks, loaded, player]);

  // Realtime: refetch when another client changes this player's decks
  useEffect(() => {
    const channel = supabase
      .channel(`decks-${player}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "decks", filter: `player=eq.${player}` },
        () => {
          // Ignore echoes of our own recent writes
          if (Date.now() - lastLocalWriteRef.current < ECHO_SUPPRESSION_MS) return;
          // Don't clobber unsaved local edits; our next sync wins anyway
          if (dirtyRef.current) return;
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [player, load]);

  const updateDeck = useCallback((idx, fn) => {
    dirtyRef.current = true;
    setDecks(ds => ds.map((d, i) => (i === idx ? fn(d) : d)));
  }, []);

  const addDecks = useCallback((newDecks) => {
    dirtyRef.current = true;
    let added = 0;
    let updated = 0;
    const merged = [...decks];
    for (const nd of newDecks) {
      const idx = merged.findIndex(d => d.name.toLowerCase() === nd.name.toLowerCase());
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], wins: nd.wins, losses: nd.losses };
        updated++;
      } else {
        merged.push(nd);
        added++;
      }
    }
    setDecks(merged);
    return { added, updated };
  }, [decks]);

  const deleteDeck = useCallback((idx) => {
    const removed = decks[idx];
    if (!removed) return null;
    dirtyRef.current = true;
    setDecks(ds => ds.filter((_, i) => i !== idx));
    return { deck: removed, index: idx };
  }, [decks]);

  const restoreDeck = useCallback((deck, index) => {
    dirtyRef.current = true;
    setDecks(ds => {
      const next = [...ds];
      next.splice(Math.min(index, next.length), 0, deck);
      return next;
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    decks,
    loading,
    loaded,
    error,
    clearError,
    retry: load,
    updateDeck,
    addDecks,
    deleteDeck,
    restoreDeck,
  };
}

// PropTypes for Deck object
export const DeckPropType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  wins: PropTypes.number.isRequired,
  losses: PropTypes.number.isRequired,
});
