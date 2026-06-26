import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FileAsset,
  FileAssetCategory,
  FileAssetDocument,
  FileAssetStatus,
  FileVisibility,
} from './schemas/file-asset.schema';
import { FileUploadActor, FileUploadValidationService } from './file-upload-validation.service';
import { S3StorageService } from './s3-storage.service';

export type UploadFileInput = {
  originalName: string;
  extension: string;
  mimeType: string;
  size: number;
  body: Uint8Array;
  visibility: FileVisibility;
  category: FileAssetCategory;
  uploadedByUserId: string | Types.ObjectId;
  actor: FileUploadActor;
  relatedEntityType?: string;
  relatedEntityId?: string | Types.ObjectId;
};

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(FileAsset.name)
    private readonly fileAssetModel: Model<FileAssetDocument>,
    private readonly fileUploadValidationService: FileUploadValidationService,
    private readonly storageService: S3StorageService,
  ) {}

  async upload(input: UploadFileInput): Promise<FileAssetDocument> {
    this.fileUploadValidationService.validate({
      ...input,
      uploadedByUserId: input.uploadedByUserId.toString(),
    });

    const storageKey = this.storageService.createStorageKey(input.category, input.extension);

    await this.storageService.uploadObject({
      storageKey,
      body: input.body,
      mimeType: input.mimeType,
      visibility: input.visibility,
    });

    return this.fileAssetModel.create({
      originalName: input.originalName,
      storageKey,
      bucket: this.storageService.getBucket(),
      mimeType: input.mimeType,
      extension: input.extension,
      size: input.size,
      visibility: input.visibility,
      category: input.category,
      uploadedByUserId: new Types.ObjectId(input.uploadedByUserId),
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId
        ? new Types.ObjectId(input.relatedEntityId)
        : undefined,
      status: FileAssetStatus.Active,
    });
  }

  async softDelete(fileId: string): Promise<FileAssetDocument> {
    const file = await this.fileAssetModel.findById(fileId).exec();

    if (!file) {
      throw new NotFoundException('File asset was not found.');
    }

    if (file.status !== FileAssetStatus.Deleted) {
      file.status = FileAssetStatus.Deleted;
      file.deletedAt = new Date();
      await file.save();
    }

    return file;
  }

  getPublicUrl(file: Pick<FileAsset, 'storageKey' | 'visibility' | 'status'>): string {
    if (file.status === FileAssetStatus.Deleted) {
      throw new NotFoundException('File asset was not found.');
    }

    if (file.visibility !== FileVisibility.Public) {
      throw new BadRequestException('Only public file assets have a direct URL.');
    }

    return this.storageService.getPublicUrl(file.storageKey);
  }

  async getPrivateUrl(
    file: Pick<FileAsset, 'storageKey' | 'visibility' | 'status'>,
  ): Promise<string> {
    if (file.status === FileAssetStatus.Deleted) {
      throw new NotFoundException('File asset was not found.');
    }

    if (file.visibility === FileVisibility.Public) {
      throw new BadRequestException('Public file assets do not require a signed URL.');
    }

    return this.storageService.getPrivateUrl(file.storageKey);
  }
}
