import { UserRole, UserStatus } from '@limitwear/shared';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { DesignsService } from '../designs/designs.service';
import { DesignStatus } from '../designs/schemas/design.schema';
import { AdminDesignsController } from './admin-designs.controller';

describe('AdminDesignsController', () => {
  let controller: AdminDesignsController;
  let designsService: jest.Mocked<Pick<DesignsService, 'findAdminDesigns' | 'reviewDesign'>>;

  const request = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'jest',
    },
    user: {
      id: 'admin-id',
      email: 'admin@example.com',
      role: UserRole.Admin,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: false,
      isPhoneVerified: false,
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    designsService = {
      findAdminDesigns: jest.fn(),
      reviewDesign: jest.fn(),
    };
    controller = new AdminDesignsController(designsService as unknown as DesignsService);
  });

  it('delegates admin design listing to the designs service', async () => {
    designsService.findAdminDesigns.mockResolvedValue([]);

    await expect(controller.findDesigns()).resolves.toEqual([]);
    expect(designsService.findAdminDesigns).toHaveBeenCalled();
  });

  it('delegates design review to the designs service with request context', async () => {
    designsService.reviewDesign.mockResolvedValue({ id: 'design-id' } as never);

    await expect(
      controller.reviewDesign(
        'design-id',
        {
          status: DesignStatus.Approved,
        },
        request,
      ),
    ).resolves.toEqual({ id: 'design-id' });
    expect(designsService.reviewDesign).toHaveBeenCalledWith(
      request.user,
      'design-id',
      {
        status: DesignStatus.Approved,
      },
      {
        ip: '127.0.0.1',
        userAgent: 'jest',
      },
    );
  });
});
