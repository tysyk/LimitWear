import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import styles from './Footer.module.css';

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}><span>LIMIT</span><strong>WEAR</strong></Link>
          <p className={styles.tagline}>{t('footer.tagline')}</p>
        </div>
        <div className={styles.links}>
          <span className={styles.linksTitle}>{t('footer.platform')}</span>
          <Link to="/drops">{t('footer.activeDrops')}</Link>
          <Link to="/register">{t('footer.becomeDesigner')}</Link>
          <Link to="/#about">{t('footer.howItWorks')}</Link>
        </div>
        <div className={styles.links}>
          <span className={styles.linksTitle}>{t('footer.legal')}</span>
          <a href="#">{t('footer.privacy')}</a>
          <a href="#">{t('footer.terms')}</a>
          <a href="#">{t('footer.refund')}</a>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
}
