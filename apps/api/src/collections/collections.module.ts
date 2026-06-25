import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Collection, CollectionSchema } from './schemas/collection.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Collection.name,
        schema: CollectionSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class CollectionsModule {}
