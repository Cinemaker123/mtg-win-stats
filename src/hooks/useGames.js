import { createContext, useContext } from "react";

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

export const GamesContext = createContext(null);

/**
 * Read the shared games archive (Data Model v2). The data is fetched and
 * kept live once by `GamesProvider` (mounted at the app root) so every
 * view reads the same cache instead of each fetching and subscribing to
 * realtime independently.
 * @returns {{games: Game[], loading: boolean, error: string|null, retry: Function}}
 */
export function useGames() {
  const ctx = useContext(GamesContext);
  if (!ctx) {
    throw new Error("useGames must be used within a GamesProvider");
  }
  return ctx;
}
