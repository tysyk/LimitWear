import {
  Permission,
  UserRole,
  getDefaultPermissionsForRole,
  hasPermission,
} from '@limitwear/shared';

describe('role permissions', () => {
  const adminPermissions = getDefaultPermissionsForRole(UserRole.Admin);
  const designerPermissions = getDefaultPermissionsForRole(UserRole.Designer);
  const userPermissions = getDefaultPermissionsForRole(UserRole.User);

  it('gives admins MVP admin permissions', () => {
    expect(adminPermissions).toEqual(
      expect.arrayContaining([
        Permission.AdminDeliveryCreateTtn,
        Permission.AdminDesignsReview,
        Permission.AdminDropsLaunch,
        Permission.AdminPayoutsMarkPaid,
        Permission.AdminRequestsManage,
        Permission.AdminUsersRead,
        Permission.WishlistManage,
      ]),
    );
  });

  it('does not give admin permissions to users or designers', () => {
    const adminOnlyPermissions = Object.values(Permission).filter((permission) =>
      permission.startsWith('admin.'),
    );

    for (const permission of adminOnlyPermissions) {
      expect(userPermissions).not.toContain(permission);
      expect(designerPermissions).not.toContain(permission);
    }
  });

  it('gives designers designer tools without admin controls', () => {
    expect(designerPermissions).toEqual(
      expect.arrayContaining([
        Permission.DesignerDesignsCreate,
        Permission.DesignerDesignsSubmit,
        Permission.DesignerPayoutsRead,
      ]),
    );
    expect(designerPermissions).not.toContain(Permission.AdminDropsLaunch);
    expect(designerPermissions).not.toContain(Permission.AdminDesignsReview);
  });

  it('supports explicit extra permissions without changing role defaults', () => {
    expect(hasPermission(UserRole.User, Permission.AdminUsersRead)).toBe(false);
    expect(
      hasPermission(UserRole.User, Permission.AdminUsersRead, [Permission.AdminUsersRead]),
    ).toBe(true);
    expect(getDefaultPermissionsForRole(UserRole.User)).not.toContain(Permission.AdminUsersRead);
  });
});
