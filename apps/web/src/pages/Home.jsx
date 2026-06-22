import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useLang } from '../context/LangContext';
import ProductCard from '../components/common/ProductCard';
import CountdownTimer from '../components/common/CountdownTimer';
import styles from './Home.module.css';

export default function Home() {
  const { t } = useLang();
  const [newDrops, setNewDrops] = useState([]);
  const [trending, setTrending] = useState([]);
  const [nearestDrop, setNearestDrop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/drops/new'),
      api.get('/drops/trending'),
      api.get('/drops', { params: { status: 'active', sort: 'deadline', limit: 1 } }),
    ]).then(([newRes, trendRes, nearestRes]) => {
      setNewDrops(newRes.data.drops);
      setTrending(trendRes.data.drops);
      setNearestDrop(nearestRes.data.drops[0] || null);
    }).finally(() => setLoading(false));
  }, []);

  const heroDeadline = nearestDrop?.deadline;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            {t('home.hero.title')}<br />
            <span className={styles.heroAccent}>{t('home.hero.subtitle')}</span>
          </h1>
          <p className={styles.heroSub}>{t('home.hero.desc')}</p>
          {heroDeadline && (
            <div className={styles.heroTimer}>
              <CountdownTimer deadline={heroDeadline} size="lg" />
            </div>
          )}
          <div className={styles.heroActions}>
            <Link to="/drops" className={styles.heroCta}>{t('home.hero.cta')}</Link>
            <Link to="/register" className={styles.heroSecondary}>{t('home.hero.designer')}</Link>
          </div>
        </div>
        <div className={styles.heroDivider} />
      </section>

      {newDrops.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t('home.new')}</h2>
              <Link to="/drops" className={styles.seeAll}>{t('home.seeAll')}</Link>
            </div>
            {loading ? (
              <div className={styles.grid}>
                {[...Array(3)].map((_, i) => <div key={i} className={styles.skeleton} />)}
              </div>
            ) : (
              <div className={styles.grid}>
                {newDrops.slice(0, 3).map(drop => <ProductCard key={drop._id} drop={drop} />)}
              </div>
            )}
          </div>
        </section>
      )}

      <section className={styles.howSection} id="about">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>{t('home.how')}</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNum}>01</span>
              <h3 className={styles.stepTitle}>{t('home.step1.title')}</h3>
              <p className={styles.stepText}>{t('home.step1.text')}</p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <span className={styles.stepNum}>02</span>
              <h3 className={styles.stepTitle}>{t('home.step2.title')}</h3>
              <p className={styles.stepText}>{t('home.step2.text')}</p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <span className={styles.stepNum}>03</span>
              <h3 className={styles.stepTitle}>{t('home.step3.title')}</h3>
              <p className={styles.stepText}>{t('home.step3.text')}</p>
            </div>
          </div>
        </div>
      </section>

      {trending.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t('home.trending')}</h2>
              <Link to="/drops" className={styles.seeAll}>{t('home.viewAll')}</Link>
            </div>
            <div className={styles.grid}>
              {trending.slice(0, 3).map(drop => <ProductCard key={drop._id} drop={drop} />)}
            </div>
          </div>
        </section>
      )}

      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>{t('home.cta.title')}</h2>
          <p className={styles.ctaText}>{t('home.cta.text')}</p>
          <Link to="/register" className={styles.ctaBtn}>{t('home.cta.btn')}</Link>
        </div>
      </section>
    </div>
  );
}
