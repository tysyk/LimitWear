import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { CollectionsModule } from './collections/collections.module';
import { DatabaseModule } from './database/database.module';
import { DesignerProfilesModule } from './designer-profiles/designer-profiles.module';
import { DropsModule } from './drops/drops.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    AuditModule,
    CollectionsModule,
    DatabaseModule,
    DesignerProfilesModule,
    DropsModule,
    HealthModule,
    UsersModule,
  ],
})
export class AppModule {}
