import { RequestStatus, UserRole, UserStatus } from '@limitwear/shared';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { RequestsService } from '../requests/requests.service';
import { AdminRequestsController } from './admin-requests.controller';

describe('AdminRequestsController', () => {
  let controller: AdminRequestsController;
  let requestsService: jest.Mocked<Pick<RequestsService, 'reviewDesignerApplication'>>;

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
    requestsService = {
      reviewDesignerApplication: jest.fn(),
    };
    controller = new AdminRequestsController(requestsService as unknown as RequestsService);
  });

  it('delegates designer application review to the requests service with request context', async () => {
    requestsService.reviewDesignerApplication.mockResolvedValue({ id: 'request-id' } as never);

    await expect(
      controller.reviewDesignerApplication(
        'request-id',
        {
          status: RequestStatus.Approved,
        },
        request,
      ),
    ).resolves.toEqual({ id: 'request-id' });
    expect(requestsService.reviewDesignerApplication).toHaveBeenCalledWith(
      request.user,
      'request-id',
      {
        status: RequestStatus.Approved,
      },
      {
        ip: '127.0.0.1',
        userAgent: 'jest',
      },
    );
  });
});
