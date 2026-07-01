import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { NotificationsService } from './notifications.service';

export interface CriticalAdminAlertInput {
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
}

export interface AdminAlertResult {
  notifiedCount: number;
}

@Injectable()
export class AdminAlertsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async alertCritical(input: CriticalAdminAlertInput): Promise<AdminAlertResult> {
    try {
      const admins = await this.usersService.findActiveAdmins();
      const notifications = await Promise.all(
        admins.map((admin) =>
          this.notificationsService.safelyCreateServiceNotification({
            userId: admin.id,
            type: input.type,
            title: input.title,
            message: input.message,
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            metadata: {
              ...input.metadata,
              severity: 'critical',
            },
          }),
        ),
      );

      return {
        notifiedCount: notifications.filter(Boolean).length,
      };
    } catch {
      return {
        notifiedCount: 0,
      };
    }
  }
}
