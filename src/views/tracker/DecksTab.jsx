import PropTypes from "prop-types";
import { Logo } from "../../components/Logo.jsx";
import { DeckPropType } from "../../data/deckTypes.js";
import styles from "../TrackerView.module.css";
import { WinLossBar } from "./WinLossBar.jsx";

/**
 * Decks tab: read-only win/loss bars (combined legacy + game stats).
 * Decks that only exist in recorded games (not in the registry) are shown
 * without a delete button — they disappear when their games are removed.
 * @param {Object} props
 * @param {Deck[]} props.decks - Combined deck stats to display
 * @param {Deck[]} props.registryDecks - Decks in the registry (deletable/renamable)
 * @param {Function} props.deleteDeck - Delete a registry deck by name
 * @param {Function} props.renameDeck - Rename a registry deck (oldName, newName)
 */
export function DecksTab({ decks, registryDecks, deleteDeck, renameDeck }) {
  const registryNames = new Set(registryDecks.map(d => d.name.toLowerCase()));

  return (
    <>
      {decks.length === 0 && (
        <div className={styles.emptyState} style={{ padding: "40px 20px" }}>
          <div className={styles.emptyLogoWrapper}>
            <Logo size={60} />
          </div>
          <div className={styles.emptyTitle}>Noch keine Decks</div>
        </div>
      )}

      {decks.map(deck => {
        const inRegistry = registryNames.has(deck.name.toLowerCase());
        return (
          <WinLossBar
            key={deck.name}
            deck={deck}
            onDelete={inRegistry ? () => deleteDeck(deck.name) : null}
            onRename={inRegistry ? renameDeck : null}
          />
        );
      })}
    </>
  );
}

DecksTab.propTypes = {
  decks: PropTypes.arrayOf(DeckPropType).isRequired,
  registryDecks: PropTypes.arrayOf(DeckPropType).isRequired,
  deleteDeck: PropTypes.func.isRequired,
  renameDeck: PropTypes.func.isRequired,
};
