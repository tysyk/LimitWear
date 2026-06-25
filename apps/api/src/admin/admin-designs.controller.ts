import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@limitwear/shared';
import { AUTH_COOKIE_NAME } from '../auth/auth.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { DesignsService } from '../designs/designs.service';
import { ReviewDesignDto } from '../designs/dto/review-design.dto';

@ApiTags('Admin Designs')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('admin/designs')
export class AdminDesignsController {
  constructor(private readonly designsService: DesignsService) {}

  @ApiOperation({ summary: 'List designs for admin review' })
  @RequirePermissions(Permission.AdminDesignsRead)
  @Get()
  findDesigns() {
    return this.designsService.findAdminDesigns();
  }

  @ApiOperation({ summary: 'Approve, reject, or request changes for a design' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminDesignsReview)
  @Post(':id/review')
  reviewDesign(
    @Param('id') designId: string,
    @Body() reviewDesignDto: ReviewDesignDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.designsService.reviewDesign(request.user, designId, reviewDesignDto, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}
