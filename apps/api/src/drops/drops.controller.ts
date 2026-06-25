import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DropsService } from './drops.service';
import { Drop } from './schemas/drop.schema';

@ApiTags('Drops')
@Controller('drops')
export class DropsController {
  constructor(private readonly dropsService: DropsService) {}

  @ApiOperation({ summary: 'List public drops' })
  @Get()
  findPublicDrops(): Promise<Drop[]> {
    return this.dropsService.findPublicDrops();
  }

  @ApiOperation({ summary: 'Get a public drop by slug' })
  @Get(':slug')
  findPublicDropBySlug(@Param('slug') slug: string): Promise<Drop> {
    return this.dropsService.findPublicDropBySlug(slug);
  }

  @ApiOperation({ summary: 'List related public drops' })
  @Get(':slug/related')
  findRelatedPublicDrops(@Param('slug') slug: string): Promise<Drop[]> {
    return this.dropsService.findRelatedPublicDrops(slug);
  }
}
