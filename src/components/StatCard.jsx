import PropTypes from "prop-types";
import styles from './StatCard.module.css';

/**
 * Statistics card component with accent bar and icon
 * @param {Object} props
 * @param {string} props.label - Card label
 * @param {string|number} props.value - Main value to display
 * @param {React.ReactNode} [props.sub] - Subtitle (text or nodes)
 * @param {string} props.accent - Accent token name: info, activity,
 *   legendary, good or struggling. theme.css maps it to a colour.
 * @param {string} props.icon - Emoji icon
 * @param {boolean} [props.wide] - Span the full grid row instead of one
 *   column — for values too long to share a half-width cell gracefully
 * @param {React.Ref} [props.valueRef] - Ref on the value element, so a parent
 *   can measure whether the value clips and decide to widen the card
 */
export function StatCard({ label, value, sub, accent, icon, wide = false, valueRef = null }) {
  return (
    <div
      className={wide ? `${styles.card} ${styles.wide}` : styles.card}
      data-accent={accent}
    >
      <div className={styles.accentBar} />
      <div className={styles.iconWrapper}>
        {icon}
      </div>
      <div className={styles.content}>
        <div className={styles.label}>{label}</div>
        <div ref={valueRef} className={styles.value}>{value}</div>
        {sub && <div className={styles.sub}>{sub}</div>}
      </div>
    </div>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  sub: PropTypes.node,
  accent: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  wide: PropTypes.bool,
  valueRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
};
