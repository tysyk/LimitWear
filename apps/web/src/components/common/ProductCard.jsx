import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import ProgressBar from './ProgressBar';
import CountdownTimer from './CountdownTimer';
import styles from './ProductCard.module.css';

export default function ProductCard({ drop }) {
  const { t } = useLang();

  const statusLabel = {
    funded: t('status.funded'),
    failed: t('status.failed'),
    manufacturing: t('status.manufacturing'),
    completed: t('status.completed'),
  };

  return (
    <Link to={`/drops/${drop._id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <img src={drop.imageUrl} alt={drop.title} className={styles.image}
          onError={(e) => { e.target.src = '/placeholder.jpg'; }} />
        {drop.isNewDrop && drop.status === 'active' && (
          <span className={styles.badge}>NEW <strong>DROP</strong></span>
        )}
        {statusLabel[drop.status] && (
          <span className={`${styles.statusBadge} ${styles[drop.status]}`}>
            {statusLabel[drop.status]}
          </span>
        )}
        <div className={styles.overlay}>
          <span className={styles.viewBtn}>{t('card.viewDrop')}</span>
        </div>
      </div>

      <div className={styles.info}>
        <h3 className={styles.title}>{drop.title.toUpperCase()}</h3>
        <div className={styles.category}>{drop.category}</div>
        <ProgressBar reserved={drop.reservedQuantity} total={drop.totalQuantity} />
        <div className={styles.meta}>
          <span className={styles.price}>
            <strong>{drop.price.toLocaleString()}</strong> грн
          </span>
          {drop.status === 'active' && (
            <CountdownTimer deadline={drop.deadline} size="sm" />
          )}
        </div>
        {drop.status === 'active' && (
          <button className={styles.preorderBtn}>
            {t('card.preorder')}
          </button>
        )}
      </div>
    </Link>
  );
}
