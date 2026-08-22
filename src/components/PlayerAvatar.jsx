import PropTypes from "prop-types";
import { playerGradient } from "../utils/stats.js";
import styles from "./PlayerAvatar.module.css";

/**
 * A player's initial on their own colour. Sizing and corner radius come from
 * the caller's class, so the same component covers the 80px landing-page
 * circle and the 24px badge in a deck row.
 * @param {Object} props
 * @param {string} props.player - Player slug; anyone outside the pod gets the
 *   neutral fallback gradient rather than no background at all
 * @param {string} [props.className] - Caller's size/radius class
 * @param {string} [props.background] - Overrides the player's gradient
 */
export function PlayerAvatar({ player, className = "", background = null }) {
  return (
    <div
      className={`${styles.avatar} ${className}`}
      style={{ background: background ?? playerGradient(player) }}
    >
      {player[0]}
    </div>
  );
}

PlayerAvatar.propTypes = {
  // Any slug, not just the pod: the games archive renders added players too.
  player: PropTypes.string.isRequired,
  className: PropTypes.string,
  background: PropTypes.string,
};
