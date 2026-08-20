import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { PLAYERS, PLAYER_GRADIENTS, PLAYER_COLORS } from "../../utils/stats.js";
import styles from "../TrackerView.module.css";

/**
 * Panel for adding a single deck to the registry.
 * Wins/losses are no longer entered manually — they come from recorded games.
 * @param {Object} props
 * @param {string} props.player - Player identifier
 * @param {Function} props.addDecks - Callback to add decks
 * @param {Function} props.onImport - Callback with a toast: { type, message }
 * @param {boolean} props.autoFocus - Whether to auto-focus input when no decks exist
 */
export function ImportPanel({ player, addDecks, onImport, autoFocus = false }) {
  const [singleDeckName, setSingleDeckName] = useState("");
  const inputRef = useRef(null);
  const accentColor = PLAYER_COLORS[player];

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const addSingleDeck = () => {
    const name = singleDeckName.trim();
    if (!name) {
      onImport({ type: "error", message: "❌ Bitte gib einen Decknamen ein" });
      return;
    }
    addDecks([{ name, wins: 0, losses: 0 }]);
    setSingleDeckName("");
    onImport({ type: "success", message: `✅ "${name}" hinzugefügt` });
  };

  return (
    <div className={styles.importContent}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", marginTop: "8px" }}>
        <input
          type="text"
          value={singleDeckName}
          onChange={e => setSingleDeckName(e.target.value)}
          placeholder="Neues Deck hinzufügen..."
          className={styles.importTextarea}
          style={{ flex: 1, height: "36px", "--accent": accentColor }}
          onKeyDown={e => e.key === "Enter" && addSingleDeck()}
          ref={inputRef}
        />
        <button
          onClick={addSingleDeck}
          className={styles.importButton}
          style={{
            width: "auto",
            padding: "0 12px",
            marginTop: 0,
            background: PLAYER_GRADIENTS[player],
            boxShadow: `0 4px 14px ${accentColor}50`,
          }}
        >
          Deck hinzufügen
        </button>
      </div>
    </div>
  );
}

ImportPanel.propTypes = {
  player: PropTypes.oneOf(PLAYERS).isRequired,
  addDecks: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
  autoFocus: PropTypes.bool,
};
