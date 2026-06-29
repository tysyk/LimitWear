import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NotificationCategory, RequestStatus, UserRole } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { AuditRequestContext, AuditService } from '../audit/audit.service';
import type { ApplyDesignerDto } from '../designer/dto/apply-designer.dto';
import { DesignerProfilesService } from '../designer-profiles/designer-profiles.service';
import { FilesService } from '../files/files.service';
import { FileAssetCategory } from '../files/schemas/file-asset.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { PublicUser, UsersService } from '../users/users.service';
import {
  REVIEW_DESIGNER_APPLICATION_STATUSES,
  ReviewDesignerApplicationDto,
} from './dto/review-designer-application.dto';
import { Request, RequestDocument, RequestPriority, RequestType } from './schemas/request.schema';

const ACTIVE_DESIGNER_APPLICATION_STATUSES = [
  RequestStatus.Submitted,
  RequestStatus.UnderReview,
  RequestStatus.NeedsChanges,
] as const;

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(Request.name) private readonly requestModel: Model<RequestDocument>,
    private readonly auditService: AuditService,
    private readonly designerProfilesService: DesignerProfilesService,
    private readonly filesService: FilesService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

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

    const designerApplication = await this.requestModel.create({
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
      fileIds: [],
    });

    const files = await this.filesService.attachPendingFiles({
      userId: user.id,
      fileIds: dto.fileIds ?? [],
      categories: [FileAssetCategory.DesignerApplicationFile],
      relatedEntityType: 'request',
      relatedEntityId: this.getDocumentId(designerApplication),
    });

    designerApplication.fileIds = files.map((file) => file._id);

    return designerApplication.save();
  }

  async reviewDesignerApplication(
    admin: PublicUser,
    requestId: string,
    dto: ReviewDesignerApplicationDto,
    request?: AuditRequestContext,
  ): Promise<Request> {
    this.ensureReviewStatus(dto.status);
    const designerApplication = await this.findDesignerApplicationById(requestId);
    const oldStatus = designerApplication.status;
    const applicantUserId = designerApplication.createdByUserId;
    const applicationPayload = this.getDesignerApplicationPayload(designerApplication);

    if (dto.status === RequestStatus.Rejected) {
      this.ensureRequiredString(dto.rejectionReason ?? '', 'rejectionReason');
    }

    if (dto.status === RequestStatus.NeedsChanges) {
      this.ensureRequiredString(dto.adminComment ?? '', 'adminComment');
    }

    designerApplication.status = dto.status;
    designerApplication.adminComment = dto.adminComment?.trim();

    if (dto.status === RequestStatus.Approved) {
      await this.designerProfilesService.createApprovedProfile({
        userId: applicantUserId,
        displayName: applicationPayload.displayName,
        slug: applicationPayload.slug,
        bio: applicationPayload.bio,
        portfolioLinks: applicationPayload.portfolioLinks,
        approvedBy: admin.id,
      });
      await this.usersService.updateRole(applicantUserId.toHexString(), UserRole.Designer);
      designerApplication.resolvedAt = new Date();
      designerApplication.resolvedBy = this.toObjectId(admin.id);
    }

    if (dto.status === RequestStatus.Rejected) {
      designerApplication.resolvedAt = new Date();
      designerApplication.resolvedBy = this.toObjectId(admin.id);
    }

    const reviewedRequest = await designerApplication.save();
    const requestEntityId = this.getDocumentId(reviewedRequest).toHexString();

    await this.auditService.recordAdminAction(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      {
        action: this.getDesignerApplicationReviewAction(dto.status),
        entity: {
          type: 'request',
          id: requestEntityId,
        },
        old: {
          status: oldStatus,
        },
        new: {
          status: reviewedRequest.status,
          adminComment: reviewedRequest.adminComment,
          rejectionReason: dto.rejectionReason?.trim(),
        },
        reason: dto.rejectionReason?.trim() ?? reviewedRequest.adminComment,
        request,
      },
    );

    await this.notificationsService.createForUser({
      userId: applicantUserId,
      type: this.getDesignerApplicationReviewAction(dto.status),
      category: NotificationCategory.Designer,
      title: this.getDesignerApplicationNotificationTitle(dto.status),
      message: this.getDesignerApplicationNotificationMessage(dto.status),
      relatedEntityType: 'request',
      relatedEntityId: requestEntityId,
      metadata: {
        status: reviewedRequest.status,
      },
    });

    return reviewedRequest;
  }

  private async findDesignerApplicationById(requestId: string): Promise<RequestDocument> {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new NotFoundException('Designer application was not found');
    }

    const designerApplication = await this.requestModel.findById(requestId).exec();

    if (!designerApplication || designerApplication.type !== RequestType.DesignerApplication) {
      throw new NotFoundException('Designer application was not found');
    }

    return designerApplication;
  }

  private getDesignerApplicationPayload(request: Request): {
    displayName: string;
    slug: string;
    bio?: string;
    portfolioLinks: string[];
  } {
    const payload = request.payload ?? {};
    const displayName = typeof payload.displayName === 'string' ? payload.displayName : undefined;
    const slug = typeof payload.slug === 'string' ? payload.slug : undefined;

    if (!displayName || !slug) {
      throw new BadRequestException('Designer application payload is incomplete');
    }

    return {
      displayName,
      slug,
      bio: typeof payload.bio === 'string' ? payload.bio : undefined,
      portfolioLinks: Array.isArray(payload.portfolioLinks)
        ? payload.portfolioLinks.filter((link): link is string => typeof link === 'string')
        : [],
    };
  }

  private ensureReviewStatus(status: RequestStatus): void {
    if (
      !REVIEW_DESIGNER_APPLICATION_STATUSES.includes(
        status as (typeof REVIEW_DESIGNER_APPLICATION_STATUSES)[number],
      )
    ) {
      throw new BadRequestException('Invalid designer application review status');
    }
  }

  private ensureRequiredString(value: string, field: string): void {
    if (value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }
  }

  private getDesignerApplicationReviewAction(status: RequestStatus): string {
    const actions: Record<string, string> = {
      [RequestStatus.Approved]: 'designer_application.approved',
      [RequestStatus.Rejected]: 'designer_application.rejected',
      [RequestStatus.NeedsChanges]: 'designer_application.needs_changes',
    };

    return actions[status];
  }

  private getDesignerApplicationNotificationTitle(status: RequestStatus): string {
    const titles: Record<string, string> = {
      [RequestStatus.Approved]: 'Designer application approved',
      [RequestStatus.Rejected]: 'Designer application rejected',
      [RequestStatus.NeedsChanges]: 'Designer application needs changes',
    };

    return titles[status];
  }

  private getDesignerApplicationNotificationMessage(status: RequestStatus): string {
    if (status === RequestStatus.Approved) {
      return 'Your designer application was approved.';
    }

    if (status === RequestStatus.Rejected) {
      return 'Your designer application was rejected.';
    }

    return 'Your designer application needs changes.';
  }

  private getDocumentId(request: RequestDocument): Types.ObjectId {
    return request._id;
  }

  private toObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
  }
}
