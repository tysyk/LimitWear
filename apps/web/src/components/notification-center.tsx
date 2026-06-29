'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  getNotificationSettings,
  getNotifications,
  markAllNotificationsRead,
  NotificationRecord,
  NotificationSettings,
  NotificationStatus,
  updateNotificationSettings,
} from '../lib/notifications-api';

const FILTERS: Array<{ label: string; value?: NotificationStatus }> = [
  { label: 'All' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
];

export function NotificationCenter() {
  const [filter, setFilter] = useState<NotificationStatus | undefined>();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getNotifications(filter), getNotificationSettings()])
      .then(([items, currentSettings]) => {
        if (!isMounted) return;
        setNotifications(items);
        setSettings(currentSettings);
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Не вдалося завантажити notifications.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [filter]);

  async function handleMarkAllRead() {
    setError(null);
    setSuccess(null);

    try {
      const result = await markAllNotificationsRead();
      setNotifications((items) =>
        items.map((item) => ({ ...item, status: 'read' as NotificationStatus })),
      );
      setSuccess(`Marked as read: ${result.modifiedCount}.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Не вдалося позначити notifications як прочитані.',
      );
    }
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateNotificationSettings({
        emailEnabled: settings.emailEnabled,
        telegramEnabled: settings.telegramEnabled,
        wishlistEnabled: settings.wishlistEnabled,
        secondChanceEnabled: settings.secondChanceEnabled,
        marketingOptIn: settings.marketingOptIn,
      });
      setSettings(updated);
      setSuccess('Notification settings saved.');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Не вдалося зберегти notification settings.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-panel admin-panel--wide">
      <div className="section-heading">
        <p className="eyebrow">Profile</p>
        <h1>Notification Center</h1>
        <p>
          In-app notifications завжди увімкнені. Email/Telegram/корисні нагадування можна
          налаштувати, marketing off by default.
        </p>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="notification-toolbar">
        <div className="hero-actions">
          {FILTERS.map((item) => (
            <button
              className={`button ${filter === item.value ? '' : 'button--secondary'}`}
              key={item.label}
              onClick={() => setFilter(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <button className="button button--secondary" onClick={handleMarkAllRead} type="button">
          Mark all read
        </button>
      </div>

      {isLoading ? (
        <div className="empty-state">
          <h2>Завантажую...</h2>
        </div>
      ) : notifications.length > 0 ? (
        <div className="notification-list">
          {notifications.map((notification) => (
            <article className="surface-card" key={notification._id ?? notification.title}>
              <p className="eyebrow">
                {notification.category} · {notification.status}
              </p>
              <h2>{notification.title}</h2>
              <p>{notification.message}</p>
              {notification.createdAt ? (
                <small>{new Date(notification.createdAt).toLocaleString('uk-UA')}</small>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Поки без notifications</h2>
          <p>Коли будуть події по order/payment/delivery/production — вони зʼявляться тут.</p>
        </div>
      )}

      {settings ? (
        <form className="delivery-form" onSubmit={handleSettingsSubmit}>
          <div className="section-heading">
            <p className="eyebrow">Settings</p>
            <h2>Notification settings</h2>
          </div>

          <Toggle
            checked={settings.inAppEnabled}
            disabled
            label="In-app notifications"
            onChange={() => undefined}
          />
          <Toggle
            checked={settings.emailEnabled}
            label="Email"
            onChange={(checked) => setSettings({ ...settings, emailEnabled: checked })}
          />
          <Toggle
            checked={settings.telegramEnabled}
            label="Telegram"
            onChange={(checked) => setSettings({ ...settings, telegramEnabled: checked })}
          />
          <Toggle
            checked={settings.wishlistEnabled}
            label="Wishlist reminders"
            onChange={(checked) => setSettings({ ...settings, wishlistEnabled: checked })}
          />
          <Toggle
            checked={settings.secondChanceEnabled}
            label="Second Chance"
            onChange={(checked) => setSettings({ ...settings, secondChanceEnabled: checked })}
          />
          <Toggle
            checked={settings.marketingOptIn}
            label="Marketing opt-in"
            onChange={(checked) => setSettings({ ...settings, marketingOptIn: checked })}
          />

          <button className="button" disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
