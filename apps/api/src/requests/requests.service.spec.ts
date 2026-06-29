import { BadRequestException, ConflictException } from '@nestjs/common';
import { NotificationCategory, RequestStatus, UserRole, UserStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { DesignerProfilesService } from '../designer-profiles/designer-profiles.service';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { RequestsService } from './requests.service';
import { RequestDocument, RequestPriority, RequestType } from './schemas/request.schema';

const createExecQuery = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
});

describe('RequestsService', () => {
  let service: RequestsService;
  let requestModel: {
    create: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
  };
  let auditService: jest.Mocked<Pick<AuditService, 'recordAdminAction'>>;
  let designerProfilesService: jest.Mocked<Pick<DesignerProfilesService, 'createApprovedProfile'>>;
  let filesService: jest.Mocked<Pick<FilesService, 'attachPendingFiles'>>;
  let notificationsService: jest.Mocked<Pick<NotificationsService, 'createForUser'>>;
  let usersService: jest.Mocked<Pick<UsersService, 'updateRole'>>;

  const userId = new Types.ObjectId().toHexString();
  const user = {
    id: userId,
    email: 'user@example.com',
    role: UserRole.User,
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
    requestModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
    };
    auditService = {
      recordAdminAction: jest.fn(),
    };
    designerProfilesService = {
      createApprovedProfile: jest.fn(),
    };
    filesService = {
      attachPendingFiles: jest.fn().mockResolvedValue([]),
    };
    notificationsService = {
      createForUser: jest.fn(),
    };
    usersService = {
      updateRole: jest.fn(),
    };
    service = new RequestsService(
      requestModel as unknown as Model<RequestDocument>,
      auditService as unknown as AuditService,
      designerProfilesService as unknown as DesignerProfilesService,
      filesService as unknown as FilesService,
      notificationsService as unknown as NotificationsService,
      usersService as unknown as UsersService,
    );
  });

  it('creates a submitted designer application request without changing the user role', async () => {
    const createdRequest = {
      _id: new Types.ObjectId(),
      type: RequestType.DesignerApplication,
      status: RequestStatus.Submitted,
      fileIds: [] as Types.ObjectId[],
      save: jest.fn().mockImplementation(function (this: unknown) {
        return Promise.resolve(this);
      }),
    };
    requestModel.findOne.mockReturnValue(createExecQuery(null));
    requestModel.create.mockResolvedValue(createdRequest);

    await expect(
      service.createDesignerApplication(user, {
        displayName: 'LimitWear Studio',
        slug: 'limitwear-studio',
        bio: 'Streetwear designer',
        portfolioLinks: ['https://instagram.com/limitwear'],
        message: 'Let me in.',
      }),
    ).resolves.toBe(createdRequest);

    expect(requestModel.create).toHaveBeenCalledWith({
      type: RequestType.DesignerApplication,
      status: RequestStatus.Submitted,
      createdByUserId: new Types.ObjectId(userId),
      title: 'Designer application: LimitWear Studio',
      message: 'Let me in.',
      payload: {
        displayName: 'LimitWear Studio',
        slug: 'limitwear-studio',
        bio: 'Streetwear designer',
        portfolioLinks: ['https://instagram.com/limitwear'],
      },
      priority: RequestPriority.Normal,
      fileIds: [],
    });
    expect(createdRequest.save).toHaveBeenCalled();
    expect(user.role).toBe(UserRole.User);
  });

  it('attaches pending designer application files to the created request', async () => {
    const requestId = new Types.ObjectId();
    const fileId = new Types.ObjectId();
    const createdRequest = {
      _id: requestId,
      type: RequestType.DesignerApplication,
      status: RequestStatus.Submitted,
      fileIds: [] as Types.ObjectId[],
      save: jest.fn().mockImplementation(function (this: unknown) {
        return Promise.resolve(this);
      }),
    };
    requestModel.findOne.mockReturnValue(createExecQuery(null));
    requestModel.create.mockResolvedValue(createdRequest);
    filesService.attachPendingFiles.mockResolvedValue([{ _id: fileId }] as never);

    await service.createDesignerApplication(user, {
      displayName: 'LimitWear Studio',
      slug: 'limitwear-studio',
      fileIds: [fileId.toHexString()],
    });

    expect(filesService.attachPendingFiles).toHaveBeenCalledWith({
      userId,
      fileIds: [fileId.toHexString()],
      categories: ['designer_application_file'],
      relatedEntityType: 'request',
      relatedEntityId: requestId,
    });
    expect(createdRequest.fileIds).toEqual([fileId]);
  });

  it('prevents duplicate active designer applications', async () => {
    requestModel.findOne.mockReturnValue(createExecQuery({ id: 'existing-request' }));

    await expect(
      service.createDesignerApplication(user, {
        displayName: 'LimitWear Studio',
        slug: 'limitwear-studio',
      }),
    ).rejects.toThrow(ConflictException);
    expect(requestModel.create).not.toHaveBeenCalled();
  });

  it('does not create designer applications for users who already are designers', async () => {
    await expect(
      service.createDesignerApplication(
        {
          ...user,
          role: UserRole.Designer,
        },
        {
          displayName: 'LimitWear Studio',
          slug: 'limitwear-studio',
        },
      ),
    ).rejects.toThrow(ConflictException);
    expect(requestModel.findOne).not.toHaveBeenCalled();
    expect(requestModel.create).not.toHaveBeenCalled();
  });

  it('approves a designer application with profile, role, audit, and notification updates', async () => {
    const requestId = new Types.ObjectId();
    const applicantUserId = new Types.ObjectId(userId);
    const designerApplication = {
      _id: requestId,
      type: RequestType.DesignerApplication,
      status: RequestStatus.Submitted,
      createdByUserId: applicantUserId,
      payload: {
        displayName: 'LimitWear Studio',
        slug: 'limitwear-studio',
        bio: 'Streetwear designer',
        portfolioLinks: ['https://instagram.com/limitwear'],
      },
      resolvedAt: undefined as Date | undefined,
      resolvedBy: undefined as Types.ObjectId | undefined,
      save: jest.fn().mockImplementation(function (this: { status: RequestStatus }) {
        return Promise.resolve(this);
      }),
    };
    requestModel.findById.mockReturnValue(createExecQuery(designerApplication));

    await expect(
      service.reviewDesignerApplication(admin, requestId.toHexString(), {
        status: RequestStatus.Approved,
      }),
    ).resolves.toMatchObject({
      status: RequestStatus.Approved,
    });

    expect(designerProfilesService.createApprovedProfile).toHaveBeenCalledWith({
      userId: applicantUserId,
      displayName: 'LimitWear Studio',
      slug: 'limitwear-studio',
      bio: 'Streetwear designer',
      portfolioLinks: ['https://instagram.com/limitwear'],
      approvedBy: admin.id,
    });
    expect(usersService.updateRole).toHaveBeenCalledWith(userId, UserRole.Designer);
    expect(designerApplication.resolvedAt).toBeInstanceOf(Date);
    expect(designerApplication.resolvedBy).toEqual(new Types.ObjectId(admin.id));
    expect(auditService.recordAdminAction).toHaveBeenCalledWith(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      {
        action: 'designer_application.approved',
        entity: {
          type: 'request',
          id: requestId.toHexString(),
        },
        old: {
          status: RequestStatus.Submitted,
        },
        new: {
          status: RequestStatus.Approved,
          adminComment: undefined,
          rejectionReason: undefined,
        },
        reason: undefined,
        request: undefined,
      },
    );
    expect(notificationsService.createForUser).toHaveBeenCalledWith({
      userId: applicantUserId,
      type: 'designer_application.approved',
      category: NotificationCategory.Designer,
      title: 'Designer application approved',
      message: 'Your designer application was approved.',
      relatedEntityType: 'request',
      relatedEntityId: requestId.toHexString(),
      metadata: {
        status: RequestStatus.Approved,
      },
    });
  });

  it('requires a rejection reason when rejecting designer applications', async () => {
    const designerApplication = {
      _id: new Types.ObjectId(),
      type: RequestType.DesignerApplication,
      status: RequestStatus.Submitted,
      createdByUserId: new Types.ObjectId(userId),
      payload: {
        displayName: 'LimitWear Studio',
        slug: 'limitwear-studio',
      },
      save: jest.fn(),
    };
    requestModel.findById.mockReturnValue(createExecQuery(designerApplication));

    await expect(
      service.reviewDesignerApplication(admin, designerApplication._id.toHexString(), {
        status: RequestStatus.Rejected,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(designerApplication.save).not.toHaveBeenCalled();
    expect(auditService.recordAdminAction).not.toHaveBeenCalled();
    expect(notificationsService.createForUser).not.toHaveBeenCalled();
  });

  it('requires an admin comment when requesting designer application changes', async () => {
    const designerApplication = {
      _id: new Types.ObjectId(),
      type: RequestType.DesignerApplication,
      status: RequestStatus.Submitted,
      createdByUserId: new Types.ObjectId(userId),
      payload: {
        displayName: 'LimitWear Studio',
        slug: 'limitwear-studio',
      },
      save: jest.fn(),
    };
    requestModel.findById.mockReturnValue(createExecQuery(designerApplication));

    await expect(
      service.reviewDesignerApplication(admin, designerApplication._id.toHexString(), {
        status: RequestStatus.NeedsChanges,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(designerApplication.save).not.toHaveBeenCalled();
  });
});
