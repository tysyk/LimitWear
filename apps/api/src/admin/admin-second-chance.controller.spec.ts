import { AdminSecondChanceController } from './admin-second-chance.controller';
import { SecondChanceListingStatus } from '../second-chance/schemas/second-chance-listing.schema';
import { SecondChanceService } from '../second-chance/second-chance.service';

describe('AdminSecondChanceController', () => {
  let controller: AdminSecondChanceController;
  let secondChanceService: jest.Mocked<
    Pick<
      SecondChanceService,
      | 'listListings'
      | 'createListing'
      | 'setPriority'
      | 'makePublic'
      | 'markSold'
      | 'expire'
      | 'cancel'
    >
  >;

  beforeEach(() => {
    secondChanceService = {
      listListings: jest.fn(),
      createListing: jest.fn(),
      setPriority: jest.fn(),
      makePublic: jest.fn(),
      markSold: jest.fn(),
      expire: jest.fn(),
      cancel: jest.fn(),
    };
    controller = new AdminSecondChanceController(
      secondChanceService as unknown as SecondChanceService,
    );
  });

  it('lists second chance listings', async () => {
    secondChanceService.listListings.mockResolvedValue([
      { status: SecondChanceListingStatus.Draft },
    ] as never);

    await expect(controller.list()).resolves.toEqual([{ status: SecondChanceListingStatus.Draft }]);
  });

  it('creates second chance listings', async () => {
    const dto = {
      dropId: '6674b275c08ff9a9c9a4b001',
      size: 'M',
      quantity: 1,
      price: 2200,
    };
    secondChanceService.createListing.mockResolvedValue({ id: 'listing-id' } as never);

    await expect(controller.create(dto)).resolves.toEqual({ id: 'listing-id' });
    expect(secondChanceService.createListing).toHaveBeenCalledWith(dto);
  });

  it('delegates listing lifecycle actions', async () => {
    secondChanceService.setPriority.mockResolvedValue({
      status: SecondChanceListingStatus.WishlistPriority,
    } as never);
    secondChanceService.makePublic.mockResolvedValue({
      status: SecondChanceListingStatus.PublicAvailable,
    } as never);
    secondChanceService.markSold.mockResolvedValue({
      status: SecondChanceListingStatus.Sold,
    } as never);
    secondChanceService.expire.mockResolvedValue({
      status: SecondChanceListingStatus.Expired,
    } as never);
    secondChanceService.cancel.mockResolvedValue({
      status: SecondChanceListingStatus.Cancelled,
    } as never);

    await controller.setPriority('listing-id', '2026-07-01T10:00:00.000Z');
    await controller.makePublic('listing-id');
    await controller.markSold('listing-id');
    await controller.expire('listing-id');
    await controller.cancel('listing-id');

    expect(secondChanceService.setPriority).toHaveBeenCalledWith(
      'listing-id',
      '2026-07-01T10:00:00.000Z',
    );
    expect(secondChanceService.makePublic).toHaveBeenCalledWith('listing-id', undefined);
    expect(secondChanceService.markSold).toHaveBeenCalledWith('listing-id');
    expect(secondChanceService.expire).toHaveBeenCalledWith('listing-id');
    expect(secondChanceService.cancel).toHaveBeenCalledWith('listing-id');
  });
});
