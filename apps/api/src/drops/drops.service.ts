import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DropStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { AuditRequestContext, AuditService } from '../audit/audit.service';
import { Design, DesignDocument } from '../designs/schemas/design.schema';
import type { PublicUser } from '../users/users.service';
import { CreateDropDto } from './dto/create-drop.dto';
import { UpdateDropDto } from './dto/update-drop.dto';
import { Drop, DropDocument } from './schemas/drop.schema';

export const PUBLIC_DROP_STATUSES = [
  DropStatus.Active,
  DropStatus.ActiveCollecting,
  DropStatus.Guaranteed,
  DropStatus.SoldOut,
  DropStatus.Successful,
  DropStatus.InProduction,
  DropStatus.ReadyToShip,
  DropStatus.Shipped,
  DropStatus.Delivered,
  DropStatus.Completed,
  DropStatus.SecondChanceWindow,
  DropStatus.ForeverClosed,
] as const;

type DropWithId = Drop & {
  _id?: Types.ObjectId;
};

@Injectable()
export class DropsService {
  constructor(
    @InjectModel(Drop.name) private readonly dropModel: Model<DropDocument>,
    @InjectModel(Design.name) private readonly designModel: Model<DesignDocument>,
    private readonly auditService: AuditService,
  ) {}

  async createAdminDrop(admin: PublicUser, dto: CreateDropDto): Promise<DropDocument> {
    this.validateDropInput(dto);
    const design = await this.findDesign(dto.designId);

    return this.dropModel.create({
      ...this.toDropPayload(dto),
      designId: design._id,
      designerId: design.designerId,
      currentQuantity: 0,
      sizeBreakdown: {},
      status: DropStatus.Draft,
      createdByAdminId: new Types.ObjectId(admin.id),
    });
  }

  async updateAdminDrop(
    admin: PublicUser,
    dropId: string,
    dto: UpdateDropDto,
  ): Promise<DropDocument> {
    const drop = await this.findDrop(dropId);
    const launched = drop.status !== DropStatus.Draft && drop.status !== DropStatus.ReadyForLaunch;
    const lockedFields: Array<keyof UpdateDropDto> = [
      'designerRevenuePercent',
      'minQuantity',
      'maxQuantity',
      'price',
      'designId',
    ];
    if (launched && lockedFields.some((field) => dto[field] !== undefined)) {
      throw new BadRequestException('Commercial terms are locked after launch.');
    }
    this.validateDropInput({ ...this.toEditableDto(drop), ...dto } as CreateDropDto);
    if (dto.designId) {
      const design = await this.findDesign(dto.designId);
      drop.designId = design._id;
      drop.designerId = design.designerId;
    }
    Object.assign(drop, this.toDropPayload(dto));
    const updated = await drop.save();
    await this.auditService.recordAdminAction(
      { id: admin.id, email: admin.email, role: admin.role },
      {
        action: 'drop.updated',
        entity: { type: 'drop', id: updated._id.toHexString() },
        new: dto as Record<string, unknown>,
      },
    );
    return updated;
  }

  async launchDrop(
    admin: PublicUser,
    dropId: string,
    request?: AuditRequestContext,
  ): Promise<DropDocument> {
    return this.transitionDrop(
      admin,
      dropId,
      DropStatus.ActiveCollecting,
      request,
      DropStatus.ReadyForLaunch,
    );
  }

  async transitionDrop(
    admin: PublicUser,
    dropId: string,
    nextStatus: DropStatus,
    request?: AuditRequestContext,
    requiredCurrentStatus?: DropStatus,
  ): Promise<DropDocument> {
    const drop = await this.findDrop(dropId);
    if (requiredCurrentStatus && drop.status !== requiredCurrentStatus) {
      throw new BadRequestException(`Drop must be ${requiredCurrentStatus} before launch.`);
    }
    if (!DROP_TRANSITIONS[drop.status]?.includes(nextStatus)) {
      throw new BadRequestException(`Cannot transition drop from ${drop.status} to ${nextStatus}.`);
    }
    const previousStatus = drop.status;
    drop.status = nextStatus;
    if (nextStatus === DropStatus.Completed) drop.completedAt = new Date();
    if (nextStatus === DropStatus.Failed) drop.failedAt = new Date();
    if (nextStatus === DropStatus.ForeverClosed) drop.foreverClosedAt = new Date();
    const updated = await drop.save();
    await this.auditService.recordAdminAction(
      { id: admin.id, email: admin.email, role: admin.role },
      {
        action: `drop.${nextStatus}`,
        entity: { type: 'drop', id: updated._id.toHexString() },
        old: { status: previousStatus },
        new: { status: nextStatus },
        request,
      },
    );
    return updated;
  }

  async findPublicDrops(): Promise<Drop[]> {
    return this.dropModel
      .find({
        status: {
          $in: PUBLIC_DROP_STATUSES,
        },
      })
      .sort({
        startsAt: -1,
        createdAt: -1,
      })
      .lean<Drop[]>()
      .exec();
  }

