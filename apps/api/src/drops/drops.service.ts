import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DropStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { Drop, DropDocument } from './schemas/drop.schema';

export const PUBLIC_DROP_STATUSES = [
  DropStatus.Active,
  DropStatus.ActiveCollecting,
  DropStatus.Guaranteed,
  DropStatus.SoldOut,
  DropStatus.Successful,
  DropStatus.InProduction,
  DropStatus.ReadyToShip,
  DropStatus.Shipped,
  DropStatus.Delivered,
  DropStatus.Completed,
  DropStatus.SecondChanceWindow,
  DropStatus.ForeverClosed,
] as const;

type DropWithId = Drop & {
  _id?: Types.ObjectId;
};

@Injectable()
export class DropsService {
  constructor(@InjectModel(Drop.name) private readonly dropModel: Model<DropDocument>) {}

  async findPublicDrops(): Promise<Drop[]> {
    return this.dropModel
      .find({
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

  async findPublicDropBySlug(slug: string): Promise<Drop> {
    const drop = await this.dropModel
      .findOne({
        slug: this.normalizeSlug(slug),
        status: {
          $in: PUBLIC_DROP_STATUSES,
        },
      })
      .lean<Drop>()
      .exec();

    if (!drop) {
      throw new NotFoundException('Drop was not found');
    }

    return drop;
  }

  async findRelatedPublicDrops(slug: string): Promise<Drop[]> {
    const drop = (await this.findPublicDropBySlug(slug)) as DropWithId;
    const relatedConditions: Array<
      { collectionId: Types.ObjectId } | { designerId: Types.ObjectId }
    > = [];

    if (drop.collectionId) {
      relatedConditions.push({
        collectionId: drop.collectionId,
      });
    }

    if (drop.designerId) {
      relatedConditions.push({
        designerId: drop.designerId,
      });
    }

    if (relatedConditions.length === 0) {
      return [];
    }

    return this.dropModel
      .find({
        _id: {
          $ne: drop._id,
        },
        status: {
          $in: PUBLIC_DROP_STATUSES,
        },
        $or: relatedConditions,
      })
      .sort({
        startsAt: -1,
        createdAt: -1,
      })
      .limit(8)
      .lean<Drop[]>()
      .exec();
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }
}
