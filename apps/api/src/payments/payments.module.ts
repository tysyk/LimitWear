import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { DropsModule } from '../drops/drops.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { MonobankService } from './monobank.service';
import { MonobankWebhooksController } from './monobank-webhooks.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './schemas/payment.schema';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    DropsModule,
    NotificationsModule,
    OrdersModule,
    MongooseModule.forFeature([
      {
        name: Payment.name,
        schema: PaymentSchema,
      },
    ]),
  ],
  controllers: [PaymentsController, MonobankWebhooksController],
  providers: [MonobankService, PaymentsService],
  exports: [PaymentsService, MonobankService, MongooseModule],
})
export class PaymentsModule {}
