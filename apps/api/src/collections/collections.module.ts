import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Drop, DropSchema } from '../drops/schemas/drop.schema';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { Collection, CollectionSchema } from './schemas/collection.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Collection.name,
        schema: CollectionSchema,
      },
      {
        name: Drop.name,
        schema: DropSchema,
      },
    ]),
  ],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [MongooseModule, CollectionsService],
})
export class CollectionsModule {}
