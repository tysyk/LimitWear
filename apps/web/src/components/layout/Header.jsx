import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import styles from './Header.module.css';

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLang();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoLimit}>LIMIT</span>
          <span className={styles.logoWear}>WEAR</span>
        </Link>

        <nav className={styles.nav}>
          <NavLink to="/drops" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
            {t('nav.drops')}
          </NavLink>
          {(user?.role === 'designer' || user?.role === 'admin') && (
            <NavLink to="/designer" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              {t('nav.designer')}
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              {t('nav.admin')}
            </NavLink>
          )}
          <NavLink to="/#about" className={styles.navLink}>{t('nav.about')}</NavLink>
        </nav>

        <div className={styles.controls}>
          <button className={styles.controlBtn} onClick={toggleLang} title="Switch language">
            {lang === 'uk' ? '🇺🇦 UA' : '🇬🇧 EN'}
          </button>
          <button className={styles.controlBtn} onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          {user ? (
            <div className={styles.userMenu} ref={menuRef}>
              <button className={styles.userBtn} onClick={() => setMenuOpen(o => !o)}>
                <span className={styles.userAvatar}>{user.name[0].toUpperCase()}</span>
                <span className={styles.userName}>{user.name}</span>
              </button>
              {menuOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownInfo}>
                    <span className={styles.dropdownRole}>{user.role.toUpperCase()}</span>
                    <span className={styles.dropdownBalance}>
                      {t('nav.balance')}: <strong>{user.balance?.toLocaleString()} грн</strong>
                    </span>
                    {user.frozenBalance > 0 && (
                      <span className={styles.dropdownFrozen}>
                        {t('nav.frozen')}: {user.frozenBalance?.toLocaleString()} грн
                      </span>
                    )}
                  </div>
                  <Link to="/profile" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                    {t('nav.profile')}
                  </Link>
                  <button className={styles.dropdownItem} onClick={handleLogout}>
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authLinks}>
              <Link to="/login" className={styles.navLink}>{t('nav.login')}</Link>
              <Link to="/register" className={styles.registerBtn}>{t('nav.join')}</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
