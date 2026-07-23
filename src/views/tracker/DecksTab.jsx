import PropTypes from "prop-types";
import { Logo } from "../../components/Logo.jsx";
import { DeckPropType } from "../../hooks/useDecks.js";
import styles from "../TrackerView.module.css";
import { WinLossBar } from "./WinLossBar.jsx";

/**
 * Decks tab: read-only win/loss bars (combined legacy + game stats).
 * Decks that only exist in recorded games (not in the registry) are shown
 * without a delete button — they disappear when their games are removed.
 * @param {Object} props
 * @param {Deck[]} props.decks - Combined deck stats to display
 * @param {Deck[]} props.registryDecks - Decks in the registry (deletable)
 * @param {Function} props.deleteDeck - Delete a registry deck by name
 */
export function DecksTab({ decks, registryDecks, deleteDeck }) {
  const registryNames = new Set(registryDecks.map(d => d.name.toLowerCase()));

  return (
    <>
      {decks.length === 0 && (
        <div className={styles.emptyState} style={{ padding: "40px 20px" }}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
            <Logo size={60} />
          </div>
          <div className={styles.emptyTitle}>Noch keine Decks</div>
        </div>
      )}

      {decks.map(deck => (
        <WinLossBar
          key={deck.name}
          deck={deck}
          onDelete={
            registryNames.has(deck.name.toLowerCase())
              ? () => deleteDeck(deck.name)
              : null
          }
        />
      ))}
    </>
  );
}

DecksTab.propTypes = {
  decks: PropTypes.arrayOf(DeckPropType).isRequired,
  registryDecks: PropTypes.arrayOf(DeckPropType).isRequired,
  deleteDeck: PropTypes.func.isRequired,
};
