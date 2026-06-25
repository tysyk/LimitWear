import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileAsset, FileAssetSchema } from './schemas/file-asset.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: FileAsset.name,
        schema: FileAssetSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class FilesModule {}
