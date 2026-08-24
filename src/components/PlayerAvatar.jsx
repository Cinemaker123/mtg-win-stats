import PropTypes from "prop-types";
import styles from "./PlayerAvatar.module.css";

/**
 * A player's initial on their own colour. Sizing and corner radius come from
 * the caller's class, so the same component covers the 80px landing-page
 * circle and the 24px badge in a deck row.
 * @param {Object} props
 * @param {string} props.player - Player slug; anyone outside the pod gets the
 *   neutral fallback gradient rather than no background at all
 * @param {string} [props.className] - Caller's size/radius class
 * @param {boolean} [props.flat] - Use the player's flat accent colour
 *   instead of their gradient
 */
export function PlayerAvatar({ player, className = "", flat = false }) {
  return (
    <div
      className={`${styles.avatar} ${className}`}
      data-player={player}
      data-flat={flat || undefined}
    >
      {player[0]}
    </div>
  );
}

PlayerAvatar.propTypes = {
  // Any slug, not just the pod: the games archive renders added players too.
  player: PropTypes.string.isRequired,
  className: PropTypes.string,
  flat: PropTypes.bool,
};
