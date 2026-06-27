import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type FileAssetDocument = HydratedDocument<FileAsset>;

export enum FileVisibility {
  Public = 'public',
  Private = 'private',
  Internal = 'internal',
}

export enum FileAssetCategory {
  DropImage = 'drop_image',
  CollectionBanner = 'collection_banner',
  DesignOriginal = 'design_original',
  DesignPreview = 'design_preview',
  Mockup = 'mockup',
  ProductionFile = 'production_file',
  DesignerApplicationFile = 'designer_application_file',
  AdminAttachment = 'admin_attachment',
}

export enum FileAssetStatus {
  Active = 'active',
  Replaced = 'replaced',
  Deleted = 'deleted',
  Quarantined = 'quarantined',
}

@Schema({
  collection: 'file_assets',
  timestamps: true,
})
export class FileAsset {
  @Prop({
    required: true,
    trim: true,
  })
  originalName!: string;

  @Prop({
    required: true,
    trim: true,
  })
  storageKey!: string;

  @Prop({
    required: true,
    trim: true,
  })
  bucket!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
  })
  mimeType!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
  })
  extension!: string;

  @Prop({
    required: true,
    min: 0,
  })
  size!: number;

  @Prop({
    type: String,
    enum: Object.values(FileVisibility),
    default: FileVisibility.Private,
    required: true,
  })
  visibility!: FileVisibility;

  @Prop({
    type: String,
    enum: Object.values(FileAssetCategory),
    required: true,
  })
  category!: FileAssetCategory;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  uploadedByUserId!: Types.ObjectId;

  @Prop({
    trim: true,
  })
  relatedEntityType?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  relatedEntityId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(FileAssetStatus),
    default: FileAssetStatus.Active,
    required: true,
  })
  status!: FileAssetStatus;

  @Prop()
  deletedAt?: Date;
}

export const FileAssetSchema = SchemaFactory.createForClass(FileAsset);

FileAssetSchema.index({ storageKey: 1 }, { unique: true });
FileAssetSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });
FileAssetSchema.index({ visibility: 1 });
FileAssetSchema.index({ status: 1 });
FileAssetSchema.index({ category: 1 });
FileAssetSchema.index({ uploadedByUserId: 1, createdAt: -1 });
