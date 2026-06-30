import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import {
  UpdateWishlistItemDto,
  validateUpdateWishlistItemDto,
} from './dto/update-wishlist-item.dto';
import {
  WishlistItem,
  WishlistItemDocument,
  WishlistItemStatus,
} from './schemas/wishlist-item.schema';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(WishlistItem.name)
    private readonly wishlistItemModel: Model<WishlistItemDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listForUser(userId: string): Promise<WishlistItem[]> {
    return this.wishlistItemModel
      .find({ userId: this.toObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean<WishlistItem[]>()
      .exec();
  }

  async addForUser(userId: string, dropId: string): Promise<WishlistItemDocument> {
    const normalizedUserId = this.toObjectId(userId);
    const normalizedDropId = this.toObjectId(dropId);

    return this.wishlistItemModel
      .findOneAndUpdate(
        {
          userId: normalizedUserId,
          dropId: normalizedDropId,
        },
        {
          $set: {
            status: WishlistItemStatus.Active,
          },
          $setOnInsert: {
            userId: normalizedUserId,
            dropId: normalizedDropId,
            notifyLowStock: true,
            notifySecondChance: true,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();
  }

  async closeForUser(userId: string, dropId: string): Promise<WishlistItemDocument> {
    const item = await this.wishlistItemModel
      .findOneAndUpdate(
        {
          userId: this.toObjectId(userId),
          dropId: this.toObjectId(dropId),
        },
        {
          $set: {
            status: WishlistItemStatus.Closed,
          },
        },
        {
          new: true,
        },
      )
      .exec();

    if (!item) {
      throw new NotFoundException('Wishlist item was not found.');
    }

    return item;
  }

  async updateForUser(
    userId: string,
    dropId: string,
    dto: UpdateWishlistItemDto,
  ): Promise<WishlistItemDocument> {
    const input = validateUpdateWishlistItemDto(dto);
    const update = this.toWishlistUpdate(input);

    if (Object.keys(update).length === 0) {
      throw new BadRequestException('Wishlist update payload is empty.');
    }

    const item = await this.wishlistItemModel
      .findOneAndUpdate(
        {
          userId: this.toObjectId(userId),
          dropId: this.toObjectId(dropId),
        },
        {
          $set: update,
        },
        {
          new: true,
        },
      )
      .exec();

    if (!item) {
      throw new NotFoundException('Wishlist item was not found.');
    }

    return item;
  }

  async notifyLowStockForDrop(input: {
    dropId: Types.ObjectId | string;
    title: string;
    currentQuantity: number;
    maxQuantity: number;
  }): Promise<{ notifiedCount: number }> {
    if (!this.isLowStock(input)) {
      return { notifiedCount: 0 };
    }

    const dropId = this.toObjectId(input.dropId.toString());
    const candidates = await this.wishlistItemModel
      .find({
        dropId,
        status: WishlistItemStatus.Active,
        notifyLowStock: true,
        lowStockNotifiedAt: {
          $exists: false,
        },
      })
      .exec();

    let notifiedCount = 0;

    for (const candidate of candidates) {
      const claimed = await this.wishlistItemModel
        .findOneAndUpdate(
          {
            _id: candidate._id,
            lowStockNotifiedAt: {
              $exists: false,
            },
          },
          {
            $set: {
              lowStockNotifiedAt: new Date(),
            },
          },
          {
            new: true,
          },
        )
        .exec();

      if (!claimed) {
        continue;
      }

      await this.notificationsService.createInterestNotification({
        userId: candidate.userId,
        type: 'wishlist.low_stock',
        title: 'Wishlist drop is almost sold out',
        message: `${input.title} has 20% or less available quantity left.`,
        relatedEntityType: 'drop',
        relatedEntityId: dropId,
        metadata: {
          dropId: dropId.toHexString(),
          currentQuantity: input.currentQuantity,
          maxQuantity: input.maxQuantity,
          remainingQuantity: input.maxQuantity - input.currentQuantity,
        },
      });

      notifiedCount += 1;
    }

    return { notifiedCount };
  }

  private toWishlistUpdate(input: UpdateWishlistItemDto): Partial<WishlistItem> {
    const update: Partial<WishlistItem> = {};

    if (input.status !== undefined) {
      update.status = input.status;
    }
    if (input.notifyLowStock !== undefined) {
      update.notifyLowStock = input.notifyLowStock;
    }
    if (input.notifySecondChance !== undefined) {
      update.notifySecondChance = input.notifySecondChance;
    }

    return update;
  }

  private isLowStock(input: { currentQuantity: number; maxQuantity: number }): boolean {
    if (input.maxQuantity <= 0) {
      return false;
    }

    return input.maxQuantity - input.currentQuantity <= input.maxQuantity * 0.2;
  }

  private toObjectId(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('ObjectId is invalid.');
    }

    return new Types.ObjectId(value);
  }
}
