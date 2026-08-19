import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { getAllDecks, addGame, updateGame, addDeckToRegistry } from "../supabaseClient.js";
import { PLAYERS, PLAYER_COLORS, PLAYER_GRADIENTS } from "../utils/stats.js";
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
  const [playersDecks, setPlayersDecks] = useState({});
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [participants, setParticipants] = useState(
    editGame ? editGame.participants.map(p => p.player) : [...PLAYERS]
  );
  const [deckByPlayer, setDeckByPlayer] = useState(() => {
    const map = {};
    if (editGame) editGame.participants.forEach(p => { map[p.player] = p.deck; });
    return map;
  });
  const [winner, setWinner] = useState(
    editGame ? (editGame.participants.find(p => p.isWinner)?.player ?? null) : null
  );
  const [playedAt, setPlayedAt] = useState(
    toLocalInputValue(editGame ? editGame.playedAt : new Date().toISOString())
  );
  const [addingDeckFor, setAddingDeckFor] = useState(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load all players' deck registries on mount (one query, grouped locally)
  useEffect(() => {
    getAllDecks()
      .then(decks => {
        const byPlayer = Object.fromEntries(PLAYERS.map(p => [p, []]));
        decks.forEach(d => { byPlayer[d.player]?.push(d); });
        setPlayersDecks(byPlayer);
      })
      .catch(e => {
        console.error("Failed to load decks for game modal:", e);
        setError("Decks konnten nicht geladen werden.");
      })
      .finally(() => setLoadingDecks(false));
  }, []);

  const availablePlayers = PLAYERS.filter(p => !participants.includes(p));

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
      const id = await addDeckToRegistry(player, name);
      setPlayersDecks(pd => ({
        ...pd,
        [player]: [...(pd[player] || []), { id, name, wins: 0, losses: 0 }],
      }));
      setDeckByPlayer(d => ({ ...d, [player]: name }));
      setAddingDeckFor(null);
      setNewDeckName("");
    } catch (e) {
      console.error("Quick-add deck failed:", e);
      setError("Deck konnte nicht angelegt werden.");
    }
  };

  const isValid =
    participants.length >= 2 &&
    winner !== null &&
    participants.every(p => deckByPlayer[p]);

  const save = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    const payload = {
      playedAt: new Date(playedAt).toISOString(),
      participants: participants.map(p => {
        const deckName = deckByPlayer[p];
        const deckId = (playersDecks[p] || []).find(d => d.name === deckName)?.id ?? null;
        return {
          player: p,
          deck: deckName,
          deckId,
          isWinner: p === winner,
        };
      }),
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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>{editGame ? "Spiel bearbeiten" : "Neues Spiel"}</div>
        <div className={styles.hint}>Tippe ein Feld, um den Gewinner zu wählen 👑</div>

        {error && <div className={styles.error}>{error}</div>}

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
                      <div className={styles.avatar} style={{ background: PLAYER_GRADIENTS[player] }}>
                        {player[0]}
                      </div>
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
              {availablePlayers.length > 0 &&
                [...Array(4 - participants.length)].map((_, i) => (
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
