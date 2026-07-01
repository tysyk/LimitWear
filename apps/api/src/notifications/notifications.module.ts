import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AdminAlertsService } from './admin-alerts.service';
import { EmailProviderService } from './email-provider.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TelegramProviderService } from './telegram-provider.service';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import {
  NotificationSettings,
  NotificationSettingsSchema,
} from './schemas/notification-settings.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
      {
        name: NotificationSettings.name,
        schema: NotificationSettingsSchema,
      },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    AdminAlertsService,
    EmailProviderService,
    NotificationsService,
    TelegramProviderService,
  ],
  exports: [
    AdminAlertsService,
    EmailProviderService,
    NotificationsService,
    TelegramProviderService,
  ],
})
export class NotificationsModule {}
