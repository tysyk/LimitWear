import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import styles from './Auth.module.css';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success(t('auth.login.title'));
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link to="/" className={styles.logo}>LIMIT<strong>WEAR</strong></Link>
          <h1 className={styles.title}>{t('auth.login.title')}</h1>
          <p className={styles.sub}>{t('auth.login.sub')}</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>{t('auth.email')}</label>
            <input type="email" required placeholder="your@email.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label>{t('auth.password')}</label>
            <input type="password" required placeholder="••••••••"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? '...' : t('auth.login.btn')}
          </button>
        </form>
        <p className={styles.switchText}>
          {t('auth.noAccount')} <Link to="/register" className={styles.switchLink}>{t('auth.joinNow')}</Link>
        </p>
      </div>
    </div>
  );
}
