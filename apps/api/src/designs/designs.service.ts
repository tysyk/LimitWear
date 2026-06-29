import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NotificationCategory } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { AuditService, AuditRequestContext } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FilesService, UploadedFileData } from '../files/files.service';
import {
  FileAssetCategory,
  FileAssetDocument,
  FileVisibility,
} from '../files/schemas/file-asset.schema';
import type { PublicUser } from '../users/users.service';
import type { CreateDesignDto } from './dto/create-design.dto';
import { REVIEW_DESIGN_STATUSES, ReviewDesignDto } from './dto/review-design.dto';
import type { UpdateDesignDto } from './dto/update-design.dto';
import { Design, DesignDocument, DesignStatus } from './schemas/design.schema';

const RESUBMITTABLE_STATUSES = [DesignStatus.Draft, DesignStatus.NeedsChanges] as const;

@Injectable()
export class DesignsService {
  constructor(
    @InjectModel(Design.name) private readonly designModel: Model<DesignDocument>,
    private readonly auditService: AuditService,
    private readonly filesService: FilesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findDesignerDesigns(user: PublicUser): Promise<Design[]> {
    return this.designModel
      .find({
        createdByUserId: this.toObjectId(user.id),
      })
      .sort({
        createdAt: -1,
      })
      .lean<Design[]>()
      .exec();
  }

  async createDesignerDesign(user: PublicUser, dto: CreateDesignDto): Promise<Design> {
    this.ensureRequiredString(dto.title, 'title');

    return this.designModel.create({
      ...this.toDesignPayload(dto),
      createdByUserId: this.toObjectId(user.id),
      status: DesignStatus.Draft,
    });
  }

  async findAdminDesigns(): Promise<Design[]> {
    return this.designModel
      .find()
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .lean<Design[]>()
      .exec();
  }

  async updateDesignerDesign(
    user: PublicUser,
    designId: string,
    dto: UpdateDesignDto,
  ): Promise<Design> {
    if (dto.title !== undefined) {
      this.ensureRequiredString(dto.title, 'title');
    }

    const design = await this.findOwnedDesign(user, designId);
    Object.assign(design, this.toDesignPayload(dto));

    return design.save();
  }

  async submitDesignerDesign(user: PublicUser, designId: string): Promise<Design> {
    const design = await this.findOwnedDesign(user, designId);

    if (
      !RESUBMITTABLE_STATUSES.includes(
        design.status as DesignStatus.Draft | DesignStatus.NeedsChanges,
      )
    ) {
      throw new BadRequestException('Only draft or needs changes designs can be submitted');
    }

    design.status =
      design.status === DesignStatus.NeedsChanges
        ? DesignStatus.Resubmitted
        : DesignStatus.Submitted;
    design.submittedAt = new Date();

    return design.save();
  }

  async uploadDesignerFile(
    user: PublicUser,
    designId: string,
    category: FileAssetCategory,
    file: UploadedFileData,
  ): Promise<FileAssetDocument> {
    const design = await this.findOwnedDesign(user, designId);
    const visibility = this.getDesignerFileVisibility(category);
    const uploadedFile = await this.filesService.upload({
      ...file,
      extension: this.getExtension(file.originalName),
      visibility,
      category,
      uploadedByUserId: user.id,
      actor: user,
      relatedEntityType: 'design',
      relatedEntityId: design._id,
    });

    this.attachFileToDesign(design, uploadedFile, category);
    await design.save();

    return uploadedFile;
  }

  async reviewDesign(
    admin: PublicUser,
    designId: string,
    dto: ReviewDesignDto,
    request?: AuditRequestContext,
  ): Promise<Design> {
    this.ensureReviewStatus(dto.status);
    const design = await this.findDesignById(designId);
    const oldStatus = design.status;

    if (dto.status === DesignStatus.Rejected) {
      this.ensureRequiredString(dto.rejectionReason ?? '', 'rejectionReason');
    }

    if (dto.status === DesignStatus.NeedsChanges) {
      this.ensureRequiredString(dto.adminComment ?? '', 'adminComment');
    }

    design.status = dto.status;
    design.adminComment = dto.adminComment?.trim();
    design.rejectionReason = dto.rejectionReason?.trim();

    if (dto.status === DesignStatus.Approved) {
      design.approvedAt = new Date();
      design.approvedBy = this.toObjectId(admin.id);
    }

    const reviewedDesign = await design.save();
    const designEntityId = this.getDocumentId(reviewedDesign);
    const designEntityIdString = designEntityId.toHexString();

    await this.auditService.recordAdminAction(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      {
        action: this.getDesignReviewAction(dto.status),
        entity: {
          type: 'design',
          id: designEntityIdString,
        },
        old: {
          status: oldStatus,
        },
        new: {
          status: reviewedDesign.status,
          adminComment: reviewedDesign.adminComment,
          rejectionReason: reviewedDesign.rejectionReason,
        },
        reason: reviewedDesign.rejectionReason ?? reviewedDesign.adminComment,
        request,
      },
    );

    await this.notificationsService.createForUser({
      userId: reviewedDesign.createdByUserId,
      type: this.getDesignReviewAction(dto.status),
      category: NotificationCategory.Design,
      title: this.getDesignReviewNotificationTitle(dto.status),
      message: this.getDesignReviewNotificationMessage(reviewedDesign),
      relatedEntityType: 'design',
      relatedEntityId: designEntityIdString,
      metadata: {
        status: reviewedDesign.status,
      },
    });

    return reviewedDesign;
  }

  private async findDesignById(designId: string): Promise<DesignDocument> {
    if (!Types.ObjectId.isValid(designId)) {
      throw new NotFoundException('Design was not found');
    }

    const design = await this.designModel.findById(designId).exec();

    if (!design) {
      throw new NotFoundException('Design was not found');
    }

    return design;
  }

  private async findOwnedDesign(user: PublicUser, designId: string): Promise<DesignDocument> {
    const design = await this.findDesignById(designId);

    if (!design || design.createdByUserId.toString() !== user.id) {
      throw new NotFoundException('Design was not found');
    }

    return design;
  }

  private toDesignPayload(dto: UpdateDesignDto): Partial<Design> {
    const payload: Partial<Design> = {};

    if (dto.title !== undefined) {
      payload.title = dto.title.trim();
    }

    if (dto.slug !== undefined) {
      payload.slug = dto.slug.trim().toLowerCase();
    }

    if (dto.description !== undefined) {
      payload.description = dto.description.trim();
    }

    if (dto.category !== undefined) {
      payload.category = dto.category.trim();
    }

    if (dto.tags !== undefined) {
      payload.tags = dto.tags.map((tag) => tag.trim()).filter(Boolean);
    }

    if (dto.mainFileId !== undefined) {
      payload.mainFileId = this.toObjectId(dto.mainFileId);
    }

    if (dto.previewImageIds !== undefined) {
      payload.previewImageIds = this.toObjectIds(dto.previewImageIds);
    }

    if (dto.mockupImageIds !== undefined) {
      payload.mockupImageIds = this.toObjectIds(dto.mockupImageIds);
    }

    if (dto.productionFileIds !== undefined) {
      payload.productionFileIds = this.toObjectIds(dto.productionFileIds);
    }

    return payload;
  }

  private ensureRequiredString(value: string, field: string): void {
    if (value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }
  }

  private ensureReviewStatus(status: DesignStatus): void {
    if (!REVIEW_DESIGN_STATUSES.includes(status as (typeof REVIEW_DESIGN_STATUSES)[number])) {
      throw new BadRequestException('Invalid design review status');
    }
  }

  private getDesignReviewAction(status: DesignStatus): string {
    const actions: Record<string, string> = {
      [DesignStatus.Approved]: 'design.approved',
      [DesignStatus.Rejected]: 'design.rejected',
      [DesignStatus.NeedsChanges]: 'design.needs_changes',
    };

    return actions[status];
  }

  private getDesignReviewNotificationTitle(status: DesignStatus): string {
    const titles: Record<string, string> = {
      [DesignStatus.Approved]: 'Design approved',
      [DesignStatus.Rejected]: 'Design rejected',
      [DesignStatus.NeedsChanges]: 'Design needs changes',
    };

    return titles[status];
  }

  private getDesignReviewNotificationMessage(design: Design): string {
    if (design.status === DesignStatus.Approved) {
      return `Your design "${design.title}" was approved.`;
    }

    if (design.status === DesignStatus.Rejected) {
      return `Your design "${design.title}" was rejected.`;
    }

    return `Your design "${design.title}" needs changes.`;
  }

  private getDocumentId(design: DesignDocument): Types.ObjectId {
    return design._id;
  }

  private getDesignerFileVisibility(category: FileAssetCategory): FileVisibility {
    const visibilityByCategory: Partial<Record<FileAssetCategory, FileVisibility>> = {
      [FileAssetCategory.DesignOriginal]: FileVisibility.Private,
      [FileAssetCategory.DesignPreview]: FileVisibility.Public,
      [FileAssetCategory.Mockup]: FileVisibility.Public,
    };
    const visibility = visibilityByCategory[category];

    if (!visibility) {
      throw new BadRequestException('This file category cannot be uploaded to a designer draft.');
    }

    return visibility;
  }

  private attachFileToDesign(
    design: DesignDocument,
    file: FileAssetDocument,
    category: FileAssetCategory,
  ): void {
    if (category === FileAssetCategory.DesignOriginal) {
      design.mainFileId = file._id;
      return;
    }

    if (category === FileAssetCategory.DesignPreview) {
      design.previewImageIds.push(file._id);
      return;
    }

    design.mockupImageIds.push(file._id);
  }

  private getExtension(originalName: string): string {
    return originalName.split('.').pop()?.toLowerCase() ?? '';
  }

  private toObjectIds(values: string[]): Types.ObjectId[] {
    return values.map((value) => this.toObjectId(value));
  }

  private toObjectId(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('Invalid object id');
    }

    return new Types.ObjectId(value);
  }
}
