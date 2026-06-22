import styles from './ProgressBar.module.css';

export default function ProgressBar({ reserved, total }) {
  const pct = Math.min(100, Math.round((reserved / total) * 100));

  return (
    <div className={styles.wrap}>
      <div className={styles.numbers}>
        <span>
          <strong className={styles.reserved}>{reserved}</strong>
          <span className={styles.slash}>/</span>
          <span className={styles.total}>{total}</span>
        </span>
        <span className={styles.pct}>{pct}%</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
