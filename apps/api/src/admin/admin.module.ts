import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DesignsModule } from '../designs/designs.module';
import { AdminDesignsController } from './admin-designs.controller';

@Module({
  imports: [AuthModule, DesignsModule],
  controllers: [AdminDesignsController],
})
export class AdminModule {}
