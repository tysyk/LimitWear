import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Drop } from '../drops/schemas/drop.schema';
import { DesignerProfilesService } from './designer-profiles.service';
import { DesignerProfile } from './schemas/designer-profile.schema';

@ApiTags('Designers')
@Controller('designers')
export class DesignersController {
  constructor(private readonly designerProfilesService: DesignerProfilesService) {}

  @ApiOperation({ summary: 'List active public designers' })
  @Get()
  findActiveDesigners(): Promise<DesignerProfile[]> {
    return this.designerProfilesService.findActiveDesigners();
  }

  @ApiOperation({ summary: 'Get an active public designer by slug' })
  @Get(':slug')
  findActiveDesignerBySlug(@Param('slug') slug: string): Promise<DesignerProfile> {
    return this.designerProfilesService.findActiveDesignerBySlug(slug);
  }

  @ApiOperation({ summary: 'List public drops from an active designer' })
  @Get(':slug/drops')
  findActiveDesignerDrops(@Param('slug') slug: string): Promise<Drop[]> {
    return this.designerProfilesService.findActiveDesignerDrops(slug);
  }
}
