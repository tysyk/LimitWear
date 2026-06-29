import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { DropsModule } from '../drops/drops.module';
import { DesignsModule } from '../designs/designs.module';
import { PaymentsModule } from '../payments/payments.module';
import { RequestsModule } from '../requests/requests.module';
import { UsersModule } from '../users/users.module';
import { AdminDeliveryController } from './admin-delivery.controller';
import { AdminDesignsController } from './admin-designs.controller';
import { AdminDropsController } from './admin-drops.controller';
import { AdminRequestsController } from './admin-requests.controller';

@Module({
  imports: [
    AuthModule,
    DeliveryModule,
    DesignsModule,
    DropsModule,
    PaymentsModule,
    RequestsModule,
    UsersModule,
  ],
  controllers: [
    AdminDeliveryController,
    AdminDesignsController,
    AdminDropsController,
    AdminRequestsController,
  ],
})
export class AdminModule {}
