import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { addGame, updateGame, addDeckToRegistry } from "../supabaseClient.js";
import { useAllDecks } from "../hooks/useAllDecks.js";
import { PLAYERS, PLAYER_COLORS, MIN_PARTICIPANTS } from "../utils/stats.js";
import { PlayerAvatar } from "./PlayerAvatar.jsx";
import styles from "./NewGameModal.module.css";

/**
 * Format an ISO timestamp for a datetime-local input
 * @param {string} iso - ISO timestamp
 * @returns {string} - YYYY-MM-DDTHH:mm in local time
 */
function toLocalInputValue(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * The form as it looks when the modal opens: every participant in create mode,
 * the recorded line-up in edit mode.
 * @param {Object|null} editGame - game being edited (null = create mode)
 * @returns {{participants: Array, deckByPlayer: Object, winner: string|null, playedAt: string}}
 */
function initialFormState(editGame) {
  const entries = editGame ? editGame.participants : [];
  return {
    participants: editGame ? entries.map(p => p.player) : [...PLAYERS],
    deckByPlayer: Object.fromEntries(entries.map(p => [p.player, p.deck])),
    winner: entries.find(p => p.isWinner)?.player ?? null,
    playedAt: toLocalInputValue(editGame ? editGame.playedAt : new Date().toISOString()),
  };
}

/**
 * Shallow equality for the player → deck map.
 * @param {Object} a - first map
 * @param {Object} b - second map
 * @returns {boolean} - true if both hold the same keys and values
 */
function sameDeckMap(a, b) {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => a[k] === b[k]);
}

/**
 * Modal for entering a game (2x2 player grid) — create and edit mode.
 * Tap a player cell to crown the winner (player-colored border + 👑).
 * Participants can be removed (✕, down to 2) and re-added via empty slots.
 * Decks are picked per player; "＋ Neues Deck" quick-adds to the registry.
 * @param {Object} props
 * @param {Object|null} props.editGame - Game to edit (null = create mode)
 * @param {Function} props.onClose - Close without saving
 * @param {Function} props.onSaved - Called with a toast message after saving
 * @param {Function|null} props.onDelete - Edit mode: delete handler for the game
 */
