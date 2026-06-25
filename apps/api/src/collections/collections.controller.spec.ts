import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';

describe('CollectionsController', () => {
  let controller: CollectionsController;
  let collectionsService: jest.Mocked<
    Pick<
      CollectionsService,
      'findPublishedCollections' | 'findPublishedCollectionBySlug' | 'findPublishedCollectionDrops'
    >
  >;

  beforeEach(() => {
    collectionsService = {
      findPublishedCollections: jest.fn(),
      findPublishedCollectionBySlug: jest.fn(),
      findPublishedCollectionDrops: jest.fn(),
    };
    controller = new CollectionsController(collectionsService as unknown as CollectionsService);
  });

  it('delegates collection listing to the service', async () => {
    collectionsService.findPublishedCollections.mockResolvedValue([]);

    await expect(controller.findPublishedCollections()).resolves.toEqual([]);
    expect(collectionsService.findPublishedCollections).toHaveBeenCalled();
  });

  it('delegates collection details to the service', async () => {
    collectionsService.findPublishedCollectionBySlug.mockResolvedValue({
      slug: 'summer-drop',
    } as never);

    await expect(controller.findPublishedCollectionBySlug('summer-drop')).resolves.toEqual({
      slug: 'summer-drop',
    });
    expect(collectionsService.findPublishedCollectionBySlug).toHaveBeenCalledWith('summer-drop');
  });

  it('delegates collection drops to the service', async () => {
    collectionsService.findPublishedCollectionDrops.mockResolvedValue([]);

    await expect(controller.findPublishedCollectionDrops('summer-drop')).resolves.toEqual([]);
    expect(collectionsService.findPublishedCollectionDrops).toHaveBeenCalledWith('summer-drop');
  });
});
