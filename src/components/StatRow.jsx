import PropTypes from "prop-types";
import { formatPct } from "../utils/stats.js";
import styles from "./StatRow.module.css";

/**
 * The two ranked lists on Global Stats are the same row with different
 * typography: players get a slightly larger win rate, decks get an ellipsis
 * on a name the user typed.
 */
const VARIANTS = {
  player: { name: styles.playerName, meta: styles.playerMeta, winRate: styles.playerWinRate },
  deck: { name: styles.deckName, meta: styles.deckMeta, winRate: styles.deckWinRate },
};

/**
 * One row of a ranked list: avatar, a name with a smaller line beneath it,
 * and the tier-coloured win rate above the W/L record. Anything passed as
 * children is appended after the numbers (the player rows add a bar).
 * @param {Object} props
 * @param {'player'|'deck'} props.variant - Which typography to use
 * @param {React.ReactNode} props.avatar - Leading avatar element
 * @param {string} props.name - Primary label
 * @param {React.ReactNode} props.meta - Secondary line under the name
 * @param {Object} props.tier - Win-rate tier: { tier, icon, label }
 * @param {number} props.winRate - Win rate as 0-1
 * @param {number} props.wins - Wins in the record
 * @param {number} props.losses - Losses in the record
 */
export function StatRow({ variant, avatar, name, meta, tier, winRate, wins, losses, children = null }) {
  const v = VARIANTS[variant];
  return (
    <div className={styles.row}>
      {avatar}
      <div className={styles.info}>
        <div className={v.name}>{name}</div>
        <div className={v.meta}>{meta}</div>
      </div>
      <div className={styles.stats}>
        <div className={v.winRate} data-tier={tier.tier}>
          <span title={tier.label}>{tier.icon}</span>{" "}
          {formatPct(winRate)}
        </div>
        <div className={styles.record}>{wins}W / {losses}L</div>
      </div>
      {children}
    </div>
  );
}

StatRow.propTypes = {
  variant: PropTypes.oneOf(Object.keys(VARIANTS)).isRequired,
  avatar: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
  meta: PropTypes.node.isRequired,
  tier: PropTypes.shape({
    tier: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  winRate: PropTypes.number.isRequired,
  wins: PropTypes.number.isRequired,
  losses: PropTypes.number.isRequired,
  children: PropTypes.node,
};
