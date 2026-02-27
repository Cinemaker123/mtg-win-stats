import PropTypes from "prop-types";
import PropTypes from "prop-types";
import styles from './Card.module.css';

/**
 * Card container primitive
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {'sm'|'md'|'lg'} props.padding - Card padding size
 * @param {boolean} props.hover - Whether to show hover effect
 * @param {string} props.className - Additional CSS class
 */
export function Card({ 
  children, 
  padding = 'md', 
  hover = false,
  className = '',
}) {
  const classNames = [
    styles.card,
    styles[padding],
    hover && styles.hover,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      {children}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  padding: PropTypes.oneOf(['sm', 'md', 'lg']),
  hover: PropTypes.bool,
  className: PropTypes.string,
};
