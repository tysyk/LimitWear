import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { FileUploadValidationService } from './file-upload-validation.service';
import { FilesService } from './files.service';
import {
  FileAssetCategory,
  FileAssetDocument,
  FileAssetStatus,
  FileVisibility,
} from './schemas/file-asset.schema';
import { S3StorageService } from './s3-storage.service';

describe('FilesService', () => {
  let service: FilesService;
  let fileAssetModel: { create: jest.Mock; findById: jest.Mock };
  let fileUploadValidationService: jest.Mocked<Pick<FileUploadValidationService, 'validate'>>;
  let storageService: jest.Mocked<
    Pick<
      S3StorageService,
      'createStorageKey' | 'getBucket' | 'getPrivateUrl' | 'getPublicUrl' | 'uploadObject'
    >
  >;

  beforeEach(() => {
    fileAssetModel = {
      create: jest.fn(),
      findById: jest.fn(),
    };
    fileUploadValidationService = {
      validate: jest.fn(),
    };
    storageService = {
      createStorageKey: jest.fn().mockReturnValue('design_original/unique-file.png'),
      getBucket: jest.fn().mockReturnValue('limitwear-dev'),
      getPrivateUrl: jest.fn(),
      getPublicUrl: jest.fn(),
      uploadObject: jest.fn(),
    };
    service = new FilesService(
      fileAssetModel as unknown as Model<FileAssetDocument>,
      fileUploadValidationService as unknown as FileUploadValidationService,
      storageService as unknown as S3StorageService,
    );
  });

  it('uploads a binary file and stores only its metadata in MongoDB', async () => {
    const userId = new Types.ObjectId().toHexString();
    const createdFile = { id: new Types.ObjectId().toHexString() };
    fileAssetModel.create.mockResolvedValue(createdFile);

    await expect(
      service.upload({
        originalName: 'hoodie-art.png',
        extension: 'png',
        mimeType: 'image/png',
        size: 8,
        body: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]),
        visibility: FileVisibility.Private,
        category: FileAssetCategory.DesignOriginal,
        uploadedByUserId: userId,
        actor: {
          id: userId,
          role: UserRole.Designer,
          status: UserStatus.Active,
        },
      }),
    ).resolves.toBe(createdFile);

    expect(storageService.uploadObject).toHaveBeenCalledWith({
      storageKey: 'design_original/unique-file.png',
      body: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]),
      mimeType: 'image/png',
      visibility: FileVisibility.Private,
    });
    expect(fileAssetModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        originalName: 'hoodie-art.png',
        storageKey: 'design_original/unique-file.png',
        bucket: 'limitwear-dev',
        uploadedByUserId: new Types.ObjectId(userId),
        status: FileAssetStatus.Active,
      }),
    );
    expect(fileUploadValidationService.validate).toHaveBeenCalled();
  });

  it('soft deletes metadata without removing the physical object immediately', async () => {
    const file = {
      status: FileAssetStatus.Active,
      deletedAt: undefined as Date | undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    fileAssetModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(file) });

    await expect(service.softDelete(new Types.ObjectId().toHexString())).resolves.toBe(file);

    expect(file.status).toBe(FileAssetStatus.Deleted);
    expect(file.deletedAt).toBeInstanceOf(Date);
    expect(file.save).toHaveBeenCalled();
  });

  it('does not expose a direct URL for a private file', () => {
    expect(() =>
      service.getPublicUrl({
        storageKey: 'design_original/unique-file.png',
        visibility: FileVisibility.Private,
        status: FileAssetStatus.Active,
      }),
    ).toThrow(BadRequestException);
  });

  it('returns a signed URL for a private file', async () => {
    storageService.getPrivateUrl.mockResolvedValue('https://storage.example/signed-url');

    await expect(
      service.getPrivateUrl({
        storageKey: 'design_original/unique-file.png',
        visibility: FileVisibility.Private,
        status: FileAssetStatus.Active,
      }),
    ).resolves.toBe('https://storage.example/signed-url');
  });

  it('hides a deleted file from URL access', () => {
    expect(() =>
      service.getPublicUrl({
        storageKey: 'drop_image/unique-file.webp',
        visibility: FileVisibility.Public,
        status: FileAssetStatus.Deleted,
      }),
    ).toThrow(NotFoundException);
  });

  it('allows a designer to get a signed URL for their own private file', async () => {
    const userId = new Types.ObjectId().toHexString();
    fileAssetModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        storageKey: 'design_original/owned-file.pdf',
        visibility: FileVisibility.Private,
        status: FileAssetStatus.Active,
        uploadedByUserId: new Types.ObjectId(userId),
      }),
    });
    storageService.getPrivateUrl.mockResolvedValue('https://storage.example/owned-signed-url');

    await expect(
      service.getPrivateUrlForUser(
        {
          id: userId,
          email: 'designer@example.com',
          role: UserRole.Designer,
          permissions: [],
          status: UserStatus.Active,
          isEmailVerified: false,
          isPhoneVerified: false,
        },
        new Types.ObjectId().toHexString(),
      ),
    ).resolves.toBe('https://storage.example/owned-signed-url');
  });

  it('blocks a regular user from another user private file', async () => {
    fileAssetModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        storageKey: 'design_original/another-user-file.pdf',
        visibility: FileVisibility.Private,
        status: FileAssetStatus.Active,
        uploadedByUserId: new Types.ObjectId(),
      }),
    });

    await expect(
      service.getPrivateUrlForUser(
        {
          id: new Types.ObjectId().toHexString(),
          email: 'user@example.com',
          role: UserRole.User,
          permissions: [],
          status: UserStatus.Active,
          isEmailVerified: false,
          isPhoneVerified: false,
        },
        new Types.ObjectId().toHexString(),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows an admin to access internal files', async () => {
    fileAssetModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        storageKey: 'admin_attachment/internal.pdf',
        visibility: FileVisibility.Internal,
        status: FileAssetStatus.Active,
        uploadedByUserId: new Types.ObjectId(),
      }),
    });
    storageService.getPrivateUrl.mockResolvedValue('https://storage.example/admin-signed-url');

    await expect(
      service.getPrivateUrlForUser(
        {
          id: new Types.ObjectId().toHexString(),
          email: 'admin@example.com',
          role: UserRole.Admin,
          permissions: [],
          status: UserStatus.Active,
          isEmailVerified: false,
          isPhoneVerified: false,
        },
        new Types.ObjectId().toHexString(),
      ),
    ).resolves.toBe('https://storage.example/admin-signed-url');
  });
});
