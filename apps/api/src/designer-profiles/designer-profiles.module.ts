import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DesignerProfile, DesignerProfileSchema } from './schemas/designer-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DesignerProfile.name,
        schema: DesignerProfileSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class DesignerProfilesModule {}
