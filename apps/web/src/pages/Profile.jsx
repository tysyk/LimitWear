import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import CardModal from '../components/ui/CardModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import styles from './Profile.module.css';

const STATUS_COLORS = { frozen: '#60a5fa', completed: '#4ade80', refunded: '#f87171' };

const TABS = ['all', 'active', 'success', 'failed'];

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { t } = useLang();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [cardModal, setCardModal] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  useEffect(() => {
    api.get('/orders')
      .then(({ data }) => setOrders(data.orders))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return o.status === 'frozen' && o.drop?.status === 'active';
    if (activeTab === 'success') return o.status === 'completed' || o.drop?.status === 'manufacturing' || o.drop?.status === 'funded';
    if (activeTab === 'failed') return o.status === 'refunded';
    return true;
  });

  const handleCancel = async (orderId) => {
    setCancelling(orderId);
    try {
      await api.delete(`/orders/${orderId}`);
      setOrders(o => o.map(ord => ord._id === orderId ? { ...ord, status: 'refunded' } : ord));
      await refreshUser();
      toast.success('Замовлення скасовано. Кошти повернуто.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Помилка скасування');
    } finally {
      setCancelling(null);
    }
  };

  const handleBalanceSuccess = async (newBalance) => {
    await refreshUser();
  };

  return (
    <div className={styles.page}>
      {cardModal && (
        <CardModal
          type={cardModal}
          maxAmount={cardModal === 'withdraw' ? user?.balance : undefined}
          onClose={() => setCardModal(null)}
          onSuccess={handleBalanceSuccess}
        />
      )}
      {confirmCancelId && (
        <ConfirmModal
          message={t('confirm.cancelOrder')}
          confirmText={t('confirm.cancelBtn')}
          cancelText={t('confirm.back')}
          danger
          onConfirm={() => { handleCancel(confirmCancelId); setConfirmCancelId(null); }}
          onCancel={() => setConfirmCancelId(null)}
        />
      )}

      <div className={styles.inner}>
        <div className={styles.sidebar}>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>{user?.name[0].toUpperCase()}</div>
            <h2 className={styles.name}>{user?.name}</h2>
            <span className={styles.role}>{user?.role.toUpperCase()}</span>
            <div className={styles.email}>{user?.email}</div>
            {user?.role === 'designer' && user?.verificationStatus !== 'approved' && (
              <div className={styles.verificationBadge}>
                {user?.verificationStatus === 'pending' ? '⏳ Очікує верифікації' : '❌ Відхилено'}
              </div>
            )}
          </div>

          <div className={styles.balanceCard}>
            <div className={styles.balanceRow}>
              <span className={styles.balLabel}>{t('profile.balance')}</span>
              <span className={styles.balValue}>{user?.balance?.toLocaleString()} грн</span>
            </div>
            {user?.frozenBalance > 0 && (
              <div className={styles.balanceRow}>
                <span className={styles.balLabel}>{t('profile.frozen')}</span>
                <span className={styles.frozen}>{user?.frozenBalance?.toLocaleString()} грн</span>
              </div>
            )}
            <div className={styles.divider} />
            <div className={styles.balanceActions}>
              <button className={styles.topupBtn} onClick={() => setCardModal('topup')}>
                {t('profile.topup')}
              </button>
              <button
                className={styles.withdrawBtn}
                onClick={() => setCardModal('withdraw')}
                disabled={!user?.balance || user.balance <= 0}
              >
                {t('profile.withdraw')}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.main}>
          <h1 className={styles.title}>{t('profile.title')}</h1>

          <div className={styles.tabs}>
            {TABS.map(tab => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {t(`profile.${tab}`)}
                <span className={styles.tabCount}>
                  {orders.filter(o => {
                    if (tab === 'all') return true;
                    if (tab === 'active') return o.status === 'frozen' && o.drop?.status === 'active';
                    if (tab === 'success') return o.status === 'completed' || o.drop?.status === 'manufacturing' || o.drop?.status === 'funded';
                    if (tab === 'failed') return o.status === 'refunded';
                    return false;
                  }).length}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className={styles.loading}>...</div>
          ) : filteredOrders.length === 0 ? (
            <div className={styles.empty}>
              {t('profile.noOrders')} <a href="/drops">→</a>
            </div>
          ) : (
            <div className={styles.ordersList}>
              {filteredOrders.map(order => (
                <div key={order._id} className={`${styles.orderCard} ${styles[order.status]}`}>
                  <div className={styles.orderImage}>
                    {order.drop?.imageUrl && (
                      <img src={order.drop.imageUrl} alt={order.drop.title}
                        onError={e => { e.target.style.display = 'none'; }} />
                    )}
                  </div>
                  <div className={styles.orderInfo}>
                    <div className={styles.orderTop}>
                      <h3 className={styles.orderTitle}>{order.drop?.title?.toUpperCase()}</h3>
                      <span className={styles.orderStatus} style={{ color: STATUS_COLORS[order.status] }}>
                        {t(`status.${order.status}`)}
                      </span>
                    </div>
                    <div className={styles.orderMeta}>
                      <span>{t('profile.size')}: <strong>{order.size}</strong></span>
                      <span>{t('profile.qty')}: <strong>{order.quantity}</strong></span>
                      <span>{t('profile.total')}: <strong>{order.totalAmount?.toLocaleString()} грн</strong></span>
                    </div>
                    <div className={styles.orderDate}>
                      {t('profile.ordered')} {new Date(order.createdAt).toLocaleDateString('uk-UA')}
                    </div>
                    {order.drop?.status && (
                      <div className={styles.dropStatus}>
                        Дроп: <span className={styles[`drop_${order.drop.status}`]}>
                          {t(`status.${order.drop.status}`)}
                        </span>
                      </div>
                    )}
                  </div>
                  {order.status === 'frozen' && order.drop?.status === 'active' && (
                    <button
                      className={styles.cancelBtn}
                      onClick={() => setConfirmCancelId(order._id)}
                      disabled={cancelling === order._id}
                    >
                      {cancelling === order._id ? '...' : t('profile.cancel')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
