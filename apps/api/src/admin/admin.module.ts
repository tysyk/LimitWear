import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DropsModule } from '../drops/drops.module';
import { DesignsModule } from '../designs/designs.module';
import { PaymentsModule } from '../payments/payments.module';
import { RequestsModule } from '../requests/requests.module';
import { UsersModule } from '../users/users.module';
import { AdminDesignsController } from './admin-designs.controller';
import { AdminDropsController } from './admin-drops.controller';
import { AdminRequestsController } from './admin-requests.controller';

@Module({
  imports: [AuthModule, DesignsModule, DropsModule, PaymentsModule, RequestsModule, UsersModule],
  controllers: [AdminDesignsController, AdminDropsController, AdminRequestsController],
})
export class AdminModule {}
