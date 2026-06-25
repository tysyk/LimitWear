import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PUBLIC_DROP_STATUSES } from '../drops/drops.service';
import { Drop, DropDocument } from '../drops/schemas/drop.schema';
import { Collection, CollectionDocument, CollectionStatus } from './schemas/collection.schema';

type CollectionWithId = Collection & {
  _id?: Types.ObjectId;
};

@Injectable()
export class CollectionsService {
  constructor(
    @InjectModel(Collection.name)
    private readonly collectionModel: Model<CollectionDocument>,
    @InjectModel(Drop.name)
    private readonly dropModel: Model<DropDocument>,
  ) {}

  async findPublishedCollections(): Promise<Collection[]> {
    return this.collectionModel
      .find({
        status: CollectionStatus.Published,
      })
      .sort({
        featured: -1,
        publishedAt: -1,
        createdAt: -1,
      })
      .lean<Collection[]>()
      .exec();
  }

  async findPublishedCollectionBySlug(slug: string): Promise<Collection> {
    const collection = await this.collectionModel
      .findOne({
        slug: this.normalizeSlug(slug),
        status: CollectionStatus.Published,
      })
      .lean<Collection>()
      .exec();

    if (!collection) {
      throw new NotFoundException('Collection was not found');
    }

    return collection;
  }

  async findPublishedCollectionDrops(slug: string): Promise<Drop[]> {
    const collection = (await this.findPublishedCollectionBySlug(slug)) as CollectionWithId;

    return this.dropModel
      .find({
        collectionId: collection._id,
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

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }
}
