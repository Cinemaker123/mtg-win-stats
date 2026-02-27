import { Logo } from "../../components/Logo.jsx";
import styles from "../TrackerView.module.css";
import { WinLossBar } from "./WinLossBar.jsx";

export function DecksTab({ decks, updateDeck, deleteDeck }) {
  return (
    <>
      <div className={styles.sectionTitle}>
        <div className={styles.sectionTitleRow}>Decks</div>
        <div className={styles.sectionSubtitle}>Tippe auf +, um einen Sieg oder eine Niederlage zu erfassen</div>
      </div>
      
      {decks.length === 0 && (
        <div className={styles.emptyState} style={{ padding: "40px 20px" }}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
            <Logo size={60} />
          </div>
          <div className={styles.emptyTitle}>Noch keine Decks — benutze den Import unten!</div>
        </div>
      )}
      
      {decks.map((deck, i) => (
        <WinLossBar
          key={i}
          deck={deck}
          onIncWin={() => updateDeck(i, d => ({ ...d, wins: d.wins + 1 }))}
          onDecWin={() => updateDeck(i, d => ({ ...d, wins: Math.max(0, d.wins - 1) }))}
          onIncLoss={() => updateDeck(i, d => ({ ...d, losses: d.losses + 1 }))}
          onDecLoss={() => updateDeck(i, d => ({ ...d, losses: Math.max(0, d.losses - 1) }))}
          onDelete={() => deleteDeck(i)}
        />
      ))}
    </>
  );
}
