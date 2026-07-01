import { Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { NotificationsService } from './notifications.service';
import { AdminAlertsService } from './admin-alerts.service';

describe('AdminAlertsService', () => {
  let service: AdminAlertsService;
  let usersService: jest.Mocked<Pick<UsersService, 'findActiveAdmins'>>;
  let notificationsService: jest.Mocked<
    Pick<NotificationsService, 'safelyCreateServiceNotification'>
  >;

  beforeEach(() => {
    usersService = {
      findActiveAdmins: jest.fn(),
    };
    notificationsService = {
      safelyCreateServiceNotification: jest.fn(),
    };
    service = new AdminAlertsService(
      usersService as unknown as UsersService,
      notificationsService as unknown as NotificationsService,
    );
  });

  it('creates critical service notifications for active admins', async () => {
    const orderId = new Types.ObjectId();
    usersService.findActiveAdmins.mockResolvedValue([
      {
        id: 'admin-1',
        email: 'first-admin@example.com',
      },
      {
        id: 'admin-2',
        email: 'second-admin@example.com',
      },
    ] as never);
    notificationsService.safelyCreateServiceNotification
      .mockResolvedValueOnce({ id: 'notification-1' } as never)
      .mockResolvedValueOnce(undefined);

    await expect(
      service.alertCritical({
        type: 'payment.webhook_failed',
        title: 'Payment webhook failed',
        message: 'Monobank webhook could not be processed.',
        relatedEntityType: 'order',
        relatedEntityId: orderId,
        metadata: {
          provider: 'monobank',
        },
      }),
    ).resolves.toEqual({ notifiedCount: 1 });

    expect(notificationsService.safelyCreateServiceNotification).toHaveBeenCalledTimes(2);
    expect(notificationsService.safelyCreateServiceNotification).toHaveBeenCalledWith({
      userId: 'admin-1',
      type: 'payment.webhook_failed',
      title: 'Payment webhook failed',
      message: 'Monobank webhook could not be processed.',
      relatedEntityType: 'order',
      relatedEntityId: orderId,
      metadata: {
        provider: 'monobank',
        severity: 'critical',
      },
    });
  });

  it('does not throw when admin lookup fails', async () => {
    usersService.findActiveAdmins.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.alertCritical({
        type: 'system.error',
        title: 'Critical error',
        message: 'Something failed.',
      }),
    ).resolves.toEqual({ notifiedCount: 0 });

    expect(notificationsService.safelyCreateServiceNotification).not.toHaveBeenCalled();
  });
});
