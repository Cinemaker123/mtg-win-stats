import styles from './Card.module.css';

/**
 * Card container primitive
 * @param {string} padding - 'sm' | 'md' | 'lg'
 * @param {boolean} hover - Whether to show hover effect
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
