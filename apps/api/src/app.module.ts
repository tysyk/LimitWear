import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { CollectionsModule } from './collections/collections.module';
import { DatabaseModule } from './database/database.module';
import { DesignerModule } from './designer/designer.module';
import { DesignerProfilesModule } from './designer-profiles/designer-profiles.module';
import { DesignsModule } from './designs/designs.module';
import { DropsModule } from './drops/drops.module';
import { HealthModule } from './health/health.module';
import { RequestsModule } from './requests/requests.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdminModule,
    AuthModule,
    AuditModule,
    CollectionsModule,
    DatabaseModule,
    DesignerModule,
    DesignerProfilesModule,
    DesignsModule,
    DropsModule,
    HealthModule,
    RequestsModule,
    UsersModule,
  ],
})
export class AppModule {}
