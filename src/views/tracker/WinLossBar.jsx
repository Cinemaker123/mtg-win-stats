import { useState } from "react";
import PropTypes from "prop-types";
import { DeckPropType } from "../../hooks/useDecks.js";
import { winRate } from "../../utils/stats.js";
import styles from "../TrackerView.module.css";

/**
 * Individual deck bar with win/loss display (read-only).
 * Results come from recorded games, so there are no manual +/- controls.
 * Rename/delete buttons are only shown for decks in the registry.
 * @param {Object} props
 * @param {Deck} props.deck - Deck data
 * @param {Function|null} props.onDelete - Delete deck from the registry
 * @param {Function|null} props.onRename - Rename deck (oldName, newName)
 */
export function WinLossBar({ deck, onDelete = null, onRename = null }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(deck.name);
  const total = deck.wins + deck.losses;
  // Only rendered when total > 0, so the zero-games case never shows.
  const winPct = winRate(deck) * 100;
  const lossPct = 100 - winPct;

  const commitRename = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== deck.name) {
      onRename(deck.name, draft);
    }
  };

  return (
    <div className={styles.deckCard}>
      {/* Row 1: Name (inline-editable) + actions */}
      <div className={styles.deckHeader}>
        {editing ? (
          <input
            className={styles.deckNameInput}
            value={draft}
            autoFocus
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(deck.name);
                setEditing(false);
              }
            }}
            onBlur={commitRename}
          />
        ) : (
          <div className={styles.deckName}>{deck.name}</div>
        )}
        {onRename && !editing && (
          <button
            onClick={() => {
              setDraft(deck.name);
              setEditing(true);
            }}
            className={styles.editButton}
            title="Deck umbenennen"
            aria-label={`${deck.name} umbenennen`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>
            </svg>
          </button>
        )}
        {onDelete && !editing && (
          <button
            onClick={onDelete}
            className={styles.deleteButton}
            title="Deck entfernen"
            aria-label={`${deck.name} entfernen`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        )}
      </div>

      {/* Row 2: Bar */}
      <div className={styles.winLossBar}>
        {total === 0 ? (
          <div className={styles.winLossEmpty}>Noch keine Spiele</div>
        ) : (
          <>
            <div
              className={styles.winLossSection}
              style={{
                width: `${winPct}%`,
                background: "var(--gradient-win)",
                minWidth: deck.wins > 0 ? 30 : 0,
              }}
            >
              {deck.wins > 0 && <span className={styles.winLossCount}>{deck.wins}</span>}
            </div>
            <div
              className={styles.winLossSection}
              style={{
                width: `${lossPct}%`,
                background: "var(--gradient-loss)",
                minWidth: deck.losses > 0 ? 30 : 0,
              }}
            >
              {deck.losses > 0 && <span className={styles.winLossCount}>{deck.losses}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

WinLossBar.propTypes = {
  deck: DeckPropType.isRequired,
  onDelete: PropTypes.func,
  onRename: PropTypes.func,
};
