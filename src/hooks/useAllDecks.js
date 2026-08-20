import { createContext, useContext } from "react";

/**
 * @typedef {Object} Deck
 * @property {string} name - Deck name
 * @property {number} wins - Frozen legacy wins
 * @property {number} losses - Frozen legacy losses
 */

export const AllDecksContext = createContext(null);

/**
 * Read every player's deck registry, grouped by player. Fetched and kept
 * live once by `AllDecksProvider` (mounted at the app root), the same way
 * `GamesProvider` owns the games archive — before this, Global Stats ran its
 * own realtime subscription and the new-game modal refetched on every open.
 * @returns {{decksByPlayer: Object<string, Deck[]>, loading: boolean, error: string|null, retry: Function, addDeckLocally: Function}}
 */
export function useAllDecks() {
  const ctx = useContext(AllDecksContext);
  if (!ctx) {
    throw new Error("useAllDecks must be used within an AllDecksProvider");
  }
  return ctx;
}