export function NewGameModal({ editGame = null, onClose, onSaved, onDelete = null }) {
  // Shared with Global Stats and kept live by AllDecksProvider, so opening
  // the modal costs no query at all.
  const {
    decksByPlayer: playersDecks,
    loading: loadingDecks,
    error: decksError,
    addDeckLocally,
  } = useAllDecks();
  // Snapshot of the opening state, kept for the untouched-form check below
  const [initial] = useState(() => initialFormState(editGame));
  const [participants, setParticipants] = useState(initial.participants);
  const [deckByPlayer, setDeckByPlayer] = useState(initial.deckByPlayer);
  const [winner, setWinner] = useState(initial.winner);
  const [playedAt, setPlayedAt] = useState(initial.playedAt);
  const [addingDeckFor, setAddingDeckFor] = useState(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const availablePlayers = PLAYERS.filter(p => !participants.includes(p));

  // Every field lives in local state and the modal is unmounted on close, so
  // dismissing it discards the entry with no undo. Comparing against the
  // opening snapshot means no handler has to remember to flag itself dirty.
  const isDirty =
    addingDeckFor !== null ||
    newDeckName !== "" ||
    winner !== initial.winner ||
    playedAt !== initial.playedAt ||
    participants.length !== initial.participants.length ||
    participants.some((p, i) => p !== initial.participants[i]) ||
    !sameDeckMap(deckByPlayer, initial.deckByPlayer);

  // Backdrop tap and Escape only close an untouched form; once something has
  // been entered, "Abbrechen" is the one way out (an explicit, undoable click).
  const closeIfUntouched = () => {
    if (!isDirty) onClose();
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !isDirty) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDirty, onClose]);

  const removeParticipant = (player) => {
    setParticipants(ps => ps.filter(p => p !== player));
    setDeckByPlayer(d => {
      const next = { ...d };
      delete next[player];
      return next;
    });
    setWinner(w => (w === player ? null : w));
  };

  const addParticipant = (player) => {
    if (!player) return;
    setParticipants(ps => [...ps, player]);
  };

  const quickAddDeck = async (player) => {
    const name = newDeckName.trim();
    if (!name) return;
    // Already in registry (any casing): just select it
    const existing = (playersDecks[player] || []).find(
      d => d.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      setDeckByPlayer(d => ({ ...d, [player]: existing.name }));
      setAddingDeckFor(null);
      setNewDeckName("");
      return;
    }
    try {
      await addDeckToRegistry(player, name);
      addDeckLocally(player, name);
      setDeckByPlayer(d => ({ ...d, [player]: name }));
      setAddingDeckFor(null);
      setNewDeckName("");
    } catch (e) {
      console.error("Quick-add deck failed:", e);
      setError("Deck konnte nicht angelegt werden.");
    }
  };

  const isValid =
    participants.length >= MIN_PARTICIPANTS &&
    winner !== null &&
    participants.every(p => deckByPlayer[p]);

  const save = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    const payload = {
      playedAt: new Date(playedAt).toISOString(),
      participants: participants.map(p => ({
        player: p,
        deck: deckByPlayer[p],
        isWinner: p === winner,
      })),
    };
    try {
      if (editGame) {
        await updateGame(editGame.id, payload);
        onSaved("✅ Spiel aktualisiert");
      } else {
        await addGame(payload);
        onSaved("✅ Spiel gespeichert");
      }
    } catch (e) {
      console.error("Saving game failed:", e);
      setError("Speichern fehlgeschlagen.");
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={closeIfUntouched}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>{editGame ? "Spiel bearbeiten" : "Neues Spiel"}</div>
        <div className={styles.hint}>Tippe ein Feld, um den Gewinner zu wählen 👑</div>

        {(error || decksError) && (
          <div className={styles.error}>{error || decksError}</div>
        )}

        {loadingDecks ? (
          <div className={styles.loading}>Lade Decks...</div>
        ) : (
          <>
            {editGame && (
              <input
                type="datetime-local"
                value={playedAt}
                onChange={e => setPlayedAt(e.target.value)}
                className={styles.dateInput}
              />
            )}

            <div className={styles.grid}>
              {participants.map(player => {
                const isWinner = winner === player;
                const decks = [...(playersDecks[player] || [])].sort(
                  (a, b) => (b.wins + b.losses) - (a.wins + a.losses)
                );
                const currentDeck = deckByPlayer[player];
                const deckMissing = currentDeck && !decks.some(d => d.name === currentDeck);
                return (
                  <div
                    key={player}
                    className={`${styles.cell} ${isWinner ? styles.cellWinner : ""}`}
                    style={{ "--accent": PLAYER_COLORS[player] }}
                    onClick={() => setWinner(isWinner ? null : player)}
                  >
                    <button
                      className={styles.removeBtn}
                      title="Teilnehmer entfernen"
                      aria-label={`${player} entfernen`}
                      onClick={e => {
                        e.stopPropagation();
                        removeParticipant(player);
                      }}
                    >✕</button>
                    {isWinner && <span className={styles.crown}>👑</span>}

                    <div className={styles.playerRow}>
                      <PlayerAvatar player={player} className={styles.avatar} />
                      <span className={styles.playerName}>{player}</span>
                    </div>

                    {addingDeckFor === player ? (
                      <div className={styles.quickAddRow} onClick={e => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={newDeckName}
                          onChange={e => setNewDeckName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && quickAddDeck(player)}
                          placeholder="Deckname..."
                          className={styles.quickAddInput}
                        />
                        <button className={styles.quickAddOk} onClick={() => quickAddDeck(player)}>
                          OK
                        </button>
                      </div>
                    ) : (
                      <div onClick={e => e.stopPropagation()}>
                        <select
                          className={styles.deckSelect}
                          value={currentDeck || ""}
                          onChange={e => setDeckByPlayer(d => ({ ...d, [player]: e.target.value }))}
                        >
                          <option value="">Deck wählen...</option>
                          {decks.map(d => (
                            <option key={d.name} value={d.name}>{d.name}</option>
                          ))}
                          {deckMissing && (
                            <option value={currentDeck}>{currentDeck}</option>
                          )}
                        </select>
                        <button
                          className={styles.quickAdd}
                          onClick={() => {
                            setAddingDeckFor(player);
                            setNewDeckName("");
                          }}
                        >＋ Neues Deck</button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty slots to re-add removed players */}
              {availablePlayers.map((_, i) => (
                  <div key={`empty-${i}`} className={styles.emptyCell}>
                    <select
                      className={styles.deckSelect}
                      value=""
                      onChange={e => addParticipant(e.target.value)}
                    >
                      <option value="">＋ Spieler</option>
                      {availablePlayers.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
              ))}
            </div>

            <div className={styles.actions}>
              {editGame && onDelete && (
                <button className={styles.deleteGameBtn} onClick={() => onDelete(editGame)}>
                  Löschen
                </button>
              )}
              <button className={styles.cancelButton} onClick={onClose}>
                Abbrechen
              </button>
              <button className={styles.saveButton} disabled={!isValid || saving} onClick={save}>
                {saving ? "Speichere..." : "Spiel speichern"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

NewGameModal.propTypes = {
  editGame: PropTypes.shape({
    id: PropTypes.string.isRequired,
    playedAt: PropTypes.string.isRequired,
    participants: PropTypes.arrayOf(PropTypes.shape({
      player: PropTypes.string.isRequired,
      deck: PropTypes.string.isRequired,
      isWinner: PropTypes.bool.isRequired,
    })).isRequired,
  }),
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
};
