import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { WishlistItemDocument, WishlistItemStatus } from './schemas/wishlist-item.schema';
import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  let service: WishlistService;
  let wishlistItemModel: {
    find: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let notificationsService: {
    createInterestNotification: jest.Mock;
  };

  const userId = '6674b275c08ff9a9c9a4b000';
  const dropId = '6674b275c08ff9a9c9a4b001';

  beforeEach(() => {
    wishlistItemModel = {
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    notificationsService = {
      createInterestNotification: jest.fn(),
    };
    service = new WishlistService(
      wishlistItemModel as unknown as Model<WishlistItemDocument>,
      notificationsService as never,
    );
  });

  it('lists wishlist items for one user only', async () => {
    const items = [{ dropId }];
    const exec = jest.fn().mockResolvedValue(items);
    const lean = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ lean });
    wishlistItemModel.find.mockReturnValue({ sort });

    await expect(service.listForUser(userId)).resolves.toBe(items);
    expect(wishlistItemModel.find).toHaveBeenCalledWith({
      userId: new Types.ObjectId(userId),
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('upserts an active wishlist item and keeps notification defaults on insert', async () => {
    const item = { id: 'wishlist-id' } as WishlistItemDocument;
    wishlistItemModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(item),
    });

    await expect(service.addForUser(userId, dropId)).resolves.toBe(item);

    expect(wishlistItemModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        userId: new Types.ObjectId(userId),
        dropId: new Types.ObjectId(dropId),
      },
      {
        $set: {
          status: WishlistItemStatus.Active,
        },
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
          dropId: new Types.ObjectId(dropId),
          notifyLowStock: true,
          notifySecondChance: true,
        },
      },
      expect.objectContaining({
        new: true,
        upsert: true,
      }),
    );
  });

  it('closes a wishlist item instead of deleting it', async () => {
    const item = { status: WishlistItemStatus.Closed } as WishlistItemDocument;
    wishlistItemModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(item),
    });

    await expect(service.closeForUser(userId, dropId)).resolves.toBe(item);
    expect(wishlistItemModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        userId: new Types.ObjectId(userId),
        dropId: new Types.ObjectId(dropId),
      },
      {
        $set: {
          status: WishlistItemStatus.Closed,
        },
      },
      {
        new: true,
      },
    );
  });

  it('updates notification flags for one user wishlist item', async () => {
    const item = { notifyLowStock: false } as WishlistItemDocument;
    wishlistItemModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(item),
    });

    await expect(
      service.updateForUser(userId, dropId, {
        notifyLowStock: false,
        notifySecondChance: true,
      }),
    ).resolves.toBe(item);

    expect(wishlistItemModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        userId: new Types.ObjectId(userId),
        dropId: new Types.ObjectId(dropId),
      },
      {
        $set: {
          notifyLowStock: false,
          notifySecondChance: true,
        },
      },
      {
        new: true,
      },
    );
  });

  it('sends low-stock notifications once for active wishlist users', async () => {
    const wishlistItemId = new Types.ObjectId();
    const userObjectId = new Types.ObjectId(userId);
    const dropObjectId = new Types.ObjectId(dropId);
    const candidate = {
      _id: wishlistItemId,
      userId: userObjectId,
      dropId: dropObjectId,
      status: WishlistItemStatus.Active,
      notifyLowStock: true,
    } as WishlistItemDocument;
    wishlistItemModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([candidate]),
    });
    wishlistItemModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...candidate,
        lowStockNotifiedAt: new Date(),
      }),
    });
    notificationsService.createInterestNotification.mockResolvedValue({ id: 'notification-id' });

    await expect(
      service.notifyLowStockForDrop({
        dropId,
        title: 'Angel Skull Hoodie',
        currentQuantity: 16,
        maxQuantity: 20,
      }),
    ).resolves.toEqual({ notifiedCount: 1 });

    expect(wishlistItemModel.find).toHaveBeenCalledWith({
      dropId: dropObjectId,
      status: WishlistItemStatus.Active,
      notifyLowStock: true,
      lowStockNotifiedAt: {
        $exists: false,
      },
    });
    expect(wishlistItemModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: wishlistItemId,
        lowStockNotifiedAt: {
          $exists: false,
        },
      },
      {
        $set: {
          lowStockNotifiedAt: expect.any(Date) as Date,
        },
      },
      {
        new: true,
      },
    );
    expect(notificationsService.createInterestNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: userObjectId,
        type: 'wishlist.low_stock',
        relatedEntityType: 'drop',
        relatedEntityId: dropObjectId,
      }),
    );
  });

  it('skips low-stock notifications above the 20 percent threshold', async () => {
    await expect(
      service.notifyLowStockForDrop({
        dropId,
        title: 'Angel Skull Hoodie',
        currentQuantity: 15,
        maxQuantity: 20,
      }),
    ).resolves.toEqual({ notifiedCount: 0 });

    expect(wishlistItemModel.find).not.toHaveBeenCalled();
    expect(notificationsService.createInterestNotification).not.toHaveBeenCalled();
  });

  it('does not duplicate low-stock notifications when another worker already claimed it', async () => {
    const candidate = {
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(userId),
      dropId: new Types.ObjectId(dropId),
    } as WishlistItemDocument;
    wishlistItemModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([candidate]),
    });
    wishlistItemModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.notifyLowStockForDrop({
        dropId,
        title: 'Angel Skull Hoodie',
        currentQuantity: 16,
        maxQuantity: 20,
      }),
    ).resolves.toEqual({ notifiedCount: 0 });

    expect(notificationsService.createInterestNotification).not.toHaveBeenCalled();
  });

  it('rejects empty update payloads', async () => {
    await expect(service.updateForUser(userId, dropId, {})).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid object ids', async () => {
    await expect(service.addForUser('bad-user-id', dropId)).rejects.toThrow(BadRequestException);
  });

  it('throws when closing a missing wishlist item', async () => {
    wishlistItemModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.closeForUser(userId, dropId)).rejects.toThrow(NotFoundException);
  });
});
