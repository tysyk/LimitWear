import { useLang } from '../../context/LangContext';
import { useCountdown } from '../../hooks/useCountdown';
import styles from './CountdownTimer.module.css';

export default function CountdownTimer({ deadline, size = 'md' }) {
  const { t } = useLang();
  const time = useCountdown(deadline);

  if (!time) return null;
  if (time.expired) return <span className={`${styles.expired} ${styles[size]}`}>ENDED</span>;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className={`${styles.timer} ${styles[size]}`}>
      <span className={styles.label}>{t('card.timeLeft')}</span>
      <div className={styles.display}>
        {time.days > 0 && <><span className={styles.unit}>{pad(time.days)}д</span><span className={styles.sep}> </span></>}
        <span className={styles.unit}>{pad(time.hours)}г</span>
        <span className={styles.sep}> </span>
        <span className={styles.unit}>{pad(time.minutes)}хв</span>
        <span className={styles.sep}> </span>
        <span className={styles.unit}>{pad(time.seconds)}с</span>
      </div>
    </div>
  );
}
