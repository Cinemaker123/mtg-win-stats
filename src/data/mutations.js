import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDeckToRegistry, renameDeckRegistry, deleteDeckById, restoreDeckRow } from "../supabaseClient.js";

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

// Shared optimistic-cache helpers over the ["decks"] key. Each mutation cancels
// in-flight fetches, snapshots the cache for rollback, and edits it in place.
function setDeckCache(queryClient, edit) {
  queryClient.setQueryData(["decks"], current => edit({ ...(current || {}) }));
}

/**
 * Rename a deck by id. The registry row is the only write — game history joins
 * on deck_id, so the new name shows everywhere through getGames().
 */
export function useRenameDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }) => renameDeckRegistry(id, name),
    onMutate: async ({ player, id, name }) => {
      await queryClient.cancelQueries({ queryKey: ["decks"] });
      const previous = queryClient.getQueryData(["decks"]);
      setDeckCache(queryClient, next => {
        next[player] = (next[player] || []).map(d => (d.id === id ? { ...d, name } : d));
        return next;
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && queryClient.setQueryData(["decks"], ctx.previous),
  });
}

/**
 * Delete a deck by id, per-row. Optimistically removes it from the cache and
 * rolls back on error. The caller keeps the removed deck for an undo restore.
 */
export function useDeleteDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => deleteDeckById(id),
    onMutate: async ({ player, id }) => {
      await queryClient.cancelQueries({ queryKey: ["decks"] });
      const previous = queryClient.getQueryData(["decks"]);
      setDeckCache(queryClient, next => {
        next[player] = (next[player] || []).filter(d => d.id !== id);
        return next;
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && queryClient.setQueryData(["decks"], ctx.previous),
  });
}

/**
 * Undo a delete: re-insert the deck with its counts. Optimistically restores it
 * to the cache; the realtime refetch reconciles the real row id.
 */
export function useRestoreDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ player, deck }) => restoreDeckRow(player, deck),
    onMutate: async ({ player, deck }) => {
      await queryClient.cancelQueries({ queryKey: ["decks"] });
      const previous = queryClient.getQueryData(["decks"]);
      setDeckCache(queryClient, next => {
        const list = next[player] || [];
        next[player] = list.some(d => d.id === deck.id) ? list : [...list, deck];
        return next;
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && queryClient.setQueryData(["decks"], ctx.previous),
  });
}
