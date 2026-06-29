import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { DropsModule } from '../drops/drops.module';
import { DesignsModule } from '../designs/designs.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProductionModule } from '../production/production.module';
import { RequestsModule } from '../requests/requests.module';
import { AdminProductionController } from './admin-production.controller';
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
    ProductionModule,
    RequestsModule,
    UsersModule,
  ],
  controllers: [
    AdminDeliveryController,
    AdminDesignsController,
    AdminDropsController,
    AdminProductionController,
    AdminRequestsController,
  ],
})
export class AdminModule {}
