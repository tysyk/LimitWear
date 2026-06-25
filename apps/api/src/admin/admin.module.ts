import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DesignsModule } from '../designs/designs.module';
import { RequestsModule } from '../requests/requests.module';
import { UsersModule } from '../users/users.module';
import { AdminDesignsController } from './admin-designs.controller';
import { AdminRequestsController } from './admin-requests.controller';

@Module({
  imports: [AuthModule, DesignsModule, RequestsModule, UsersModule],
  controllers: [AdminDesignsController, AdminRequestsController],
})
export class AdminModule {}
