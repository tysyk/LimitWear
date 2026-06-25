import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { PUBLIC_DROP_STATUSES } from '../drops/drops.service';
import { DropDocument } from '../drops/schemas/drop.schema';
import { CollectionsService } from './collections.service';
import { CollectionDocument, CollectionStatus } from './schemas/collection.schema';

type QueryMock = {
  sort: jest.Mock;
  lean: jest.Mock;
  exec: jest.Mock;
};

const createQueryMock = <T>(result: T): QueryMock => ({
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

describe('CollectionsService', () => {
  let service: CollectionsService;
  let collectionModel: {
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let dropModel: {
    find: jest.Mock;
  };

  beforeEach(() => {
    collectionModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    dropModel = {
      find: jest.fn(),
    };
    service = new CollectionsService(
      collectionModel as unknown as Model<CollectionDocument>,
      dropModel as unknown as Model<DropDocument>,
    );
  });

  it('lists only published collections sorted for storefront display', async () => {
    const query = createQueryMock([{ slug: 'summer-drop' }]);
    collectionModel.find.mockReturnValue(query);

    await expect(service.findPublishedCollections()).resolves.toEqual([{ slug: 'summer-drop' }]);

    expect(collectionModel.find).toHaveBeenCalledWith({
      status: CollectionStatus.Published,
    });
    expect(query.sort).toHaveBeenCalledWith({
      featured: -1,
      publishedAt: -1,
      createdAt: -1,
    });
  });

  it('returns a published collection by normalized slug', async () => {
    const query = createQueryMock({ slug: 'summer-drop', status: CollectionStatus.Published });
    collectionModel.findOne.mockReturnValue(query);

    await expect(service.findPublishedCollectionBySlug(' Summer-Drop ')).resolves.toEqual({
      slug: 'summer-drop',
      status: CollectionStatus.Published,
    });

    expect(collectionModel.findOne).toHaveBeenCalledWith({
      slug: 'summer-drop',
      status: CollectionStatus.Published,
    });
  });

  it('throws when a collection is not published or does not exist', async () => {
    const query = createQueryMock(null);
    collectionModel.findOne.mockReturnValue(query);

    await expect(service.findPublishedCollectionBySlug('draft-collection')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lists only public drops from a published collection', async () => {
    const collectionQuery = createQueryMock({ _id: 'collection-id', slug: 'summer-drop' });
    const dropsQuery = createQueryMock([{ slug: 'angel-skull' }]);
    collectionModel.findOne.mockReturnValue(collectionQuery);
    dropModel.find.mockReturnValue(dropsQuery);

    await expect(service.findPublishedCollectionDrops('summer-drop')).resolves.toEqual([
      { slug: 'angel-skull' },
    ]);

    expect(dropModel.find).toHaveBeenCalledWith({
      collectionId: 'collection-id',
      status: {
        $in: PUBLIC_DROP_STATUSES,
      },
    });
    expect(dropsQuery.sort).toHaveBeenCalledWith({
      startsAt: -1,
      createdAt: -1,
    });
  });
});
