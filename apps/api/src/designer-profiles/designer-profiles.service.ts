import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PUBLIC_DROP_STATUSES } from '../drops/drops.service';
import { Drop, DropDocument } from '../drops/schemas/drop.schema';
import {
  DesignerProfile,
  DesignerProfileDocument,
  DesignerProfileStatus,
} from './schemas/designer-profile.schema';

type DesignerProfileWithId = DesignerProfile & {
  _id?: Types.ObjectId;
};

export interface CreateApprovedDesignerProfileInput {
  userId: Types.ObjectId | string;
  displayName: string;
  slug: string;
  bio?: string;
  portfolioLinks?: string[];
  approvedBy: Types.ObjectId | string;
}

@Injectable()
export class DesignerProfilesService {
  constructor(
    @InjectModel(DesignerProfile.name)
    private readonly designerProfileModel: Model<DesignerProfileDocument>,
    @InjectModel(Drop.name)
    private readonly dropModel: Model<DropDocument>,
  ) {}

  async findActiveDesigners(): Promise<DesignerProfile[]> {
    return this.designerProfileModel
      .find({
        status: DesignerProfileStatus.Active,
      })
      .sort({
        displayName: 1,
        createdAt: -1,
      })
      .lean<DesignerProfile[]>()
      .exec();
  }

  async findActiveDesignerBySlug(slug: string): Promise<DesignerProfile> {
    const designerProfile = await this.designerProfileModel
      .findOne({
        slug: this.normalizeSlug(slug),
        status: DesignerProfileStatus.Active,
      })
      .lean<DesignerProfile>()
      .exec();

    if (!designerProfile) {
      throw new NotFoundException('Designer was not found');
    }

    return designerProfile;
  }

  async findActiveDesignerDrops(slug: string): Promise<Drop[]> {
    const designerProfile = (await this.findActiveDesignerBySlug(slug)) as DesignerProfileWithId;

    return this.dropModel
      .find({
        designerId: designerProfile._id,
        status: {
          $in: PUBLIC_DROP_STATUSES,
        },
      })
      .sort({
        startsAt: -1,
        createdAt: -1,
      })
      .lean<Drop[]>()
      .exec();
  }

  async createApprovedProfile(input: CreateApprovedDesignerProfileInput): Promise<DesignerProfile> {
    return this.designerProfileModel.create({
      userId: this.toObjectId(input.userId),
      displayName: input.displayName.trim(),
      slug: this.normalizeSlug(input.slug),
      bio: input.bio?.trim(),
      portfolioLinks: input.portfolioLinks ?? [],
      status: DesignerProfileStatus.Active,
      approvedAt: new Date(),
      approvedBy: this.toObjectId(input.approvedBy),
    });
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private toObjectId(value: Types.ObjectId | string): Types.ObjectId {
    return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
  }
}
