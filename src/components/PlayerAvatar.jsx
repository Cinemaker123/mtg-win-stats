import PropTypes from "prop-types";
import { PLAYERS, PLAYER_GRADIENTS } from "../utils/stats.js";
import styles from "./PlayerAvatar.module.css";

/**
 * A player's initial on their own colour. Sizing and corner radius come from
 * the caller's class, so the same component covers the 80px landing-page
 * circle and the 24px badge in a deck row.
 * @param {Object} props
 * @param {string} props.player - Player identifier
 * @param {string} [props.className] - Caller's size/radius class
 * @param {string} [props.background] - Overrides the player's gradient
 */
export function PlayerAvatar({ player, className = "", background = null }) {
  return (
    <div
      className={`${styles.avatar} ${className}`}
      style={{ background: background ?? PLAYER_GRADIENTS[player] }}
    >
      {player[0]}
    </div>
  );
}

PlayerAvatar.propTypes = {
  player: PropTypes.oneOf(PLAYERS).isRequired,
  className: PropTypes.string,
  background: PropTypes.string,
};
