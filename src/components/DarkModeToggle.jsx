import PropTypes from "prop-types";
import styles from './DarkModeToggle.module.css';

/**
 * Dark mode toggle button with sun/moon icons
 * @param {Object} props
 * @param {boolean} props.isDark - Current dark mode state
 * @param {Function} props.onToggle - Callback to toggle dark mode
 */
export function DarkModeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? "Hellmodus" : "Dunkelmodus"}
      className={styles.button}
    >
      {isDark ? (
        // Sun icon (B&W for dark mode - shows when in dark mode, click to go light)
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f0f0f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        // Moon icon (B&W for light mode - shows when in light mode, click to go dark)
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a1a2e" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

DarkModeToggle.propTypes = {
  isDark: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};
