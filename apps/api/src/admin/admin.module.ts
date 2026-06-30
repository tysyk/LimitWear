import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { DropsModule } from '../drops/drops.module';
import { DesignsModule } from '../designs/designs.module';
import { PaymentsModule } from '../payments/payments.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { ProductionModule } from '../production/production.module';
import { RequestsModule } from '../requests/requests.module';
import { SecondChanceModule } from '../second-chance/second-chance.module';
import { AdminSecondChanceController } from './admin-second-chance.controller';
import { AdminProductionController } from './admin-production.controller';
import { UsersModule } from '../users/users.module';
import { AdminDeliveryController } from './admin-delivery.controller';
import { AdminDesignsController } from './admin-designs.controller';
import { AdminDropsController } from './admin-drops.controller';
import { AdminPayoutsController } from './admin-payouts.controller';
import { AdminRequestsController } from './admin-requests.controller';

@Module({
  imports: [
    AuthModule,
    DeliveryModule,
    DesignsModule,
    DropsModule,
    PaymentsModule,
    PayoutsModule,
    ProductionModule,
    RequestsModule,
    SecondChanceModule,
    UsersModule,
  ],
  controllers: [
    AdminDeliveryController,
    AdminDesignsController,
    AdminDropsController,
    AdminPayoutsController,
    AdminProductionController,
    AdminRequestsController,
    AdminSecondChanceController,
  ],
})
export class AdminModule {}
