import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DesignsModule } from '../designs/designs.module';
import { FilesModule } from '../files/files.module';
import { RequestsModule } from '../requests/requests.module';
import { DesignerController } from './designer.controller';

@Module({
  imports: [AuthModule, DesignsModule, FilesModule, RequestsModule],
  controllers: [DesignerController],
})
export class DesignerModule {}
