import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { DesignsService } from './designs.service';
import { DesignDocument, DesignStatus } from './schemas/design.schema';

type QueryMock = {
  sort: jest.Mock;
  lean: jest.Mock;
  exec: jest.Mock;
};

const createFindQuery = <T>(result: T): QueryMock => ({
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

const createExecQuery = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
});

describe('DesignsService', () => {
  let service: DesignsService;
  let designModel: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
  };

  const userId = new Types.ObjectId().toHexString();
  const user = {
    id: userId,
    email: 'designer@example.com',
    role: UserRole.Designer,
    permissions: [],
    status: UserStatus.Active,
    isEmailVerified: false,
    isPhoneVerified: false,
  };

  beforeEach(() => {
    designModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };
    service = new DesignsService(designModel as unknown as Model<DesignDocument>);
  });

  it('lists only designs owned by the current user', async () => {
    const query = createFindQuery([{ title: 'Owned design' }]);
    designModel.find.mockReturnValue(query);

    await expect(service.findDesignerDesigns(user)).resolves.toEqual([{ title: 'Owned design' }]);

    expect(designModel.find).toHaveBeenCalledWith({
      createdByUserId: new Types.ObjectId(userId),
    });
    expect(query.sort).toHaveBeenCalledWith({
      createdAt: -1,
    });
  });

  it('creates a draft design owned by the current user', async () => {
    const createdDesign = {
      title: 'Panther Hoodie',
      status: DesignStatus.Draft,
    };
    designModel.create.mockResolvedValue(createdDesign);

    await expect(
      service.createDesignerDesign(user, {
        title: ' Panther Hoodie ',
        slug: ' Panther-Hoodie ',
        tags: [' hoodie ', ' '],
      }),
    ).resolves.toBe(createdDesign);

    expect(designModel.create).toHaveBeenCalledWith({
      title: 'Panther Hoodie',
      slug: 'panther-hoodie',
      tags: ['hoodie'],
      createdByUserId: new Types.ObjectId(userId),
      status: DesignStatus.Draft,
    });
  });

  it('updates only an owned design', async () => {
    const design = {
      createdByUserId: new Types.ObjectId(userId),
      title: 'Old title',
      save: jest.fn().mockResolvedValue({
        title: 'New title',
      }),
    };
    const designId = new Types.ObjectId().toHexString();
    designModel.findById.mockReturnValue(createExecQuery(design));

    await expect(
      service.updateDesignerDesign(user, designId, {
        title: ' New title ',
      }),
    ).resolves.toEqual({
      title: 'New title',
    });

    expect(design.title).toBe('New title');
    expect(design.save).toHaveBeenCalled();
  });

  it('rejects updates for designs owned by another user', async () => {
    const design = {
      createdByUserId: new Types.ObjectId(),
      save: jest.fn(),
    };
    designModel.findById.mockReturnValue(createExecQuery(design));

    await expect(
      service.updateDesignerDesign(user, new Types.ObjectId().toHexString(), {
        title: 'Stolen title',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(design.save).not.toHaveBeenCalled();
  });

  it('submits an owned draft design for review', async () => {
    const design = {
      createdByUserId: new Types.ObjectId(userId),
      status: DesignStatus.Draft,
      submittedAt: undefined as Date | undefined,
      save: jest.fn().mockImplementation(function (this: { status: DesignStatus }) {
        return Promise.resolve(this);
      }),
    };
    designModel.findById.mockReturnValue(createExecQuery(design));

    await expect(
      service.submitDesignerDesign(user, new Types.ObjectId().toHexString()),
    ).resolves.toMatchObject({
      status: DesignStatus.Submitted,
    });

    expect(design.submittedAt).toBeInstanceOf(Date);
    expect(design.save).toHaveBeenCalled();
  });

  it('resubmits an owned needs changes design', async () => {
    const design = {
      createdByUserId: new Types.ObjectId(userId),
      status: DesignStatus.NeedsChanges,
      save: jest.fn().mockImplementation(function (this: { status: DesignStatus }) {
        return Promise.resolve(this);
      }),
    };
    designModel.findById.mockReturnValue(createExecQuery(design));

    await expect(
      service.submitDesignerDesign(user, new Types.ObjectId().toHexString()),
    ).resolves.toMatchObject({
      status: DesignStatus.Resubmitted,
    });
  });

  it('rejects submitted designs that are not editable for submission', async () => {
    const design = {
      createdByUserId: new Types.ObjectId(userId),
      status: DesignStatus.Submitted,
      save: jest.fn(),
    };
    designModel.findById.mockReturnValue(createExecQuery(design));

    await expect(
      service.submitDesignerDesign(user, new Types.ObjectId().toHexString()),
    ).rejects.toThrow(BadRequestException);
    expect(design.save).not.toHaveBeenCalled();
  });
});
