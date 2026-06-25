import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { PublicUser } from '../users/users.service';
import type { CreateDesignDto } from './dto/create-design.dto';
import type { UpdateDesignDto } from './dto/update-design.dto';
import { Design, DesignDocument, DesignStatus } from './schemas/design.schema';

const RESUBMITTABLE_STATUSES = [DesignStatus.Draft, DesignStatus.NeedsChanges] as const;

@Injectable()
export class DesignsService {
  constructor(@InjectModel(Design.name) private readonly designModel: Model<DesignDocument>) {}

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

  private async findOwnedDesign(user: PublicUser, designId: string): Promise<DesignDocument> {
    if (!Types.ObjectId.isValid(designId)) {
      throw new NotFoundException('Design was not found');
    }

    const design = await this.designModel.findById(designId).exec();

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
