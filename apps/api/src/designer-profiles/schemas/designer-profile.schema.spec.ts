import {
  DesignerProfile,
  DesignerProfileSchema,
  DesignerProfileStatus,
  PayoutMethodStatus,
} from './designer-profile.schema';

describe('DesignerProfileSchema', () => {
  it('uses the designer_profiles collection with timestamps', () => {
    expect(DesignerProfileSchema.get('collection')).toBe('designer_profiles');
    expect(DesignerProfileSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline designer profile fields and defaults', () => {
    expect(DesignerProfileSchema.path('userId').options.required).toBe(true);
    expect(DesignerProfileSchema.path('userId').options.unique).toBe(true);
    expect(DesignerProfileSchema.path('displayName').options.required).toBe(true);
    expect(DesignerProfileSchema.path('slug').options.unique).toBe(true);
    expect(DesignerProfileSchema.path('slug').options.lowercase).toBe(true);
    expect(DesignerProfileSchema.path('bio')).toBeDefined();
    expect(DesignerProfileSchema.path('avatarFileId')).toBeDefined();
    expect(DesignerProfileSchema.path('coverFileId')).toBeDefined();
    expect(DesignerProfileSchema.path('socialLinks').options.default).toEqual({});
    expect(DesignerProfileSchema.path('portfolioLinks').options.default).toEqual([]);
    expect(DesignerProfileSchema.path('status').options.enum).toEqual(
      Object.values(DesignerProfileStatus),
    );
    expect(DesignerProfileSchema.path('status').options.default).toBe(
      DesignerProfileStatus.Pending,
    );
    expect(DesignerProfileSchema.path('approvedAt')).toBeDefined();
    expect(DesignerProfileSchema.path('approvedBy')).toBeDefined();
    expect(DesignerProfileSchema.path('payoutMethodStatus').options.enum).toEqual(
      Object.values(PayoutMethodStatus),
    );
    expect(DesignerProfileSchema.path('payoutMethodStatus').options.default).toBe(
      PayoutMethodStatus.NotProvided,
    );
    expect(DesignerProfileSchema.path('payoutDetails').options.select).toBe(false);
  });

  it('indexes public designer profile queries', () => {
    expect(DesignerProfileSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ slug: 1 }, expect.objectContaining({ unique: true })],
        [{ userId: 1 }, expect.objectContaining({ unique: true })],
        [{ status: 1 }, expect.any(Object)],
      ]),
    );
  });

  it('strips payoutDetails and __v from serialized designer profiles', () => {
    type SchemaTransform = (
      doc: unknown,
      ret: Record<string, unknown>,
      options: Record<string, unknown>,
    ) => Record<string, unknown>;

    const transform: unknown = DesignerProfileSchema.get('toJSON')?.transform;

    if (typeof transform !== 'function') {
      throw new Error('Expected DesignerProfileSchema toJSON transform to be a function');
    }

    const serialized = (transform as SchemaTransform)(
      {},
      {
        displayName: 'Shtempy',
        payoutDetails: {
          iban: 'secret',
        },
        __v: 0,
      },
      {},
    );

    expect(serialized).toEqual({
      displayName: 'Shtempy',
    });
  });

  it('exposes the DesignerProfile class for Mongoose registration', () => {
    expect(DesignerProfile.name).toBe('DesignerProfile');
  });
});