  async findPublicDropBySlug(slug: string): Promise<Drop> {
    const drop = await this.dropModel
      .findOne({
        slug: this.normalizeSlug(slug),
        status: {
          $in: PUBLIC_DROP_STATUSES,
        },
      })
      .lean<Drop>()
      .exec();

    if (!drop) {
      throw new NotFoundException('Drop was not found');
    }

    return drop;
  }

  async findRelatedPublicDrops(slug: string): Promise<Drop[]> {
    const drop = (await this.findPublicDropBySlug(slug)) as DropWithId;
    const relatedConditions: Array<
      { collectionId: Types.ObjectId } | { designerId: Types.ObjectId }
    > = [];

    if (drop.collectionId) {
      relatedConditions.push({
        collectionId: drop.collectionId,
      });
    }

    if (drop.designerId) {
      relatedConditions.push({
        designerId: drop.designerId,
      });
    }

    if (relatedConditions.length === 0) {
      return [];
    }

    return this.dropModel
      .find({
        _id: {
          $ne: drop._id,
        },
        status: {
          $in: PUBLIC_DROP_STATUSES,
        },
        $or: relatedConditions,
      })
      .sort({
        startsAt: -1,
        createdAt: -1,
      })
      .limit(8)
      .lean<Drop[]>()
      .exec();
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private async findDrop(id: string): Promise<DropDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Drop was not found');
    const drop = await this.dropModel.findById(id).exec();
    if (!drop) throw new NotFoundException('Drop was not found');
    return drop;
  }

  private async findDesign(id: string): Promise<DesignDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid design id');
    const design = await this.designModel.findById(id).exec();
    if (!design) throw new BadRequestException('Design was not found');
    return design;
  }

  private validateDropInput(dto: CreateDropDto): void {
    if (!dto.title?.trim() || !dto.slug?.trim() || !dto.dropNumber?.trim()) {
      throw new BadRequestException('Drop title, slug, and number are required.');
    }

    if (!Number.isFinite(dto.price) || dto.price <= 0) {
      throw new BadRequestException('Price must be greater than zero.');
    }

    if (
      !Number.isInteger(dto.minQuantity) ||
      !Number.isInteger(dto.maxQuantity) ||
      dto.minQuantity < 1 ||
      dto.maxQuantity < dto.minQuantity
    ) {
      throw new BadRequestException('Quantity limits are invalid.');
    }

    if (
      !Number.isFinite(dto.designerRevenuePercent) ||
      dto.designerRevenuePercent < 0 ||
      dto.designerRevenuePercent > 100
    ) {
      throw new BadRequestException('Designer revenue percent is invalid.');
    }

    if (
      !Array.isArray(dto.sizeOptions) ||
      dto.sizeOptions.length === 0 ||
      dto.sizeOptions.some((size) => !size.trim())
    ) {
      throw new BadRequestException('At least one size option is required.');
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
      throw new BadRequestException('Drop dates are invalid.');
    }
  }

  private toDropPayload(dto: Partial<CreateDropDto>): Partial<Drop> {
    const payload: Partial<Drop> = {};
    for (const field of [
      'dropNumber',
      'title',
      'slug',
      'description',
      'productType',
      'productColor',
      'productBase',
      'material',
      'price',
      'designerRevenuePercent',
      'minQuantity',
      'maxQuantity',
      'sizeOptions',
    ] as const) {
      if (dto[field] !== undefined) {
        (payload as Record<string, unknown>)[field] =
          typeof dto[field] === 'string' ? dto[field].trim() : dto[field];
      }
    }
    if (dto.startsAt !== undefined) payload.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) payload.endsAt = new Date(dto.endsAt);
    return payload;
  }

  private toEditableDto(drop: Drop): Partial<CreateDropDto> {
    return {
      dropNumber: drop.dropNumber,
      title: drop.title,
      slug: drop.slug,
      productType: drop.productType,
      price: drop.price,
      designerRevenuePercent: drop.designerRevenuePercent,
      minQuantity: drop.minQuantity,
      maxQuantity: drop.maxQuantity,
      sizeOptions: drop.sizeOptions,
      startsAt: drop.startsAt?.toISOString() ?? '',
      endsAt: drop.endsAt?.toISOString() ?? '',
    };
  }
}

const DROP_TRANSITIONS: Partial<Record<DropStatus, DropStatus[]>> = {
  [DropStatus.Draft]: [DropStatus.ReadyForLaunch, DropStatus.Archived],
  [DropStatus.ReadyForLaunch]: [DropStatus.ActiveCollecting, DropStatus.Draft, DropStatus.Archived],
  [DropStatus.ActiveCollecting]: [DropStatus.Guaranteed, DropStatus.SoldOut, DropStatus.Failed],
  [DropStatus.Guaranteed]: [DropStatus.SoldOut, DropStatus.Successful],
  [DropStatus.SoldOut]: [DropStatus.Successful],
  [DropStatus.Successful]: [DropStatus.InProduction],
  [DropStatus.InProduction]: [DropStatus.ReadyToShip],
  [DropStatus.ReadyToShip]: [DropStatus.Shipped],
  [DropStatus.Shipped]: [DropStatus.Delivered],
  [DropStatus.Delivered]: [DropStatus.Completed, DropStatus.SecondChanceWindow],
  [DropStatus.SecondChanceWindow]: [DropStatus.ForeverClosed],
};
