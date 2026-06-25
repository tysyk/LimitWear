import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Design, DesignSchema } from './schemas/design.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Design.name,
        schema: DesignSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class DesignsModule {}
