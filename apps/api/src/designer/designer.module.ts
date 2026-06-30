import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { DesignsModule } from '../designs/designs.module';
import { FilesModule } from '../files/files.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { RequestsModule } from '../requests/requests.module';
import { DesignerController } from './designer.controller';

@Module({
  imports: [AnalyticsModule, AuthModule, DesignsModule, FilesModule, PayoutsModule, RequestsModule],
  controllers: [DesignerController],
})
export class DesignerModule {}
