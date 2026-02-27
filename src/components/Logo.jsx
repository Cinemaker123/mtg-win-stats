import PropTypes from "prop-types";
import logoImage from "../6214ff04ba3c68672b23d6cf.png";
import styles from './Logo.module.css';

/**
 * MTG logo component
 * @param {Object} props
 * @param {number} props.size - Logo size in pixels
 */
export function Logo({ size = 80 }) {
  return (
    <img 
      src={logoImage} 
      alt="MTG Logo" 
      className={styles.logo}
      style={{ width: size, height: size }}
    />
  );
}

Logo.propTypes = {
  size: PropTypes.number,
};
