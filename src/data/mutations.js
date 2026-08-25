import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDeckToRegistry } from "../supabaseClient.js";

/**
 * Quick-add a deck to the registry. On success it inserts the deck into the
 * ["decks"] cache so the dropdown shows it before the realtime refetch. The id
 * must be present — the game save resolves deck_id from this cache entry.
 *
 * A null id means the deck already existed (addDeckToRegistry ignores
 * duplicates), so the cache already holds it and no insert is needed.
 */
export function useAddDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ player, name }) => addDeckToRegistry(player, name),
    onSuccess: (id, { player, name }) => {
      if (!id) return;
      queryClient.setQueryData(["decks"], current => {
        const next = { ...(current || {}) };
        next[player] = [...(next[player] || []), { id, name, wins: 0, losses: 0 }];
        return next;
      });
    },
  });
}
