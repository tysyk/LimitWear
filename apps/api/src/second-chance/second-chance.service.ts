import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateSecondChanceListingDto,
  validateCreateSecondChanceListingDto,
} from './dto/create-second-chance-listing.dto';
import {
  TransitionSecondChanceListingDto,
  validateTransitionSecondChanceListingDto,
} from './dto/transition-second-chance-listing.dto';
import {
  SecondChanceListing,
  SecondChanceListingDocument,
  SecondChanceListingStatus,
} from './schemas/second-chance-listing.schema';

@Injectable()
export class SecondChanceService {
  constructor(
    @InjectModel(SecondChanceListing.name)
    private readonly listingModel: Model<SecondChanceListingDocument>,
  ) {}

  async listListings(): Promise<SecondChanceListing[]> {
    return this.listingModel.find().sort({ createdAt: -1 }).lean<SecondChanceListing[]>().exec();
  }

  async createListing(dto: CreateSecondChanceListingDto): Promise<SecondChanceListingDocument> {
    const input = validateCreateSecondChanceListingDto(dto);

    return this.listingModel.create({
      dropId: this.toObjectId(input.dropId),
      sourceOrderId: input.sourceOrderId ? this.toObjectId(input.sourceOrderId) : undefined,
      size: input.size,
      quantity: input.quantity,
      price: input.price,
      currency: input.currency,
      status: SecondChanceListingStatus.Draft,
      priorityWindowUntil: input.priorityWindowUntil,
      publicAvailableAt: input.publicAvailableAt,
    });
  }

  async transitionListing(
    id: string,
    dto: TransitionSecondChanceListingDto,
  ): Promise<SecondChanceListingDocument> {
    const input = validateTransitionSecondChanceListingDto(dto);
    const update: Partial<SecondChanceListing> = {
      status: input.status,
    };

    if (input.status === SecondChanceListingStatus.WishlistPriority) {
      if (!input.priorityWindowUntil) {
        throw new BadRequestException('Priority window date is required.');
      }
      update.priorityWindowUntil = input.priorityWindowUntil;
    }

    if (input.status === SecondChanceListingStatus.PublicAvailable) {
      update.publicAvailableAt = input.publicAvailableAt ?? new Date();
    }

    if (input.status === SecondChanceListingStatus.Sold) {
      update.soldAt = new Date();
    }

    const objectId = this.toObjectId(id);
    const listing =
      input.status === SecondChanceListingStatus.Sold
        ? await this.listingModel
            .findOneAndUpdate(
              {
                _id: objectId,
                status: {
                  $in: [
                    SecondChanceListingStatus.PublicAvailable,
                    SecondChanceListingStatus.Reserved,
                  ],
                },
              },
              { $set: update },
              { new: true },
            )
            .exec()
        : await this.listingModel
            .findByIdAndUpdate(objectId, { $set: update }, { new: true })
            .exec();

    if (!listing) {
      throw new NotFoundException('Second Chance listing was not found.');
    }

    return listing;
  }

  setPriority(id: string, priorityWindowUntil: string): Promise<SecondChanceListingDocument> {
    return this.transitionListing(id, {
      status: SecondChanceListingStatus.WishlistPriority,
      priorityWindowUntil,
    });
  }

  makePublic(id: string, publicAvailableAt?: string): Promise<SecondChanceListingDocument> {
    return this.transitionListing(id, {
      status: SecondChanceListingStatus.PublicAvailable,
      publicAvailableAt,
    });
  }

  markSold(id: string): Promise<SecondChanceListingDocument> {
    return this.transitionListing(id, { status: SecondChanceListingStatus.Sold });
  }

  expire(id: string): Promise<SecondChanceListingDocument> {
    return this.transitionListing(id, { status: SecondChanceListingStatus.Expired });
  }

  cancel(id: string): Promise<SecondChanceListingDocument> {
    return this.transitionListing(id, { status: SecondChanceListingStatus.Cancelled });
  }

  private toObjectId(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('ObjectId is invalid.');
    }

    return new Types.ObjectId(value);
  }
}
