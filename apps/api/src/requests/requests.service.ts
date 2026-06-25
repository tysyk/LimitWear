import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RequestStatus, UserRole } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import type { ApplyDesignerDto } from '../designer/dto/apply-designer.dto';
import type { PublicUser } from '../users/users.service';
import { Request, RequestDocument, RequestPriority, RequestType } from './schemas/request.schema';

const ACTIVE_DESIGNER_APPLICATION_STATUSES = [
  RequestStatus.Submitted,
  RequestStatus.UnderReview,
  RequestStatus.NeedsChanges,
] as const;

@Injectable()
export class RequestsService {
  constructor(@InjectModel(Request.name) private readonly requestModel: Model<RequestDocument>) {}

  async createDesignerApplication(user: PublicUser, dto: ApplyDesignerDto): Promise<Request> {
    if (user.role === UserRole.Designer) {
      throw new ConflictException('Designer application is not required for designers');
    }

    const createdByUserId = this.toObjectId(user.id);
    const existingApplication = await this.requestModel
      .findOne({
        type: RequestType.DesignerApplication,
        createdByUserId,
        status: {
          $in: ACTIVE_DESIGNER_APPLICATION_STATUSES,
        },
      })
      .exec();

    if (existingApplication) {
      throw new ConflictException('Designer application is already submitted');
    }

    return this.requestModel.create({
      type: RequestType.DesignerApplication,
      status: RequestStatus.Submitted,
      createdByUserId,
      title: `Designer application: ${dto.displayName}`,
      message: dto.message,
      payload: {
        displayName: dto.displayName,
        slug: dto.slug,
        bio: dto.bio,
        portfolioLinks: dto.portfolioLinks ?? [],
      },
      priority: RequestPriority.Normal,
    });
  }

  private toObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
  }
}
