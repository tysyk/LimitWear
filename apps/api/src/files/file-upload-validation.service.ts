import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole, UserStatus } from '@limitwear/shared';
import { FileAssetCategory, FileVisibility } from './schemas/file-asset.schema';

const MB = 1024 * 1024;

type FileRule = {
  allowedTypes: Readonly<Record<string, string>>;
  maxSize: number;
  visibility: FileVisibility;
  allowedRoles: readonly UserRole[];
};

export type FileUploadActor = {
  id: string;
  role: UserRole;
  status: UserStatus;
};

export type FileUploadValidationInput = {
  originalName: string;
  extension: string;
  mimeType: string;
  size: number;
  body: Uint8Array;
  visibility: FileVisibility;
  category: FileAssetCategory;
  uploadedByUserId: string;
  actor: FileUploadActor;
};

const IMAGE_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const IMAGE_AND_PDF_TYPES = {
  ...IMAGE_TYPES,
  pdf: 'application/pdf',
};

const FILE_RULES: Readonly<Record<FileAssetCategory, FileRule>> = {
  [FileAssetCategory.DropImage]: {
    allowedTypes: IMAGE_TYPES,
    maxSize: 10 * MB,
    visibility: FileVisibility.Public,
    allowedRoles: [UserRole.Admin],
  },
  [FileAssetCategory.CollectionBanner]: {
    allowedTypes: IMAGE_TYPES,
    maxSize: 10 * MB,
    visibility: FileVisibility.Public,
    allowedRoles: [UserRole.Admin],
  },
  [FileAssetCategory.DesignOriginal]: {
    allowedTypes: IMAGE_AND_PDF_TYPES,
    maxSize: 25 * MB,
    visibility: FileVisibility.Private,
    allowedRoles: [UserRole.Designer, UserRole.Admin],
  },
  [FileAssetCategory.DesignPreview]: {
    allowedTypes: IMAGE_TYPES,
    maxSize: 10 * MB,
    visibility: FileVisibility.Public,
    allowedRoles: [UserRole.Designer, UserRole.Admin],
  },
  [FileAssetCategory.Mockup]: {
    allowedTypes: IMAGE_TYPES,
    maxSize: 10 * MB,
    visibility: FileVisibility.Public,
    allowedRoles: [UserRole.Designer, UserRole.Admin],
  },
  [FileAssetCategory.ProductionFile]: {
    allowedTypes: IMAGE_AND_PDF_TYPES,
    maxSize: 50 * MB,
    visibility: FileVisibility.Private,
    allowedRoles: [UserRole.Admin],
  },
  [FileAssetCategory.DesignerApplicationFile]: {
    allowedTypes: IMAGE_AND_PDF_TYPES,
    maxSize: 10 * MB,
    visibility: FileVisibility.Private,
    allowedRoles: [UserRole.User, UserRole.Designer, UserRole.Admin],
  },
  [FileAssetCategory.AdminAttachment]: {
    allowedTypes: IMAGE_AND_PDF_TYPES,
    maxSize: 10 * MB,
    visibility: FileVisibility.Internal,
    allowedRoles: [UserRole.Admin],
  },
};

@Injectable()
export class FileUploadValidationService {
  validate(input: FileUploadValidationInput): void {
    const rule = FILE_RULES[input.category];
    const extension = input.extension.trim().toLowerCase().replace(/^\./, '');
    const mimeType = input.mimeType.trim().toLowerCase();

    this.assertActorCanUpload(input, rule);
    this.assertFileNameIsSafe(input.originalName);
    this.assertSize(input, rule);
    this.assertTypeMatchesRule(extension, mimeType, rule);
    this.assertFileSignatureMatchesType(input.body, mimeType);

    if (input.visibility !== rule.visibility) {
      throw new BadRequestException(
        `${input.category} files must use ${rule.visibility} visibility.`,
      );
    }
  }

  private assertActorCanUpload(input: FileUploadValidationInput, rule: FileRule): void {
    if (input.actor.status !== UserStatus.Active) {
      throw new ForbiddenException('Only active users can upload files.');
    }

    if (!rule.allowedRoles.includes(input.actor.role)) {
      throw new ForbiddenException('You do not have permission to upload this file category.');
    }

    if (input.actor.role !== UserRole.Admin && input.actor.id !== input.uploadedByUserId) {
      throw new ForbiddenException('Files can only be uploaded for the current user.');
    }
  }

  private assertFileNameIsSafe(originalName: string): void {
    const name = originalName.trim();

    if (!name || name.length > 255 || name.includes('..') || /[\\/]/.test(name)) {
      throw new BadRequestException('File name is invalid.');
    }
  }

  private assertSize(input: FileUploadValidationInput, rule: FileRule): void {
    if (!Number.isInteger(input.size) || input.size <= 0 || input.size !== input.body.byteLength) {
      throw new BadRequestException('File size is invalid.');
    }

    if (input.size > rule.maxSize) {
      throw new BadRequestException(
        `File exceeds the ${Math.floor(rule.maxSize / MB)} MB limit for ${input.category}.`,
      );
    }
  }

  private assertTypeMatchesRule(extension: string, mimeType: string, rule: FileRule): void {
    if (!extension || rule.allowedTypes[extension] !== mimeType) {
      throw new BadRequestException(
        'File extension and MIME type are not allowed for this category.',
      );
    }
  }

  private assertFileSignatureMatchesType(body: Uint8Array, mimeType: string): void {
    const hasSignature =
      (mimeType === 'image/jpeg' && startsWith(body, [0xff, 0xd8, 0xff])) ||
      (mimeType === 'image/png' && startsWith(body, [0x89, 0x50, 0x4e, 0x47])) ||
      (mimeType === 'image/webp' &&
        startsWith(body, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(body, [0x57, 0x45, 0x42, 0x50], 8)) ||
      (mimeType === 'application/pdf' && startsWith(body, [0x25, 0x50, 0x44, 0x46]));

    if (!hasSignature) {
      throw new BadRequestException('File contents do not match the declared MIME type.');
    }
  }
}

function startsWith(body: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => body[offset + index] === value);
}
