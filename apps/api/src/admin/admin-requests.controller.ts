import {
  Body,
  Controller,
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
import { ReviewDesignerApplicationDto } from '../requests/dto/review-designer-application.dto';
import { RequestsService } from '../requests/requests.service';

@ApiTags('Admin Requests')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('admin/requests')
export class AdminRequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @ApiOperation({ summary: 'Review a designer application request' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminRequestsManage)
  @Post('designer-applications/:id/review')
  reviewDesignerApplication(
    @Param('id') requestId: string,
    @Body() reviewDesignerApplicationDto: ReviewDesignerApplicationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.requestsService.reviewDesignerApplication(
      request.user,
      requestId,
      reviewDesignerApplicationDto,
      {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    );
  }
}
