import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Drop, DropSchema } from '../drops/schemas/drop.schema';
import { DesignerProfilesService } from './designer-profiles.service';
import { DesignersController } from './designers.controller';
import { DesignerProfile, DesignerProfileSchema } from './schemas/designer-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DesignerProfile.name,
        schema: DesignerProfileSchema,
      },
      {
        name: Drop.name,
        schema: DropSchema,
      },
    ]),
  ],
  controllers: [DesignersController],
  providers: [DesignerProfilesService],
  exports: [MongooseModule, DesignerProfilesService],
})
export class DesignerProfilesModule {}
