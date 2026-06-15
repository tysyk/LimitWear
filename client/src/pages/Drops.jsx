import { useState, useEffect } from 'react';
import api from '../services/api';
import { useLang } from '../context/LangContext';
import ProductCard from '../components/common/ProductCard';
import styles from './Drops.module.css';

const CATEGORIES = ['all', 'hoodie', 'jacket', 'pants', 'tshirt', 'accessories'];
const STATUSES = ['active', 'funded', 'failed', 'manufacturing', 'completed'];

const CAT_LABELS = { all: { uk: 'ВСЕ', en: 'ALL' }, hoodie: { uk: 'ХУДІ', en: 'HOODIE' }, jacket: { uk: 'КУРТКИ', en: 'JACKET' }, pants: { uk: 'ШТАНИ', en: 'PANTS' }, tshirt: { uk: 'ФУТБОЛКИ', en: 'T-SHIRT' }, accessories: { uk: 'АКСЕСУАРИ', en: 'ACCESSORIES' } };
const STATUS_LABELS = { active: { uk: 'АКТИВНІ', en: 'ACTIVE' }, funded: { uk: 'ФІНАНСОВАНІ', en: 'FUNDED' }, failed: { uk: 'НЕ ВІДБУЛИСЬ', en: 'FAILED' }, manufacturing: { uk: 'ВИРОБНИЦТВО', en: 'MANUFACTURING' }, completed: { uk: 'ЗАВЕРШЕНІ', en: 'COMPLETED' } };

export default function Drops() {
  const { t, lang } = useLang();
  const [drops, setDrops] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(new Set());
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const LIMIT = 9;

  const toggleCategory = (cat) => {
    if (cat === 'all') {
      setCategories(new Set());
      setPage(1);
      return;
    }
    setCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
    setPage(1);
  };

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: LIMIT, status };
    if (categories.size > 0) params.category = [...categories].join(',');
    api.get('/drops', { params })
      .then(({ data }) => { setDrops(data.drops); setTotal(data.total); })
      .finally(() => setLoading(false));
  }, [categories, status, page]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <h1 className={styles.title}>{t('drops.title')}</h1>
          <span className={styles.count}>{total} {t('drops.count')}</span>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>СТАТУС</span>
            {STATUSES.map(s => (
              <button key={s}
                className={`${styles.filterBtn} ${status === s ? styles.active : ''}`}
                onClick={() => { setStatus(s); setPage(1); }}>
                {STATUS_LABELS[s][lang]}
              </button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>{lang === 'uk' ? 'КАТЕГОРІЯ' : 'CATEGORY'}</span>
            {CATEGORIES.map(c => {
              const isAll = c === 'all';
              const isActive = isAll ? categories.size === 0 : categories.has(c);
              return (
                <button key={c}
                  className={`${styles.filterBtn} ${isActive ? styles.active : ''}`}
                  onClick={() => toggleCategory(c)}>
                  {CAT_LABELS[c][lang]}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className={styles.grid}>
            {[...Array(6)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : drops.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>◻</span>
            <p>{t('drops.noDrops')}</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {drops.map(drop => <ProductCard key={drop._id} drop={drop} />)}
          </div>
        )}

        {pages > 1 && (
          <div className={styles.pagination}>
            {[...Array(pages)].map((_, i) => (
              <button key={i}
                className={`${styles.pageBtn} ${page === i + 1 ? styles.activePage : ''}`}
                onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
