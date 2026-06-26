import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hasPermission, Permission } from '@limitwear/shared';
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
import type { PublicUser } from '../users/users.service';

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

export type UploadedFileData = {
  originalName: string;
  mimeType: string;
  size: number;
  body: Uint8Array;
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

  async attachPendingFiles(input: {
    userId: string;
    fileIds: string[];
    categories: FileAssetCategory[];
    relatedEntityType: string;
    relatedEntityId: string | Types.ObjectId;
  }): Promise<FileAssetDocument[]> {
    const uniqueFileIds = [...new Set(input.fileIds)];

    if (uniqueFileIds.length === 0) {
      return [];
    }

    if (!uniqueFileIds.every((fileId) => Types.ObjectId.isValid(fileId))) {
      throw new BadRequestException('Invalid file id.');
    }

    const files = await this.fileAssetModel
      .find({
        _id: {
          $in: uniqueFileIds.map((fileId) => new Types.ObjectId(fileId)),
        },
        uploadedByUserId: new Types.ObjectId(input.userId),
        category: {
          $in: input.categories,
        },
        status: FileAssetStatus.Active,
        relatedEntityId: {
          $exists: false,
        },
      })
      .exec();

    if (files.length !== uniqueFileIds.length) {
      throw new BadRequestException('One or more files cannot be attached to this resource.');
    }

    const relatedEntityId = new Types.ObjectId(input.relatedEntityId);

    await Promise.all(
      files.map((file) => {
        file.relatedEntityType = input.relatedEntityType;
        file.relatedEntityId = relatedEntityId;
        return file.save();
      }),
    );

    return files;
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

  async getPrivateUrlForUser(user: PublicUser, fileId: string): Promise<string> {
    if (!Types.ObjectId.isValid(fileId)) {
      throw new NotFoundException('File asset was not found.');
    }

    const file = await this.fileAssetModel.findById(fileId).exec();

    if (!file || file.status === FileAssetStatus.Deleted) {
      throw new NotFoundException('File asset was not found.');
    }

    if (file.visibility === FileVisibility.Public) {
      return this.getPublicUrl(file);
    }

    const canReadAnyPrivateFile = hasPermission(
      user.role,
      Permission.FilesPrivateRead,
      user.permissions,
    );
    const ownsFile = file.uploadedByUserId.toString() === user.id;

    if (!canReadAnyPrivateFile && (file.visibility === FileVisibility.Internal || !ownsFile)) {
      throw new ForbiddenException('You do not have access to this file.');
    }

    return this.getPrivateUrl(file);
  }
}
