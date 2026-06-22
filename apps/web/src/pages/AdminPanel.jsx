import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import styles from './AdminPanel.module.css';

const TABS = ['stats', 'designers', 'pending', 'drops', 'users'];

export default function AdminPanel() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [pendingDesigners, setPendingDesigners] = useState([]);
  const [drops, setDrops] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dropForm, setDropForm] = useState(null);
  const [moderateForm, setModerateForm] = useState(null);

  useEffect(() => {
    if (tab === 'stats') loadStats();
    if (tab === 'designers') loadPendingDesigners();
    if (tab === 'pending') loadPending();
    if (tab === 'drops') loadDrops();
    if (tab === 'users') loadUsers();
  }, [tab]);

  const loadStats = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/stats'); setStats(data); }
    catch { toast.error('Failed to load stats'); }
    finally { setLoading(false); }
  };

  const loadPendingDesigners = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/designers/pending'); setPendingDesigners(data.designers); }
    catch { toast.error('Failed to load designers'); }
    finally { setLoading(false); }
  };

  const loadPending = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/designs/pending'); setPending(data.designs); }
    catch { toast.error('Failed to load pending designs'); }
    finally { setLoading(false); }
  };

  const loadDrops = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/drops'); setDrops(data.drops); }
    catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/users'); setUsers(data.users); }
    catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const handleVerifyDesigner = async (userId, action) => {
    try {
      await api.patch(`/admin/designers/${userId}/verify`, { action });
      setPendingDesigners(d => d.filter(u => u._id !== userId));
      toast.success(`Designer ${action === 'approve' ? 'approved' : 'rejected'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleModerate = async (id, action, note) => {
    try {
      await api.patch(`/admin/designs/${id}/moderate`, { action, moderationNote: note });
      if (action === 'reject') {
        setPending(p => p.filter(d => d._id !== id));
        setModerateForm(null);
        toast.success('Дизайн відхилено');
      } else {
        // Схвалено — залишаємо в списку, одразу показуємо форму дропу
        setPending(p => p.map(d => d._id === id ? { ...d, status: 'approved' } : d));
        setDropForm({ designId: id });
        setModerateForm({ dropFor: id });
        toast.success('Дизайн схвалено ✓ — створіть дроп');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCreateDrop = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/drops', dropForm);
      toast.success('Дроп створено!');
      setPending(p => p.filter(d => d._id !== dropForm.designId));
      setDropForm(null);
      setModerateForm(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create drop');
    }
  };

  const TAB_LABELS = {
    stats: 'СТАТИСТИКА', designers: 'ДИЗАЙНЕРИ', pending: 'ДИЗАЙНИ',
    drops: 'ДРОПИ', users: 'ЮЗЕРИ',
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h1 className={styles.title}>ADMIN PANEL</h1>
        </div>

        <div className={styles.tabs}>
          {TABS.map(t => (
            <button key={t} className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
              onClick={() => setTab(t)}>
              {TAB_LABELS[t]}
              {t === 'designers' && pendingDesigners.length > 0 && (
                <span className={styles.badge}>{pendingDesigners.length}</span>
              )}
              {t === 'pending' && pending.length > 0 && (
                <span className={styles.badge}>{pending.length}</span>
              )}
            </button>
          ))}
        </div>

        {loading && <div className={styles.loading}>Завантаження...</div>}

        {/* Stats */}
        {tab === 'stats' && stats && (
          <div className={styles.statsGrid}>
            {[
              { label: 'Юзерів', val: stats.totalUsers },
              { label: 'Дропів', val: stats.totalDrops },
              { label: 'Активних', val: stats.activeDrops },
              { label: 'Замовлень', val: stats.totalOrders },
              { label: 'На модерації', val: stats.pendingDesigns },
              { label: 'Виручка', val: `${stats.totalRevenue?.toLocaleString()} грн` },
            ].map(s => (
              <div key={s.label} className={styles.statCard}>
                <span className={styles.statVal}>{s.val}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pending Designers */}
        {tab === 'designers' && (
          <div className={styles.list}>
            {!loading && pendingDesigners.length === 0 && (
              <div className={styles.empty}>Немає дизайнерів на верифікацію</div>
            )}
            {pendingDesigners.map(designer => (
              <div key={designer._id} className={styles.designerCard}>
                <div className={styles.designerAvatar}>{designer.name[0]}</div>
                <div className={styles.designerInfo}>
                  <h3 className={styles.designerName}>{designer.name}</h3>
                  <div className={styles.designerMeta}>
                    <span>{designer.email}</span>
                    <span>Зареєстрований: {new Date(designer.createdAt).toLocaleDateString('uk-UA')}</span>
                  </div>
                  {designer.designerInfo?.bio && (
                    <p className={styles.designerBio}>{designer.designerInfo.bio}</p>
                  )}
                </div>
                <div className={styles.verifyActions}>
                  <button className={styles.approveBtn}
                    onClick={() => handleVerifyDesigner(designer._id, 'approve')}>
                    ПІДТВЕРДИТИ
                  </button>
                  <button className={styles.rejectBtn}
                    onClick={() => handleVerifyDesigner(designer._id, 'reject')}>
                    ВІДХИЛИТИ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending Designs */}
        {tab === 'pending' && (
          <div className={styles.list}>
            {!loading && pending.length === 0 && <div className={styles.empty}>Немає дизайнів на модерацію</div>}
            {pending.map(design => (
              <div key={design._id} className={styles.designCard}>
                <div className={styles.designImg}>
                  <img src={design.imageUrl} alt={design.title}
                    onError={e => { e.target.style.display = 'none'; }} />
                </div>
                <div className={styles.designInfo}>
                  <h3 className={styles.designTitle}>{design.title}</h3>
                  <div className={styles.designMeta}>
                    <span>від <strong>{design.designer?.name}</strong></span>
                    <span>{design.category}</span>
                    <span>{design.suggestedPrice?.toLocaleString()} грн</span>
                    <span>{design.suggestedQuantity} шт</span>
                    <span>{new Date(design.createdAt).toLocaleDateString('uk-UA')}</span>
                  </div>
                  <p className={styles.designDesc}>{design.description}</p>

                  {design.status === 'approved' ? (
                    <div className={styles.approvedBadge}>✓ Схвалено — заповніть параметри дропу</div>
                  ) : moderateForm?.id === design._id ? (
                    <div className={styles.moderateForm}>
                      <input placeholder="Коментар модератора (необов'язково)"
                        value={moderateForm.note}
                        onChange={e => setModerateForm(f => ({ ...f, note: e.target.value }))} />
                      <div className={styles.moderateActions}>
                        <button className={styles.approveBtn}
                          onClick={() => handleModerate(design._id, 'approve', moderateForm.note)}>
                          СХВАЛИТИ
                        </button>
                        <button className={styles.rejectBtn}
                          onClick={() => handleModerate(design._id, 'reject', moderateForm.note)}>
                          ВІДХИЛИТИ
                        </button>
                        <button className={styles.cancelModBtn}
                          onClick={() => setModerateForm(null)}>СКАСУВАТИ</button>
                      </div>
                    </div>
                  ) : (
                    <button className={styles.moderateBtn}
                      onClick={() => setModerateForm({ id: design._id, note: '' })}>
                      МОДЕРУВАТИ
                    </button>
                  )}

                  {moderateForm?.dropFor === design._id && (
                    <form className={styles.dropFormInline} onSubmit={handleCreateDrop}>
                      <div className={styles.dropFormRow}>
                        {[
                          { label: 'Ціна (грн)', key: 'price', type: 'number', ph: String(design.suggestedPrice || 1000) },
                          { label: 'Кількість', key: 'totalQuantity', type: 'number', ph: String(design.suggestedQuantity || 50) },
                          { label: 'Дедлайн', key: 'deadline', type: 'datetime-local', ph: '' },
                          { label: 'Частка дизайнера (%)', key: 'designerShare', type: 'number', ph: '20' },
                        ].map(f => (
                          <div key={f.key} className={styles.field}>
                            <label>{f.label}</label>
                            <input type={f.type} required={f.key !== 'designerShare'} placeholder={f.ph}
                              defaultValue={f.key === 'price' ? design.suggestedPrice
                                : f.key === 'totalQuantity' ? design.suggestedQuantity
                                : f.key === 'designerShare' ? 20 : undefined}
                              onChange={e => setDropForm(prev => ({ ...prev, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} />
                          </div>
                        ))}
                      </div>
                      <div className={styles.moderateActions}>
                        <button type="submit" className={styles.approveBtn}>СТВОРИТИ ДРОП</button>
                        <button type="button" className={styles.cancelModBtn}
                          onClick={() => { setModerateForm(null); setDropForm(null); }}>СКАСУВАТИ</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All Drops */}
        {tab === 'drops' && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>
                <th>Назва</th><th>Дизайнер</th><th>Статус</th>
                <th>Прогрес</th><th>Ціна</th><th>Дедлайн</th>
              </tr></thead>
              <tbody>
                {drops.map(drop => (
                  <tr key={drop._id}>
                    <td><a href={`/drops/${drop._id}`} className={styles.link}>{drop.title}</a></td>
                    <td>{drop.designer?.name}</td>
                    <td><span className={`${styles.pill} ${styles[drop.status]}`}>{drop.status}</span></td>
                    <td>{drop.reservedQuantity}/{drop.totalQuantity}</td>
                    <td>{drop.price?.toLocaleString()} грн</td>
                    <td>{new Date(drop.deadline).toLocaleDateString('uk-UA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>
                <th>Імʼя</th><th>Емейл</th><th>Роль</th>
                <th>Баланс</th><th>Заморожено</th><th>Верифікація</th><th>Дата</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`${styles.rolePill} ${styles['role_' + u.role]}`}>{u.role}</span></td>
                    <td>{u.balance?.toLocaleString()} грн</td>
                    <td>{u.frozenBalance?.toLocaleString()} грн</td>
                    <td>
                      <span className={`${styles.verPill} ${styles['ver_' + u.verificationStatus]}`}>
                        {u.verificationStatus || 'approved'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('uk-UA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
