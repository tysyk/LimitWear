import { DesignerProfilesService } from './designer-profiles.service';
import { DesignersController } from './designers.controller';

describe('DesignersController', () => {
  let controller: DesignersController;
  let designerProfilesService: jest.Mocked<
    Pick<
      DesignerProfilesService,
      'findActiveDesigners' | 'findActiveDesignerBySlug' | 'findActiveDesignerDrops'
    >
  >;

  beforeEach(() => {
    designerProfilesService = {
      findActiveDesigners: jest.fn(),
      findActiveDesignerBySlug: jest.fn(),
      findActiveDesignerDrops: jest.fn(),
    };
    controller = new DesignersController(
      designerProfilesService as unknown as DesignerProfilesService,
    );
  });

  it('delegates designer listing to the service', async () => {
    designerProfilesService.findActiveDesigners.mockResolvedValue([]);

    await expect(controller.findActiveDesigners()).resolves.toEqual([]);
    expect(designerProfilesService.findActiveDesigners).toHaveBeenCalled();
  });

  it('delegates designer details to the service', async () => {
    designerProfilesService.findActiveDesignerBySlug.mockResolvedValue({
      slug: 'shtempy',
    } as never);

    await expect(controller.findActiveDesignerBySlug('shtempy')).resolves.toEqual({
      slug: 'shtempy',
    });
    expect(designerProfilesService.findActiveDesignerBySlug).toHaveBeenCalledWith('shtempy');
  });

  it('delegates designer drops to the service', async () => {
    designerProfilesService.findActiveDesignerDrops.mockResolvedValue([]);

    await expect(controller.findActiveDesignerDrops('shtempy')).resolves.toEqual([]);
    expect(designerProfilesService.findActiveDesignerDrops).toHaveBeenCalledWith('shtempy');
  });
});
