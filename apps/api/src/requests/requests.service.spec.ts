import { ConflictException } from '@nestjs/common';
import { RequestStatus, UserRole, UserStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { RequestsService } from './requests.service';
import { RequestDocument, RequestPriority, RequestType } from './schemas/request.schema';

const createExecQuery = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
});

describe('RequestsService', () => {
  let service: RequestsService;
  let requestModel: {
    create: jest.Mock;
    findOne: jest.Mock;
  };

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

  beforeEach(() => {
    requestModel = {
      create: jest.fn(),
      findOne: jest.fn(),
    };
    service = new RequestsService(requestModel as unknown as Model<RequestDocument>);
  });

  it('creates a submitted designer application request without changing the user role', async () => {
    const createdRequest = {
      type: RequestType.DesignerApplication,
      status: RequestStatus.Submitted,
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
    });
    expect(user.role).toBe(UserRole.User);
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
});
