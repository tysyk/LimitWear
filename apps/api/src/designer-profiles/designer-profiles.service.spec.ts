import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { PUBLIC_DROP_STATUSES } from '../drops/drops.service';
import { DropDocument } from '../drops/schemas/drop.schema';
import { DesignerProfilesService } from './designer-profiles.service';
import { DesignerProfileDocument, DesignerProfileStatus } from './schemas/designer-profile.schema';

type QueryMock = {
  sort: jest.Mock;
  lean: jest.Mock;
  exec: jest.Mock;
};

const createQueryMock = <T>(result: T): QueryMock => ({
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

describe('DesignerProfilesService', () => {
  let service: DesignerProfilesService;
  let designerProfileModel: {
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let dropModel: {
    find: jest.Mock;
  };

  beforeEach(() => {
    designerProfileModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    dropModel = {
      find: jest.fn(),
    };
    service = new DesignerProfilesService(
      designerProfileModel as unknown as Model<DesignerProfileDocument>,
      dropModel as unknown as Model<DropDocument>,
    );
  });

  it('lists only active designers sorted for storefront display', async () => {
    const query = createQueryMock([{ slug: 'shtempy' }]);
    designerProfileModel.find.mockReturnValue(query);

    await expect(service.findActiveDesigners()).resolves.toEqual([{ slug: 'shtempy' }]);

    expect(designerProfileModel.find).toHaveBeenCalledWith({
      status: DesignerProfileStatus.Active,
    });
    expect(query.sort).toHaveBeenCalledWith({
      displayName: 1,
      createdAt: -1,
    });
  });

  it('returns an active designer by normalized slug', async () => {
    const query = createQueryMock({ slug: 'shtempy', status: DesignerProfileStatus.Active });
    designerProfileModel.findOne.mockReturnValue(query);

    await expect(service.findActiveDesignerBySlug(' Shtempy ')).resolves.toEqual({
      slug: 'shtempy',
      status: DesignerProfileStatus.Active,
    });

    expect(designerProfileModel.findOne).toHaveBeenCalledWith({
      slug: 'shtempy',
      status: DesignerProfileStatus.Active,
    });
  });

  it('throws when a designer is not active or does not exist', async () => {
    const query = createQueryMock(null);
    designerProfileModel.findOne.mockReturnValue(query);

    await expect(service.findActiveDesignerBySlug('inactive-designer')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lists only public drops from an active designer', async () => {
    const designerQuery = createQueryMock({ _id: 'designer-id', slug: 'shtempy' });
    const dropsQuery = createQueryMock([{ slug: 'angel-skull' }]);
    designerProfileModel.findOne.mockReturnValue(designerQuery);
    dropModel.find.mockReturnValue(dropsQuery);

    await expect(service.findActiveDesignerDrops('shtempy')).resolves.toEqual([
      { slug: 'angel-skull' },
    ]);

    expect(dropModel.find).toHaveBeenCalledWith({
      designerId: 'designer-id',
      status: {
        $in: PUBLIC_DROP_STATUSES,
      },
    });
    expect(dropsQuery.sort).toHaveBeenCalledWith({
      startsAt: -1,
      createdAt: -1,
    });
  });
});
