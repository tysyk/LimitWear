import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationCategory, UserRole, UserStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
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
  let auditService: jest.Mocked<Pick<AuditService, 'recordAdminAction'>>;
  let notificationsService: jest.Mocked<Pick<NotificationsService, 'createForUser'>>;

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
  const admin = {
    ...user,
    id: new Types.ObjectId().toHexString(),
    email: 'admin@example.com',
    role: UserRole.Admin,
  };

  beforeEach(() => {
    designModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };
    auditService = {
      recordAdminAction: jest.fn(),
    };
    notificationsService = {
      createForUser: jest.fn(),
    };
    service = new DesignsService(
      designModel as unknown as Model<DesignDocument>,
      auditService as unknown as AuditService,
      notificationsService as unknown as NotificationsService,
    );
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

  it('approves a design with audit and notification records', async () => {
    const designId = new Types.ObjectId();
    const ownerId = new Types.ObjectId(userId);
    const design = {
      _id: designId,
      createdByUserId: ownerId,
      title: 'Panther Hoodie',
      status: DesignStatus.Submitted,
      approvedAt: undefined as Date | undefined,
      approvedBy: undefined as Types.ObjectId | undefined,
      save: jest.fn().mockImplementation(function (this: { status: DesignStatus }) {
        return Promise.resolve(this);
      }),
    };
    designModel.findById.mockReturnValue(createExecQuery(design));

    await expect(
      service.reviewDesign(admin, designId.toHexString(), {
        status: DesignStatus.Approved,
      }),
    ).resolves.toMatchObject({
      status: DesignStatus.Approved,
    });

    expect(design.approvedAt).toBeInstanceOf(Date);
    expect(design.approvedBy).toEqual(new Types.ObjectId(admin.id));
    expect(auditService.recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: admin.id,
        email: admin.email,
      }),
      expect.objectContaining({
        action: 'design.approved',
        entity: {
          type: 'design',
          id: designId.toHexString(),
        },
        old: {
          status: DesignStatus.Submitted,
        },
        new: {
          status: DesignStatus.Approved,
          adminComment: undefined,
          rejectionReason: undefined,
        },
      }),
    );
    expect(notificationsService.createForUser).toHaveBeenCalledWith({
      userId: ownerId,
      category: NotificationCategory.Design,
      title: 'Design approved',
      message: 'Your design "Panther Hoodie" was approved.',
      relatedEntityType: 'design',
      relatedEntityId: designId.toHexString(),
      metadata: {
        status: DesignStatus.Approved,
      },
    });
  });

  it('requires a rejection reason when rejecting a design', async () => {
    const design = {
      _id: new Types.ObjectId(),
      createdByUserId: new Types.ObjectId(userId),
      title: 'Panther Hoodie',
      status: DesignStatus.Submitted,
      save: jest.fn(),
    };
    designModel.findById.mockReturnValue(createExecQuery(design));

    await expect(
      service.reviewDesign(admin, design._id.toHexString(), {
        status: DesignStatus.Rejected,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(design.save).not.toHaveBeenCalled();
    expect(auditService.recordAdminAction).not.toHaveBeenCalled();
    expect(notificationsService.createForUser).not.toHaveBeenCalled();
  });

  it('requires an admin comment when requesting design changes', async () => {
    const design = {
      _id: new Types.ObjectId(),
      createdByUserId: new Types.ObjectId(userId),
      title: 'Panther Hoodie',
      status: DesignStatus.Submitted,
      save: jest.fn(),
    };
    designModel.findById.mockReturnValue(createExecQuery(design));

    await expect(
      service.reviewDesign(admin, design._id.toHexString(), {
        status: DesignStatus.NeedsChanges,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(design.save).not.toHaveBeenCalled();
  });
});
