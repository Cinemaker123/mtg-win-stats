import { useState } from "react";
import PropTypes from "prop-types";
import { addPlayer } from "../supabaseClient.js";
import { playerSlug } from "../utils/stats.js";
import styles from "./AddPlayer.module.css";

/**
 * "Neuer Spieler": a button that opens an inline name field and writes one
 * row to the players table. Used in the new-game modal's empty seats.
 *
 * An added player is recorded like anyone else — games, decks, archive entry —
 * but the statistics only ever count the pod (PLAYERS in utils/stats.js), so
 * they stay out of every ranking until someone is added there deliberately.
 * @param {Object} props
 * @param {Function} props.onAdded - Called with the new player's slug
 * @param {string[]} props.knownPlayers - Slugs that already exist, for the
 *   duplicate check (the table's unique constraint is the real guard)
 * @param {string} [props.className] - Caller's layout class
 */
export function AddPlayer({ onAdded, knownPlayers, className = "" }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const close = () => {
    setOpen(false);
    setName("");
    setError(null);
    setSaving(false);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    if (knownPlayers.includes(playerSlug(trimmed))) {
      setError("Diesen Spieler gibt es schon.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const slug = await addPlayer(trimmed);
      close();
      onAdded(slug);
    } catch (e) {
      console.error("Adding player failed:", e);
      setError("Spieler konnte nicht angelegt werden.");
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        className={`${styles.openButton} ${className}`}
        onClick={() => setOpen(true)}
      >
        ＋ Neuer Spieler
      </button>
    );
  }

  return (
    <div className={`${styles.form} ${className}`}>
      <div className={styles.row}>
        <input
          autoFocus
          className={styles.input}
          value={name}
          placeholder="Name"
          onChange={e => setName(e.target.value)}
          // On mobile the field sits low in the grid; nudge it into view above
          // the keyboard once that has had a moment to open.
          onFocus={e => {
            const el = e.target;
            setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
          }}
          onKeyDown={e => {
            // Keep Escape from reaching NewGameModal's window listener, which
            // would close the whole (not-yet-dirty) modal instead of just this
            // field.
            if (e.key === "Enter") { e.stopPropagation(); submit(); }
            if (e.key === "Escape") { e.stopPropagation(); close(); }
          }}
        />
        <button
          type="button"
          className={styles.saveButton}
          disabled={!name.trim() || saving}
          onClick={submit}
        >
          {saving ? "..." : "✓"}
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}

AddPlayer.propTypes = {
  onAdded: PropTypes.func.isRequired,
  knownPlayers: PropTypes.arrayOf(PropTypes.string).isRequired,
  className: PropTypes.string,
};
