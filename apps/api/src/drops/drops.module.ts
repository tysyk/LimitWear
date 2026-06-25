import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DropsController } from './drops.controller';
import { DropsService } from './drops.service';
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
  controllers: [DropsController],
  providers: [DropsService],
  exports: [MongooseModule, DropsService],
})
export class DropsModule {}
