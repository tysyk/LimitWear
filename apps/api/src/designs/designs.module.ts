import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DesignsService } from './designs.service';
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
  providers: [DesignsService],
  exports: [MongooseModule, DesignsService],
})
export class DesignsModule {}
