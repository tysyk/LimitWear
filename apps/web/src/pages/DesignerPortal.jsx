import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import styles from './DesignerPortal.module.css';

const CATEGORIES = ['hoodie', 'jacket', 'pants', 'tshirt', 'accessories'];

export default function DesignerPortal() {
  const { user } = useAuth();
  const { t } = useLang();
  const isVerified = user?.verificationStatus === 'approved';

  const STATUS_LABELS = {
    pending: { label: t('designer.pending'), color: '#fbbf24' },
    approved: { label: t('designer.approved'), color: '#4ade80' },
    rejected: { label: t('designer.rejected'), color: '#f87171' },
  };

  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'hoodie',
    suggestedPrice: '',
    suggestedQuantity: '',
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    api.get('/designs')
      .then(({ data }) => setDesigns(data.designs))
      .finally(() => setLoading(false));
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return toast.error(t('designer.noImage'));
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('image', image);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));

      const { data } = await api.post('/designs', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setDesigns(d => [data.design, ...d]);
      toast.success(t('designer.successMsg'));
      setShowForm(false);
      setForm({ title: '', description: '', category: 'hoodie', suggestedPrice: '', suggestedQuantity: '' });
      setImage(null);
      setPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.message || t('designer.failMsg'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <div>
            <h1 className={styles.title}>{t('designer.title')}</h1>
            <p className={styles.sub}>{t('designer.sub')}</p>
          </div>
          {isVerified && (
            <button className={styles.newBtn} onClick={() => setShowForm(s => !s)}>
              {showForm ? t('modal.cancel') : t('designer.new')}
            </button>
          )}
        </div>

        {!isVerified && (
          <div className={styles.notVerified}>
            ⏳ {t('designer.notVerified')}
          </div>
        )}

        {isVerified && showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h2 className={styles.formTitle}>{t('designer.formTitle')}</h2>

            <div className={styles.formGrid}>
              <div className={styles.imageUpload}>
                <label className={styles.uploadArea} style={preview ? { padding: 0 } : {}}>
                  {preview
                    ? <img src={preview} alt="preview" className={styles.previewImg} />
                    : <><span className={styles.uploadIcon}>+</span><span>{t('designer.imgUpload')}</span><span className={styles.uploadHint}>{t('designer.imgHint')}</span></>
                  }
                  <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                </label>
              </div>

              <div className={styles.fields}>
                <div className={styles.field}>
                  <label>{t('designer.fieldTitle')}</label>
                  <input required placeholder={t('designer.fieldTitlePlaceholder')} value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>{t('designer.fieldDesc')}</label>
                  <textarea required rows={3} placeholder={t('designer.fieldDescPlaceholder')}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    style={{ resize: 'vertical' }} />
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>{t('designer.fieldCategory')}</label>
                    <select value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>{t('designer.fieldPrice')}</label>
                    <input type="number" required min="100" placeholder="1000"
                      value={form.suggestedPrice}
                      onChange={e => setForm(f => ({ ...f, suggestedPrice: e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label>{t('designer.fieldQty')}</label>
                    <input type="number" required min="10" max="1000" placeholder="50"
                      value={form.suggestedQuantity}
                      onChange={e => setForm(f => ({ ...f, suggestedQuantity: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? t('designer.submitting') : t('designer.submitBtn')}
            </button>
          </form>
        )}

        <div className={styles.designsSection}>
          <h2 className={styles.sectionTitle}>{t('designer.myDesigns')} ({designs.length})</h2>

          {loading ? (
            <div className={styles.loading}>{t('designer.loading')}</div>
          ) : designs.length === 0 ? (
            <div className={styles.empty}>{t('designer.noDesigns')}</div>
          ) : (
            <div className={styles.designGrid}>
              {designs.map(design => (
                <div key={design._id} className={styles.designCard}>
                  <div className={styles.designImage}>
                    <img src={design.imageUrl} alt={design.title}
                      onError={e => { e.target.style.display = 'none'; }} />
                  </div>
                  <div className={styles.designInfo}>
                    <div className={styles.designTop}>
                      <h3 className={styles.designTitle}>{design.title}</h3>
                      <span className={styles.designStatus}
                        style={{ color: STATUS_LABELS[design.status]?.color }}>
                        {STATUS_LABELS[design.status]?.label}
                      </span>
                    </div>
                    <span className={styles.designCat}>{design.category}</span>
                    <p className={styles.designDesc}>{design.description}</p>
                    <div className={styles.designMeta}>
                      <span>{design.suggestedPrice?.toLocaleString()} {t('designer.uah')}</span>
                      <span>{design.suggestedQuantity} {t('designer.pcs')}</span>
                      <span>{new Date(design.createdAt).toLocaleDateString()}</span>
                    </div>
                    {design.moderationNote && (
                      <div className={styles.moderationNote}>
                        <strong>{t('designer.note')}:</strong> {design.moderationNote}
                      </div>
                    )}
                    {design.status === 'approved' && design.drop && (
                      <a href={`/drops/${design.drop}`} className={styles.viewDrop}>{t('designer.viewDrop')}</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
