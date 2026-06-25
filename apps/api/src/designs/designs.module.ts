import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DesignsService } from './designs.service';
import { Design, DesignSchema } from './schemas/design.schema';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      {
        name: Design.name,
        schema: DesignSchema,
      },
    ]),
    NotificationsModule,
  ],
  providers: [DesignsService],
  exports: [MongooseModule, DesignsService],
})
export class DesignsModule {}
