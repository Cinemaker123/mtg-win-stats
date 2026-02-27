import styles from './StatCard.module.css';

export function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className={styles.card}>
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
