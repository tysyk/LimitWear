import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Drop, DropSchema } from './schemas/drop.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Drop.name,
        schema: DropSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class DropsModule {}
