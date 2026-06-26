import { UserRole, UserStatus } from '@limitwear/shared';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

describe('FilesController', () => {
  it('returns the URL resolved for the current user', async () => {
    const filesService = {
      getPrivateUrlForUser: jest.fn().mockResolvedValue('https://storage.example/signed-url'),
    };
    const controller = new FilesController(filesService as unknown as FilesService);
    const request = {
      user: {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.Designer,
        permissions: [],
        status: UserStatus.Active,
        isEmailVerified: false,
        isPhoneVerified: false,
      },
    } as unknown as AuthenticatedRequest;

    await expect(controller.getAccessUrl('file-id', request)).resolves.toEqual({
      url: 'https://storage.example/signed-url',
    });
    expect(filesService.getPrivateUrlForUser).toHaveBeenCalledWith(request.user, 'file-id');
  });
});
