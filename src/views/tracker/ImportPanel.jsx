import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { PLAYER_GRADIENTS, PLAYER_COLORS } from "../../utils/stats.js";
import styles from "../TrackerView.module.css";

/**
 * Import panel for bulk importing deck data
 * Supports German format: "Gewonnen: IIII" / "Verloren: 3"
 * @param {Object} props
 * @param {string} props.player - Player identifier
 * @param {Function} props.addDecks - Callback to add imported decks
 * @param {Function} props.onImport - Callback with import result message
 * @param {boolean} props.autoFocus - Whether to auto-focus input when no decks exist
 */
export function ImportPanel({ player, addDecks, onImport, autoFocus = false }) {
  const [importText, setImportText] = useState("");
  const [singleDeckName, setSingleDeckName] = useState("");
  const inputRef = useRef(null);
  const accentColor = PLAYER_COLORS[player];

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const parseImport = () => {
    const text = importText.trim();
    if (!text) return;
    
    const blocks = text.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
    const newDecks = [];
    
    for (const block of blocks) {
      const lines = block.split("\n").map(l => l.trim());
      if (!lines.length) continue;
      
      const name = lines[0];
      let wins = 0, losses = 0;
      
      for (const line of lines.slice(1)) {
        const wm = line.match(/^Gewonnen:?\s+(I+)$/i);
        const lm = line.match(/^Verloren:?\s+(I+)$/i);
        const wmNum = line.match(/^Gewonnen:?\s+(\d+)$/i);
        const lmNum = line.match(/^Verloren:?\s+(\d+)$/i);
        
        if (wm) wins = wm[1].length;
        if (lm) losses = lm[1].length;
        if (wmNum) wins = parseInt(wmNum[1], 10);
        if (lmNum) losses = parseInt(lmNum[1], 10);
      }
      
      newDecks.push({ name, wins, losses });
    }
    
    if (!newDecks.length) {
      onImport("❌ Keine Decks gefunden. Prüfe das Format.");
      return;
    }
    
    addDecks(newDecks);
    setImportText("");
    onImport(`✅ ${newDecks.length} Deck${newDecks.length > 1 ? "s" : ""} importiert`);
  };

  const addSingleDeck = () => {
    const name = singleDeckName.trim();
    if (!name) {
      onImport("❌ Bitte gib einen Decknamen ein");
      return;
    }
    addDecks([{ name, wins: 0, losses: 0 }]);
    setSingleDeckName("");
    onImport(`✅ "${name}" hinzugefügt`);
  };

  return (
    <div className={styles.importContent}>
      {/* Single deck input */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", marginTop: "8px" }}>
        <input
          type="text"
          value={singleDeckName}
          onChange={e => setSingleDeckName(e.target.value)}
          placeholder="Neues Deck hinzufügen..."
          className={styles.importTextarea}
          style={{ flex: 1, height: "36px" }}
          onFocus={e => e.target.style.borderColor = accentColor}
          onBlur={e => e.target.style.borderColor = ""}
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

      <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "12px 0" }} />

      {/* Bulk import */}
      <div className={styles.importHint}>
        Name · Gewonnen: 5/IIIII · Verloren: 3/III — Leerzeile zwischen Decks
      </div>
      <textarea
        rows={5}
        value={importText}
        onChange={e => setImportText(e.target.value)}
        placeholder={"Deckname\nGewonnen: 10\nVerloren: 5"}
        className={styles.importTextarea}
        onFocus={e => e.target.style.borderColor = accentColor}
        onBlur={e => e.target.style.borderColor = ""}
      />
      <button
        onClick={parseImport}
        className={styles.importButton}
        style={{ 
          background: PLAYER_GRADIENTS[player],
          boxShadow: `0 4px 14px ${accentColor}50`,
          padding: "8px",
        }}
      >
        Importieren
      </button>
    </div>
  );
}

ImportPanel.propTypes = {
  player: PropTypes.oneOf(["baum", "mary", "pascal", "wewy"]).isRequired,
  addDecks: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
  autoFocus: PropTypes.bool,
};
