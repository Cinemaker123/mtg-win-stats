import PropTypes from "prop-types";
import logoImage from "../assets/logo.png";
import styles from './Logo.module.css';

/**
 * MTG logo component
 * @param {Object} props
 * @param {number} [props.size] - Size in pixels; omit to size it from CSS
 */
export function Logo({ size = null }) {
  return (
    <img
      src={logoImage}
      alt="MTG Logo"
      className={styles.logo}
      style={size === null ? undefined : { width: size, height: size }}
    />
  );
}

Logo.propTypes = {
  size: PropTypes.number,
};
