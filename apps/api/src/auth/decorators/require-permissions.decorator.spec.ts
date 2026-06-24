import { Reflector } from '@nestjs/core';
import { Permission } from '@limitwear/shared';
import { REQUIRED_PERMISSIONS_KEY, RequirePermissions } from './require-permissions.decorator';

describe('RequirePermissions', () => {
  it('stores required permissions as route metadata', () => {
    const handler = () => undefined;
    RequirePermissions(Permission.AdminUsersRead, Permission.AdminUsersUpdate)({}, 'handler', {
      value: handler,
    } as PropertyDescriptor);

    const reflector = new Reflector();
    const metadata = reflector.get<Permission[]>(REQUIRED_PERMISSIONS_KEY, handler);

    expect(metadata).toEqual([Permission.AdminUsersRead, Permission.AdminUsersUpdate]);
  });
});
