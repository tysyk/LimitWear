import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Drop } from '../drops/schemas/drop.schema';
import { CollectionsService } from './collections.service';
import { Collection } from './schemas/collection.schema';

@ApiTags('Collections')
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @ApiOperation({ summary: 'List published collections' })
  @Get()
  findPublishedCollections(): Promise<Collection[]> {
    return this.collectionsService.findPublishedCollections();
  }

  @ApiOperation({ summary: 'Get a published collection by slug' })
  @Get(':slug')
  findPublishedCollectionBySlug(@Param('slug') slug: string): Promise<Collection> {
    return this.collectionsService.findPublishedCollectionBySlug(slug);
  }

  @ApiOperation({ summary: 'List public drops from a published collection' })
  @Get(':slug/drops')
  findPublishedCollectionDrops(@Param('slug') slug: string): Promise<Drop[]> {
    return this.collectionsService.findPublishedCollectionDrops(slug);
  }
}
