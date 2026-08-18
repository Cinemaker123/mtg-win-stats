import PropTypes from "prop-types";
import styles from './StatCard.module.css';

/**
 * Statistics card component with accent bar and icon
 * @param {Object} props
 * @param {string} props.label - Card label
 * @param {string|number} props.value - Main value to display
 * @param {string} [props.sub] - Subtitle text
 * @param {string} props.accent - Accent color (CSS color value)
 * @param {string} props.icon - Emoji icon
 * @param {boolean} [props.wide] - Span the full grid row instead of one
 *   column — for values too long to share a half-width cell gracefully
 */
export function StatCard({ label, value, sub, accent, icon, wide = false }) {
  return (
    <div className={wide ? `${styles.card} ${styles.wide}` : styles.card}>
      <div 
        className={styles.accentBar} 
        style={{ background: accent }}
      />
      <div 
        className={styles.iconWrapper}
        style={{ background: accent + '25' }}
      >
        {icon}
      </div>
      <div className={styles.content}>
        <div className={styles.label}>{label}</div>
        <div className={styles.value}>{value}</div>
        {sub && <div className={styles.sub}>{sub}</div>}
      </div>
    </div>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  sub: PropTypes.string,
  accent: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  wide: PropTypes.bool,
};
