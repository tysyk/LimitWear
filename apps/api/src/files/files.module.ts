import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { FileUploadValidationService } from './file-upload-validation.service';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileAsset, FileAssetSchema } from './schemas/file-asset.schema';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: FileAsset.name,
        schema: FileAssetSchema,
      },
    ]),
  ],
  controllers: [FilesController],
  providers: [FilesService, FileUploadValidationService, S3StorageService],
  exports: [FilesService, FileUploadValidationService, S3StorageService, MongooseModule],
})
export class FilesModule {}
