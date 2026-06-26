import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesService } from './files.service';
import { FileAsset, FileAssetSchema } from './schemas/file-asset.schema';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: FileAsset.name,
        schema: FileAssetSchema,
      },
    ]),
  ],
  providers: [FilesService, S3StorageService],
  exports: [FilesService, S3StorageService, MongooseModule],
})
export class FilesModule {}
