import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole, UserStatus } from '@limitwear/shared';
import { FileUploadValidationService } from './file-upload-validation.service';
import { FileAssetCategory, FileVisibility } from './schemas/file-asset.schema';

describe('FileUploadValidationService', () => {
  const service = new FileUploadValidationService();
  const userId = '667b0cdd4e6b3d4cf1d7b0c1';
  const validPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);

  const createInput = (overrides = {}) => ({
    originalName: 'design-preview.png',
    extension: 'png',
    mimeType: 'image/png',
    size: validPng.byteLength,
    body: validPng,
    visibility: FileVisibility.Public,
    category: FileAssetCategory.DesignPreview,
    uploadedByUserId: userId,
    actor: {
      id: userId,
      role: UserRole.Designer,
      status: UserStatus.Active,
    },
    ...overrides,
  });

  it('accepts an active designer upload with a matching image signature', () => {
    expect(() => service.validate(createInput())).not.toThrow();
  });

  it('blocks an executable extension even when its MIME type is changed', () => {
    expect(() =>
      service.validate(
        createInput({
          originalName: 'virus.exe',
          extension: 'exe',
          mimeType: 'application/octet-stream',
        }),
      ),
    ).toThrow(BadRequestException);
  });

  it('blocks SVG files from the public image pipeline', () => {
    expect(() =>
      service.validate(
        createInput({
          originalName: 'unsafe.svg',
          extension: 'svg',
          mimeType: 'image/svg+xml',
          body: new Uint8Array([0x3c, 0x73, 0x76, 0x67]),
          size: 4,
        }),
      ),
    ).toThrow(BadRequestException);
  });

  it('blocks a file whose bytes do not match its declared MIME type', () => {
    expect(() =>
      service.validate(
        createInput({
          body: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
          size: 4,
        }),
      ),
    ).toThrow('File contents do not match the declared MIME type');
  });

  it('enforces the category visibility rule', () => {
    expect(() =>
      service.validate(
        createInput({
          visibility: FileVisibility.Private,
        }),
      ),
    ).toThrow('design_preview files must use public visibility');
  });

  it('blocks a designer from creating admin attachments', () => {
    expect(() =>
      service.validate(
        createInput({
          category: FileAssetCategory.AdminAttachment,
          visibility: FileVisibility.Internal,
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks uploads on behalf of another user without admin rights', () => {
    expect(() =>
      service.validate(
        createInput({
          uploadedByUserId: '667b0cdd4e6b3d4cf1d7b0c2',
        }),
      ),
    ).toThrow('Files can only be uploaded for the current user');
  });

  it('enforces the configured category size limit', () => {
    expect(() =>
      service.validate(
        createInput({
          category: FileAssetCategory.DesignOriginal,
          visibility: FileVisibility.Private,
          mimeType: 'image/png',
          size: 25 * 1024 * 1024 + 1,
          body: Object.assign(new Uint8Array(25 * 1024 * 1024 + 1), {
            0: 0x89,
            1: 0x50,
            2: 0x4e,
            3: 0x47,
          }),
        }),
      ),
    ).toThrow('File exceeds the 25 MB limit');
  });
});
