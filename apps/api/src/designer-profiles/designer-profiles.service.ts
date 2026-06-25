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

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }
}
