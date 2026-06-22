import { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useLang } from '../../context/LangContext';
import styles from './CardModal.module.css';

const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (v) => {
  let d = v.replace(/\D/g, '').slice(0, 4);
  if (!d) return '';
  // якщо перша цифра > 1 — одразу додаємо 0 (напр. "3" → "03")
  if (d.length === 1 && parseInt(d, 10) > 1) d = '0' + d;
  if (d.length >= 2) {
    let month = parseInt(d.slice(0, 2), 10);
    if (month > 12) month = 12;
    if (month < 1) month = 1;
    const mm = String(month).padStart(2, '0');
    return d.length > 2 ? mm + '/' + d.slice(2) : mm;
  }
  return d;
};
const validateExpiry = (expiry) => {
  const parts = expiry.split('/');
  if (parts.length !== 2) return 'invalid';
  const month = parseInt(parts[0], 10);
  const year = parseInt('20' + parts[1], 10);
  if (!month || month < 1 || month > 12 || isNaN(year)) return 'invalid';
  const now = new Date();
  const exp = new Date(year, month - 1, 1);
  if (exp < new Date(now.getFullYear(), now.getMonth(), 1)) return 'expired';
  return 'ok';
};

export default function CardModal({ type, onClose, onSuccess, maxAmount }) {
  const { t } = useLang();
  const isTopup = type === 'topup';
  const [form, setForm] = useState({ amount: '', card: '', expiry: '', cvv: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount < 1) return toast.error(t('topup.amount'));
    if (form.card.replace(/\s/g, '').length < 16) return toast.error(t('topup.card'));
    if (isTopup) {
      const expiryStatus = validateExpiry(form.expiry);
      if (expiryStatus === 'invalid') return toast.error(t('card.expiry.invalid'));
      if (expiryStatus === 'expired') return toast.error(t('card.expiry.expired'));
      if (form.cvv.length < 3) return toast.error('CVV');
    }
    if (!isTopup && maxAmount && amount > maxAmount) {
      return toast.error(`Максимум ${maxAmount.toLocaleString()} грн`);
    }

    setLoading(true);
    try {
      const endpoint = isTopup ? '/users/balance/topup' : '/users/balance/withdraw';
      const { data } = await api.post(endpoint, { amount });
      onSuccess(data.balance);
      toast.success(data.message);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Помилка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{isTopup ? t('topup.title') : t('withdraw.title')}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {!isTopup && maxAmount !== undefined && (
          <div className={styles.availRow}>
            <span>{t('withdraw.avail')}:</span>
            <strong>{maxAmount?.toLocaleString()} грн</strong>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>{isTopup ? t('topup.amount') : t('withdraw.amount')}</label>
            <input
              type="number" required min="1" max="100000"
              placeholder="1000"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            />
          </div>

          <div className={styles.field}>
            <label>{isTopup ? t('topup.card') : t('withdraw.card')}</label>
            <input
              placeholder="0000 0000 0000 0000"
              value={form.card}
              onChange={e => setForm(f => ({ ...f, card: formatCard(e.target.value) }))}
              required
            />
          </div>

          {isTopup && (
            <div className={styles.row}>
              <div className={styles.field}>
                <label>{t('topup.expiry')}</label>
                <input
                  placeholder="MM/YY"
                  value={form.expiry}
                  onChange={e => setForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                  required
                />
              </div>
              <div className={styles.field}>
                <label>{t('topup.cvv')}</label>
                <input
                  type="password" placeholder="•••" maxLength={3}
                  value={form.cvv}
                  onChange={e => setForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                  required
                />
              </div>
            </div>
          )}

          <div className={styles.disclaimer}>
            🔒 Симуляція оплати — реальні кошти не списуються
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              {t('modal.cancel')}
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (t('topup.processing')) : (isTopup ? t('topup.btn') : t('withdraw.btn'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
