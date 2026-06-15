import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import styles from './Auth.module.css';

export default function Register() {
  const { register } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = t('auth.err.name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('auth.err.email');
    if (form.password.length < 6) e.password = t('auth.err.password');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      toast.success(t('auth.register.title'));
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const fieldMap = { name: 'name', email: 'email', password: 'password' };
        const serverErrors = {};
        data.errors.forEach(({ path, msg }) => {
          if (fieldMap[path]) serverErrors[fieldMap[path]] = msg;
        });
        if (data.errors.some(e => e.msg?.toLowerCase().includes('email') && e.msg?.toLowerCase().includes('use'))) {
          serverErrors.email = t('auth.err.emailTaken');
        }
        setErrors(serverErrors);
      } else if (data?.message?.toLowerCase().includes('email')) {
        setErrors({ email: t('auth.err.emailTaken') });
      } else {
        toast.error(data?.message || 'Помилка');
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (key, type = 'text', placeholder = '') => (
    <div className={styles.field}>
      <label>{t(`auth.${key}`)}</label>
      <input
        type={type}
        required
        placeholder={placeholder}
        value={form[key]}
        className={errors[key] ? styles.inputError : ''}
        onChange={e => {
          setForm(f => ({ ...f, [key]: e.target.value }));
          if (errors[key]) setErrors(er => ({ ...er, [key]: '' }));
        }}
      />
      {errors[key] && <span className={styles.fieldError}>{errors[key]}</span>}
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link to="/" className={styles.logo}>LIMIT<strong>WEAR</strong></Link>
          <h1 className={styles.title}>{t('auth.register.title')}</h1>
          <p className={styles.sub}>{t('auth.register.sub')}</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          {field('name', 'text', '...')}
          {field('email', 'email', 'your@email.com')}
          {field('password', 'password', t('auth.passwordHint') || 'Min 6 characters')}
          <div className={styles.roleSelect}>
            <span className={styles.roleLabel}>{t('auth.iam')}</span>
            <div className={styles.roleBtns}>
              {['customer', 'designer'].map(r => (
                <button key={r} type="button"
                  className={`${styles.roleBtn} ${form.role === r ? styles.roleActive : ''}`}
                  onClick={() => setForm(f => ({ ...f, role: r }))}>
                  {t(`auth.${r}`)}
                </button>
              ))}
            </div>
            <p className={styles.roleHint}>{t(`auth.${form.role}.hint`)}</p>
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? '...' : t('auth.register.btn')}
          </button>
        </form>
        <p className={styles.switchText}>
          {t('auth.hasAccount')} <Link to="/login" className={styles.switchLink}>{t('auth.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
