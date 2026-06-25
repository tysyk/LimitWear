import { DropsController } from './drops.controller';
import { DropsService } from './drops.service';

describe('DropsController', () => {
  let controller: DropsController;
  let dropsService: jest.Mocked<
    Pick<DropsService, 'findPublicDrops' | 'findPublicDropBySlug' | 'findRelatedPublicDrops'>
  >;

  beforeEach(() => {
    dropsService = {
      findPublicDrops: jest.fn(),
      findPublicDropBySlug: jest.fn(),
      findRelatedPublicDrops: jest.fn(),
    };
    controller = new DropsController(dropsService as unknown as DropsService);
  });

  it('delegates public drop listing to the service', async () => {
    dropsService.findPublicDrops.mockResolvedValue([]);

    await expect(controller.findPublicDrops()).resolves.toEqual([]);
    expect(dropsService.findPublicDrops).toHaveBeenCalled();
  });

  it('delegates public drop details to the service', async () => {
    dropsService.findPublicDropBySlug.mockResolvedValue({ slug: 'angel-skull' } as never);

    await expect(controller.findPublicDropBySlug('angel-skull')).resolves.toEqual({
      slug: 'angel-skull',
    });
    expect(dropsService.findPublicDropBySlug).toHaveBeenCalledWith('angel-skull');
  });

  it('delegates related drop listing to the service', async () => {
    dropsService.findRelatedPublicDrops.mockResolvedValue([]);

    await expect(controller.findRelatedPublicDrops('angel-skull')).resolves.toEqual([]);
    expect(dropsService.findRelatedPublicDrops).toHaveBeenCalledWith('angel-skull');
  });
});
