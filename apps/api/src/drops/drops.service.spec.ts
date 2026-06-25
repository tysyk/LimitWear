import { NotFoundException } from '@nestjs/common';
import { DropStatus } from '@limitwear/shared';
import { Model } from 'mongoose';
import { DropsService, PUBLIC_DROP_STATUSES } from './drops.service';
import { DropDocument } from './schemas/drop.schema';

type QueryMock = {
  sort: jest.Mock;
  limit: jest.Mock;
  lean: jest.Mock;
  exec: jest.Mock;
};

const createQueryMock = <T>(result: T): QueryMock => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

describe('DropsService', () => {
  let service: DropsService;
  let dropModel: {
    find: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(() => {
    dropModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    service = new DropsService(dropModel as unknown as Model<DropDocument>);
  });

  it('lists only public drops sorted for storefront display', async () => {
    const query = createQueryMock([{ slug: 'angel-skull' }]);
    dropModel.find.mockReturnValue(query);

    await expect(service.findPublicDrops()).resolves.toEqual([{ slug: 'angel-skull' }]);

    expect(dropModel.find).toHaveBeenCalledWith({
      status: {
        $in: PUBLIC_DROP_STATUSES,
      },
    });
    expect(query.sort).toHaveBeenCalledWith({
      startsAt: -1,
      createdAt: -1,
    });
  });

  it('returns a public drop by normalized slug', async () => {
    const query = createQueryMock({ slug: 'angel-skull', status: DropStatus.ActiveCollecting });
    dropModel.findOne.mockReturnValue(query);

    await expect(service.findPublicDropBySlug(' Angel-Skull ')).resolves.toEqual({
      slug: 'angel-skull',
      status: DropStatus.ActiveCollecting,
    });

    expect(dropModel.findOne).toHaveBeenCalledWith({
      slug: 'angel-skull',
      status: {
        $in: PUBLIC_DROP_STATUSES,
      },
    });
  });

  it('throws when a drop is not public or does not exist', async () => {
    const query = createQueryMock(null);
    dropModel.findOne.mockReturnValue(query);

    await expect(service.findPublicDropBySlug('draft-drop')).rejects.toThrow(NotFoundException);
  });

  it('lists related drops by collection or designer and excludes the current drop', async () => {
    const currentDropQuery = createQueryMock({
      _id: 'drop-id',
      slug: 'angel-skull',
      collectionId: 'collection-id',
      designerId: 'designer-id',
    });
    const relatedDropsQuery = createQueryMock([{ slug: 'related-drop' }]);
    dropModel.findOne.mockReturnValue(currentDropQuery);
    dropModel.find.mockReturnValue(relatedDropsQuery);

    await expect(service.findRelatedPublicDrops('angel-skull')).resolves.toEqual([
      { slug: 'related-drop' },
    ]);

    expect(dropModel.find).toHaveBeenCalledWith({
      _id: {
        $ne: 'drop-id',
      },
      status: {
        $in: PUBLIC_DROP_STATUSES,
      },
      $or: [
        {
          collectionId: 'collection-id',
        },
        {
          designerId: 'designer-id',
        },
      ],
    });
    expect(relatedDropsQuery.limit).toHaveBeenCalledWith(8);
  });

  it('returns an empty related list when a drop has no relation anchors', async () => {
    const currentDropQuery = createQueryMock({
      _id: 'drop-id',
      slug: 'standalone',
    });
    dropModel.findOne.mockReturnValue(currentDropQuery);

    await expect(service.findRelatedPublicDrops('standalone')).resolves.toEqual([]);
    expect(dropModel.find).not.toHaveBeenCalled();
  });
});
