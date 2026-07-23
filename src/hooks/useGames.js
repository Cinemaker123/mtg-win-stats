import { useCallback, useEffect, useState } from "react";
import { supabase, getGames } from "../supabaseClient.js";

/**
 * @typedef {Object} GameParticipant
 * @property {string} player - Player identifier
 * @property {string} deck - Deck name (plain text, history-safe)
 * @property {boolean} isWinner - Whether this participant won the game
 */

/**
 * @typedef {Object} Game
 * @property {string} id - Game uuid
 * @property {string} playedAt - ISO timestamp
 * @property {GameParticipant[]} participants
 */

/**
 * Hook for the games archive (Data Model v2) with realtime updates.
 * Mutations (addGame/updateGame/deleteGame) are called directly from
 * components; the realtime subscription refetches afterwards.
 * @returns {{games: Game[], loading: boolean, error: string|null, retry: Function}}
 */
export function useGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);

    return getGames()
      .then(data => setGames(data))
      .catch(e => {
        console.error("Failed to load games:", e);
        setError("Fehler beim Laden der Spiele.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Load games on mount
  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refetch when games or participants change (debounced)
  useEffect(() => {
    let timeout = null;
    const schedule = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(load, 500);
    };

    const channel = supabase
      .channel("games-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_participants" }, schedule)
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { games, loading, error, retry: load };
}
