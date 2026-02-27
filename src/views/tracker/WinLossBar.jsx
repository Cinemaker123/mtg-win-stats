import PropTypes from "prop-types";
import { DeckPropType } from "../../hooks/useDecks.js";
import styles from "../TrackerView.module.css";
import { Btn } from "./Btn.jsx";

/**
 * Individual deck bar with win/loss display and controls
 * @param {Object} props
 * @param {Deck} props.deck - Deck data
 * @param {Function} props.onIncWin - Increment wins
 * @param {Function} props.onDecWin - Decrement wins
 * @param {Function} props.onIncLoss - Increment losses
 * @param {Function} props.onDecLoss - Decrement losses
 * @param {Function} props.onDelete - Delete deck
 */
export function WinLossBar({ deck, onIncWin, onDecWin, onIncLoss, onDecLoss, onDelete }) {
  const total = deck.wins + deck.losses;
  const winPct = total === 0 ? 50 : (deck.wins / total) * 100;
  const lossPct = 100 - winPct;
  const wrColor = total === 0 ? "var(--color-text-muted)" : (winPct >= 50 ? "var(--color-success)" : "var(--color-error)");

  return (
    <div className={styles.deckCard}>
      {/* Row 1: Name + WR% + delete */}
      <div className={styles.deckHeader}>
        <div className={styles.deckName}>{deck.name}</div>
        <div className={styles.deckWinRate} style={{ color: wrColor }}>
          {total === 0 ? "—" : `${Math.round(winPct)}%`}
        </div>
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
      </div>

      {/* Row 2: Bar */}
      <div className={styles.winLossBar}>
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
      </div>

      {/* Row 3: Controls */}
      <div className={styles.controls}>
        <span className={styles.controlLabelWin}>W</span>
        <Btn onClick={onIncWin} bg="var(--color-btn-win-bg)" color="var(--color-success)" hoverBg="var(--color-btn-win-hover)" title="Sieg hinzufügen">+</Btn>
        <Btn onClick={onDecWin} bg="var(--color-btn-neutral-bg)" color="var(--color-btn-neutral-text)" hoverBg="var(--color-btn-neutral-hover)" title="Sieg entfernen">−</Btn>
        <div className={styles.controlSpacer} />
        <Btn onClick={onDecLoss} bg="var(--color-btn-neutral-bg)" color="var(--color-btn-neutral-text)" hoverBg="var(--color-btn-neutral-hover)" title="Niederlage entfernen">−</Btn>
        <Btn onClick={onIncLoss} bg="var(--color-btn-loss-bg)" color="var(--color-error)" hoverBg="var(--color-btn-loss-hover)" title="Niederlage hinzufügen">+</Btn>
        <span className={styles.controlLabelLoss}>L</span>
      </div>
    </div>
  );
}

WinLossBar.propTypes = {
  deck: DeckPropType.isRequired,
  onIncWin: PropTypes.func.isRequired,
  onDecWin: PropTypes.func.isRequired,
  onIncLoss: PropTypes.func.isRequired,
  onDecLoss: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
