import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { CollectionsModule } from './collections/collections.module';
import { DatabaseModule } from './database/database.module';
import { DeliveryModule } from './delivery/delivery.module';
import { DesignerModule } from './designer/designer.module';
import { DesignerProfilesModule } from './designer-profiles/designer-profiles.module';
import { DesignsModule } from './designs/designs.module';
import { DropsModule } from './drops/drops.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PayoutsModule } from './payouts/payouts.module';
import { ProductionModule } from './production/production.module';
import { RequestsModule } from './requests/requests.module';
import { SecondChanceModule } from './second-chance/second-chance.module';
import { UsersModule } from './users/users.module';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdminModule,
    AnalyticsModule,
    AuthModule,
    AuditModule,
    CollectionsModule,
    DatabaseModule,
    DeliveryModule,
    DesignerModule,
    DesignerProfilesModule,
    DesignsModule,
    DropsModule,
    FilesModule,
    HealthModule,
    OrdersModule,
    PaymentsModule,
    PayoutsModule,
    ProductionModule,
    RequestsModule,
    SecondChanceModule,
    UsersModule,
    WishlistModule,
  ],
})
export class AppModule {}
