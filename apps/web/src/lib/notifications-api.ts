import { sendRequest } from './auth-api';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface NotificationRecord {
  _id?: string;
  type: string;
  category: string;
  channel: string;
  status: NotificationStatus;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
  readAt?: string;
  createdAt?: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  telegramEnabled: boolean;
  wishlistEnabled: boolean;
  secondChanceEnabled: boolean;
  marketingOptIn: boolean;
  inAppEnabled: boolean;
}

export async function getNotifications(status?: NotificationStatus): Promise<NotificationRecord[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return sendRequest<NotificationRecord[]>(`/notifications${query}`, {
    method: 'GET',
  });
}

export async function markAllNotificationsRead(): Promise<{ modifiedCount: number }> {
  return sendRequest<{ modifiedCount: number }>('/notifications/mark-all-read', {
    method: 'POST',
  });
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return sendRequest<NotificationSettings>('/notifications/settings', {
    method: 'GET',
  });
}

export async function updateNotificationSettings(
  payload: Partial<Omit<NotificationSettings, 'inAppEnabled'>>,
): Promise<NotificationSettings> {
  return sendRequest<NotificationSettings>('/notifications/settings', {
    body: JSON.stringify(payload),
    method: 'PATCH',
  });
}
