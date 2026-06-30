import { UserRole, UserStatus } from '@limitwear/shared';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { WishlistItemStatus } from './schemas/wishlist-item.schema';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

describe('WishlistController', () => {
  let controller: WishlistController;
  let wishlistService: jest.Mocked<
    Pick<WishlistService, 'listForUser' | 'addForUser' | 'closeForUser' | 'updateForUser'>
  >;

  const request = {
    user: {
      id: '6674b275c08ff9a9c9a4b000',
      email: 'buyer@limitwear.test',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    wishlistService = {
      listForUser: jest.fn(),
      addForUser: jest.fn(),
      closeForUser: jest.fn(),
      updateForUser: jest.fn(),
    };
    controller = new WishlistController(wishlistService as unknown as WishlistService);
  });

  it('lists wishlist items for the authenticated user', async () => {
    wishlistService.listForUser.mockResolvedValue([{ dropId: 'drop-id' }] as never);

    await expect(controller.list(request)).resolves.toEqual([{ dropId: 'drop-id' }]);
    expect(wishlistService.listForUser).toHaveBeenCalledWith(request.user.id);
  });

  it('adds a drop to the authenticated user wishlist', async () => {
    wishlistService.addForUser.mockResolvedValue({ id: 'wishlist-id' } as never);

    await expect(controller.add(request, '6674b275c08ff9a9c9a4b001')).resolves.toEqual({
      id: 'wishlist-id',
    });
    expect(wishlistService.addForUser).toHaveBeenCalledWith(
      request.user.id,
      '6674b275c08ff9a9c9a4b001',
    );
  });

  it('closes wishlist items without deleting history', async () => {
    wishlistService.closeForUser.mockResolvedValue({ status: WishlistItemStatus.Closed } as never);

    await expect(controller.close(request, '6674b275c08ff9a9c9a4b001')).resolves.toEqual({
      status: WishlistItemStatus.Closed,
    });
    expect(wishlistService.closeForUser).toHaveBeenCalledWith(
      request.user.id,
      '6674b275c08ff9a9c9a4b001',
    );
  });

  it('updates wishlist notification settings for the authenticated user', async () => {
    const dto = { notifyLowStock: false };
    wishlistService.updateForUser.mockResolvedValue(dto as never);

    await expect(controller.updateSettings(request, '6674b275c08ff9a9c9a4b001', dto)).resolves.toBe(
      dto,
    );
    expect(wishlistService.updateForUser).toHaveBeenCalledWith(
      request.user.id,
      '6674b275c08ff9a9c9a4b001',
      dto,
    );
  });
});
