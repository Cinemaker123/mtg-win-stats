import { useState } from "react";
import PropTypes from "prop-types";
import { PLAYER_GRADIENTS, PLAYER_COLORS } from "../../utils/stats.js";
import styles from "../TrackerView.module.css";

/**
 * Import panel for bulk importing deck data
 * Supports German format: "Gewonnen IIII" / "Verloren 3"
 * @param {Object} props
 * @param {string} props.player - Player identifier
 * @param {Function} props.addDecks - Callback to add imported decks
 * @param {Function} props.onImport - Callback with import result message
 * @param {boolean} props.isOpen - Whether the panel is expanded
 * @param {Function} props.setIsOpen - Callback to toggle panel state
 */
export function ImportPanel({ player, addDecks, onImport, isOpen, setIsOpen }) {
  const [importText, setImportText] = useState("");
  const accentColor = PLAYER_COLORS[player];

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
        const wm = line.match(/^Gewonnen\s+(I+)$/i);
        const lm = line.match(/^Verloren\s+(I+)$/i);
        const wmNum = line.match(/^Gewonnen\s+(\d+)$/i);
        const lmNum = line.match(/^Verloren\s+(\d+)$/i);
        
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
    setIsOpen(false);
    onImport(`✅ ${newDecks.length} Deck${newDecks.length > 1 ? "s" : ""} importiert`);
  };

  return (
    <div className={styles.importPanel}>
      <button
        onClick={() => setIsOpen(o => !o)}
        className={styles.importToggle}
        style={{ color: accentColor }}
      >
        <span>📥 Import</span>
        <span 
          className={styles.importToggleIcon}
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ⌄
        </span>
      </button>
      
      {isOpen && (
        <div className={styles.importContent}>
          <div className={styles.importHint}>
            Name · Gewonnen 5/IIIII · Verloren 3/III — Leerzeile zwischen Decks
          </div>
          <textarea
            rows={4}
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder={"Azorius Control\nGewonnen 6\nVerloren 3\n\nMono Red Burn\nGewonnen IIII\nVerloren 5"}
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
            }}
          >
            Decks importieren
          </button>
        </div>
      )}
    </div>
  );
}

ImportPanel.propTypes = {
  player: PropTypes.oneOf(["baum", "mary", "pascal", "wewy"]).isRequired,
  addDecks: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
};
