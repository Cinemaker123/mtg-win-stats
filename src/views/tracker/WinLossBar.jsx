import PropTypes from "prop-types";
import { DeckPropType } from "../../hooks/useDecks.js";
import styles from "../TrackerView.module.css";

/**
 * Individual deck bar with win/loss display (read-only).
 * Results come from recorded games, so there are no manual +/- controls.
 * The delete button is only shown for decks in the registry (onDelete set).
 * @param {Object} props
 * @param {Deck} props.deck - Deck data
 * @param {Function|null} props.onDelete - Delete deck from the registry
 */
export function WinLossBar({ deck, onDelete = null }) {
  const total = deck.wins + deck.losses;
  const winPct = total === 0 ? 50 : (deck.wins / total) * 100;
  const lossPct = 100 - winPct;

  return (
    <div className={styles.deckCard}>
      {/* Row 1: Name + delete */}
      <div className={styles.deckHeader}>
        <div className={styles.deckName}>{deck.name}</div>
        {onDelete && (
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
};
