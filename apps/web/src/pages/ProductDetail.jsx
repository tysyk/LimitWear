import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { NOVA_POSHTA, CITIES } from '../data/novaPoshta';
import CountdownTimer from '../components/common/CountdownTimer';
import ProgressBar from '../components/common/ProgressBar';
import styles from './ProductDetail.module.css';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const COUNTRY_CODES = [
  { flag: '🇺🇦', code: '+380', digits: 9, mask: 'XX XXX XX XX' },
  { flag: '🇵🇱', code: '+48',  digits: 9, mask: 'XXX XXX XXX' },
  { flag: '🇩🇪', code: '+49',  digits: 10, mask: 'XXXX XXXXXX' },
  { flag: '🇬🇧', code: '+44',  digits: 10, mask: 'XXXX XXXXXX' },
  { flag: '🇺🇸', code: '+1',   digits: 10, mask: 'XXX XXX XXXX' },
  { flag: '🇨🇿', code: '+420', digits: 9,  mask: 'XXX XXX XXX' },
  { flag: '🇸🇰', code: '+421', digits: 9,  mask: 'XXX XXX XXX' },
  { flag: '🇦🇹', code: '+43',  digits: 10, mask: 'XXXX XXXXXX' },
];

export default function ProductDetail() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [drop, setDrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [form, setForm] = useState({
    size: 'M',
    quantity: 1,
    fullName: '',
    phone: '',
    city: '',
    branch: '',
  });

  useEffect(() => {
    api.get(`/drops/${id}`)
      .then(({ data }) => setDrop(data.drop))
      .catch(() => navigate('/drops'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleCityChange = (city) => {
    setForm(f => ({ ...f, city, branch: '' }));
  };

  const handlePhoneChange = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, countryCode.digits);
    setForm(f => ({ ...f, phone: digits }));
  };

  const formatPhoneDisplay = (digits) => {
    if (!digits) return '';
    const mask = countryCode.mask;
    let result = '';
    let di = 0;
    for (let i = 0; i < mask.length && di < digits.length; i++) {
      if (mask[i] === 'X') { result += digits[di++]; }
      else { result += mask[i]; }
    }
    return result;
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!form.branch) return toast.error(t('detail.branchPlaceholder'));
    if (form.phone.length < countryCode.digits) {
      return toast.error(t('detail.phone'));
    }
    setOrdering(true);
    try {
      await api.post('/orders', {
        dropId: drop._id,
        quantity: form.quantity,
        size: form.size,
        phone: countryCode.code + form.phone,
        shippingAddress: {
          fullName: form.fullName,
          address: form.branch,
          city: form.city,
          postalCode: '00000',
          country: 'Ukraine',
        },
      });
      const total = drop.price * form.quantity;
      toast.success(`${t('card.preorder')}! ${total.toLocaleString()} грн ${t('detail.freeze').toLowerCase()}.`);
      setShowForm(false);
      refreshUser();
      const { data } = await api.get(`/drops/${id}`);
      setDrop(data.drop);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Помилка');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <div className={styles.loading}>...</div>;
  if (!drop) return null;

  const canOrder = drop.status === 'active' && new Date(drop.deadline) > new Date();
  const total = drop.price * form.quantity;
  const branches = form.city ? NOVA_POSHTA[form.city] || [] : [];

  const statusMsg = {
    funded: t('detail.funded'),
    failed: t('detail.failed'),
    manufacturing: t('detail.manufacturing'),
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.imageCol}>
          <div className={styles.imageWrap}>
            <img src={drop.imageUrl} alt={drop.title} className={styles.image}
              onError={(e) => { e.target.src = '/placeholder.jpg'; }} />
            {drop.isNewDrop && drop.status === 'active' && (
              <span className={styles.badge}>NEW <strong>DROP</strong></span>
            )}
          </div>
        </div>

        <div className={styles.infoCol}>
          <div className={styles.topMeta}>
            <span className={styles.category}>{drop.category}</span>
            {drop.status !== 'active' && (
              <span className={`${styles.statusPill} ${styles[drop.status]}`}>
                {t(`status.${drop.status}`)}
              </span>
            )}
          </div>

          <h1 className={styles.title}>{drop.title.toUpperCase()}</h1>

          {drop.designer && (
            <div className={styles.designer}>
              <span className={styles.designerAvatar}>{drop.designer.name[0]}</span>
              <span>by <strong>{drop.designer.name}</strong></span>
            </div>
          )}

          <p className={styles.description}>{drop.description}</p>
          <div className={styles.divider} />

          <div className={styles.priceRow}>
            <span className={styles.price}>
              <strong>{drop.price.toLocaleString()}</strong> грн
            </span>
            {drop.status === 'active' && <CountdownTimer deadline={drop.deadline} size="md" />}
          </div>

          <ProgressBar reserved={drop.reservedQuantity} total={drop.totalQuantity} />

          <div className={styles.availability}>
            {drop.availableQuantity > 0 && drop.status === 'active'
              ? <span className={styles.avail}>{drop.availableQuantity} {t('card.spotsLeft')}</span>
              : <span className={styles.sold}>{t('card.allReserved')}</span>
            }
          </div>
          <div className={styles.divider} />

          {canOrder && !showForm && (
            <button className={styles.preorderBtn}
              onClick={() => { if (!user) { navigate('/login'); return; } setShowForm(true); }}>
              {t('card.preorder')} — {drop.price.toLocaleString()} грн
            </button>
          )}

          {canOrder && showForm && (
            <form className={styles.form} onSubmit={handleOrder}>
              <h3 className={styles.formTitle}>{t('detail.formTitle')}</h3>

              <div className={styles.sizeGrid}>
                {SIZES.map(s => (
                  <button type="button" key={s}
                    className={`${styles.sizeBtn} ${form.size === s ? styles.sizeActive : ''}`}
                    onClick={() => setForm(f => ({ ...f, size: s }))}>
                    {s}
                  </button>
                ))}
              </div>

              <div className={styles.qtyRow}>
                <span className={styles.qtyLabel}>{t('detail.qty')}</span>
                <div className={styles.qtyControl}>
                  <button type="button" onClick={() => setForm(f => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}>−</button>
                  <span>{form.quantity}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, quantity: Math.min(drop.availableQuantity, f.quantity + 1) }))}>+</button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>{t('detail.recipient')}</label>
                <input required value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder={t('detail.recipientPlaceholder')} />
              </div>

              <div className={styles.formGroup}>
                <label>{t('detail.phone')}</label>
                <div className={styles.phoneRow}>
                  <select
                    className={styles.countrySelect}
                    value={countryCode.code}
                    onChange={e => {
                      const cc = COUNTRY_CODES.find(c => c.code === e.target.value);
                      setCountryCode(cc);
                      setForm(f => ({ ...f, phone: '' }));
                    }}
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    value={formatPhoneDisplay(form.phone)}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder={countryCode.mask.replace(/X/g, '0')}
                    className={styles.phoneInput}
                  />
                </div>
              </div>

              <div className={styles.novaPoshtaBlock}>
                <div className={styles.novaPoshtaLabel}>
                  <span className={styles.npLogo}>🟡</span>
                  <span>{t('detail.delivery')}</span>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('detail.city')}</label>
                  <select required value={form.city} onChange={e => handleCityChange(e.target.value)}>
                    <option value="">{t('detail.cityPlaceholder')}</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t('detail.branch')}</label>
                  <select required value={form.branch}
                    onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                    disabled={!form.city}>
                    <option value="">{t('detail.branchPlaceholder')}</option>
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              {user && (
                <div className={styles.balanceInfo}>
                  <span>{t('detail.balance')}: <strong>{user.balance?.toLocaleString()} грн</strong></span>
                  <span>{t('detail.freeze')}: <strong className={user.balance < total ? styles.insufficient : styles.freeze}>{total.toLocaleString()} грн</strong></span>
                </div>
              )}

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>
                  {t('detail.cancelBtn')}
                </button>
                <button type="submit" className={styles.confirmBtn}
                  disabled={ordering || (user && user.balance < total)}>
                  {ordering ? '...' : `${t('detail.freezeBtn')} ${total.toLocaleString()} грн`}
                </button>
              </div>
            </form>
          )}

          {!canOrder && drop.status === 'active' && (
            <div className={styles.soldOut}>{t('card.allReserved')}</div>
          )}
          {statusMsg[drop.status] && (
            <div className={drop.status === 'failed' ? styles.failedMsg : styles.statusMsg}>
              {statusMsg[drop.status]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
