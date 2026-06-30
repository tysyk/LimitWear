import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import {
  SecondChanceListingDocument,
  SecondChanceListingStatus,
} from './schemas/second-chance-listing.schema';
import { SecondChanceService } from './second-chance.service';

describe('SecondChanceService', () => {
  let service: SecondChanceService;
  let listingModel: {
    create: jest.Mock;
    find: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };

  const dropId = '6674b275c08ff9a9c9a4b001';
  const listingId = '6674b275c08ff9a9c9a4b002';

  beforeEach(() => {
    listingModel = {
      create: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    service = new SecondChanceService(
      listingModel as unknown as Model<SecondChanceListingDocument>,
    );
  });

  it('lists listings sorted newest first', async () => {
    const listings = [{ id: listingId }];
    const exec = jest.fn().mockResolvedValue(listings);
    const lean = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ lean });
    listingModel.find.mockReturnValue({ sort });

    await expect(service.listListings()).resolves.toBe(listings);
    expect(listingModel.find).toHaveBeenCalledWith();
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('creates draft listings with optional source orders', async () => {
    const created = { id: listingId } as SecondChanceListingDocument;
    const sourceOrderId = '6674b275c08ff9a9c9a4b003';
    listingModel.create.mockResolvedValue(created);

    await expect(
      service.createListing({
        dropId,
        sourceOrderId,
        size: 'M',
        quantity: 1,
        price: 2200,
      }),
    ).resolves.toBe(created);

    expect(listingModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dropId: new Types.ObjectId(dropId),
        sourceOrderId: new Types.ObjectId(sourceOrderId),
        size: 'M',
        quantity: 1,
        price: 2200,
        currency: 'UAH',
        status: SecondChanceListingStatus.Draft,
      }),
    );
  });

  it('sets wishlist priority with a required priority window', async () => {
    const updated = { id: listingId, status: SecondChanceListingStatus.WishlistPriority };
    listingModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updated),
    });

    const priorityWindowUntil = '2026-07-01T10:00:00.000Z';
    await expect(service.setPriority(listingId, priorityWindowUntil)).resolves.toBe(updated);

    expect(listingModel.findByIdAndUpdate).toHaveBeenCalledWith(
      new Types.ObjectId(listingId),
      {
        $set: {
          status: SecondChanceListingStatus.WishlistPriority,
          priorityWindowUntil: new Date(priorityWindowUntil),
        },
      },
      { new: true },
    );
  });

  it('makes listings public and defaults public availability to now', async () => {
    const updated = { id: listingId, status: SecondChanceListingStatus.PublicAvailable };
    listingModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updated),
    });

    await expect(service.makePublic(listingId)).resolves.toBe(updated);

    const [, update] = listingModel.findByIdAndUpdate.mock.calls[0] as [
      Types.ObjectId,
      { $set: { status: SecondChanceListingStatus; publicAvailableAt: Date } },
      { new: true },
    ];
    expect(update.$set.status).toBe(SecondChanceListingStatus.PublicAvailable);
    expect(update.$set.publicAvailableAt).toBeInstanceOf(Date);
  });

  it('marks listings sold with soldAt', async () => {
    const updated = { id: listingId, status: SecondChanceListingStatus.Sold };
    listingModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updated),
    });

    await expect(service.markSold(listingId)).resolves.toBe(updated);

    const [, update] = listingModel.findByIdAndUpdate.mock.calls[0] as [
      Types.ObjectId,
      { $set: { status: SecondChanceListingStatus; soldAt: Date } },
      { new: true },
    ];
    expect(update.$set.status).toBe(SecondChanceListingStatus.Sold);
    expect(update.$set.soldAt).toBeInstanceOf(Date);
  });

  it('rejects invalid ids and missing priority dates', async () => {
    await expect(service.makePublic('bad-id')).rejects.toThrow(BadRequestException);
    await expect(service.setPriority(listingId, '')).rejects.toThrow(BadRequestException);
  });

  it('throws when listing is missing', async () => {
    listingModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.cancel(listingId)).rejects.toThrow(NotFoundException);
  });
});
