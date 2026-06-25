import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { DesignerProfilesModule } from '../designer-profiles/designer-profiles.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { RequestsService } from './requests.service';
import { Request, RequestSchema } from './schemas/request.schema';

@Module({
  imports: [
    AuditModule,
    DesignerProfilesModule,
    MongooseModule.forFeature([
      {
        name: Request.name,
        schema: RequestSchema,
      },
    ]),
    NotificationsModule,
    UsersModule,
  ],
  providers: [RequestsService],
  exports: [MongooseModule, RequestsService],
})
export class RequestsModule {}
