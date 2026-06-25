import {
  FileAsset,
  FileAssetCategory,
  FileAssetSchema,
  FileAssetStatus,
  FileVisibility,
} from './file-asset.schema';

describe('FileAssetSchema', () => {
  it('uses the file_assets collection with timestamps', () => {
    expect(FileAssetSchema.get('collection')).toBe('file_assets');
    expect(FileAssetSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline file metadata fields and defaults', () => {
    expect(FileAssetSchema.path('originalName').options.required).toBe(true);
    expect(FileAssetSchema.path('storageKey').options.required).toBe(true);
    expect(FileAssetSchema.path('storageKey').options.unique).toBe(true);
    expect(FileAssetSchema.path('bucket').options.required).toBe(true);
    expect(FileAssetSchema.path('mimeType').options.required).toBe(true);
    expect(FileAssetSchema.path('mimeType').options.lowercase).toBe(true);
    expect(FileAssetSchema.path('extension').options.required).toBe(true);
    expect(FileAssetSchema.path('extension').options.lowercase).toBe(true);
    expect(FileAssetSchema.path('size').options.required).toBe(true);
    expect(FileAssetSchema.path('size').options.min).toBe(0);
    expect(FileAssetSchema.path('visibility').options.enum).toEqual(Object.values(FileVisibility));
    expect(FileAssetSchema.path('visibility').options.default).toBe(FileVisibility.Private);
    expect(FileAssetSchema.path('category').options.enum).toEqual(Object.values(FileAssetCategory));
    expect(FileAssetSchema.path('category').options.required).toBe(true);
    expect(FileAssetSchema.path('uploadedByUserId').options.required).toBe(true);
    expect(FileAssetSchema.path('relatedEntityType')).toBeDefined();
    expect(FileAssetSchema.path('relatedEntityId')).toBeDefined();
    expect(FileAssetSchema.path('status').options.enum).toEqual(Object.values(FileAssetStatus));
    expect(FileAssetSchema.path('status').options.default).toBe(FileAssetStatus.Active);
    expect(FileAssetSchema.path('deletedAt')).toBeDefined();
  });

  it('indexes storage and access patterns', () => {
    expect(FileAssetSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ storageKey: 1 }, expect.objectContaining({ unique: true })],
        [{ relatedEntityType: 1, relatedEntityId: 1 }, expect.any(Object)],
        [{ visibility: 1 }, expect.any(Object)],
        [{ status: 1 }, expect.any(Object)],
        [{ category: 1 }, expect.any(Object)],
        [{ uploadedByUserId: 1, createdAt: -1 }, expect.any(Object)],
      ]),
    );
  });

  it('exposes the FileAsset class for Mongoose registration', () => {
    expect(FileAsset.name).toBe('FileAsset');
  });
});
