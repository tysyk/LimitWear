import { UserRole, UserStatus } from '@limitwear/shared';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: jest.Mocked<
    Pick<NotificationsService, 'listForUser' | 'markAllRead' | 'getSettings' | 'updateSettings'>
  >;

  const request = {
    user: {
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: false,
      isPhoneVerified: false,
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    notificationsService = {
      listForUser: jest.fn(),
      markAllRead: jest.fn(),
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
    };
    controller = new NotificationsController(
      notificationsService as unknown as NotificationsService,
    );
  });

  it('lists current user notifications with filters', async () => {
    notificationsService.listForUser.mockResolvedValue([{ id: 'notification-id' }] as never);

    await expect(controller.list(request, 'unread')).resolves.toEqual([{ id: 'notification-id' }]);
    expect(notificationsService.listForUser).toHaveBeenCalledWith('user-id', {
      status: 'unread',
    });
  });

  it('marks all current user notifications as read', async () => {
    notificationsService.markAllRead.mockResolvedValue({ modifiedCount: 2 });

    await expect(controller.markAllRead(request)).resolves.toEqual({ modifiedCount: 2 });
    expect(notificationsService.markAllRead).toHaveBeenCalledWith('user-id');
  });

  it('gets and updates current user notification settings', async () => {
    notificationsService.getSettings.mockResolvedValue({ id: 'settings-id' } as never);
    notificationsService.updateSettings.mockResolvedValue({ id: 'settings-id' } as never);

    await expect(controller.getSettings(request)).resolves.toEqual({ id: 'settings-id' });
    await expect(controller.updateSettings(request, { marketingOptIn: true })).resolves.toEqual({
      id: 'settings-id',
    });
    expect(notificationsService.updateSettings).toHaveBeenCalledWith('user-id', {
      marketingOptIn: true,
    });
  });
});
