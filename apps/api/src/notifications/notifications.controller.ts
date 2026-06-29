import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
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
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'List current user notifications' })
  @RequirePermissions(Permission.NotificationsRead)
  @Get()
  list(@Req() request: AuthenticatedRequest, @Query('status') status?: string) {
    return this.notificationsService.listForUser(request.user.id, { status });
  }

  @ApiOperation({ summary: 'Mark all current user notifications as read' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.NotificationsUpdate)
  @Post('mark-all-read')
  markAllRead(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllRead(request.user.id);
  }

  @ApiOperation({ summary: 'Get current user notification settings' })
  @RequirePermissions(Permission.NotificationsRead)
  @Get('settings')
  getSettings(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.getSettings(request.user.id);
  }

  @ApiOperation({ summary: 'Update current user notification settings' })
  @RequirePermissions(Permission.NotificationsUpdate)
  @Patch('settings')
  updateSettings(@Req() request: AuthenticatedRequest, @Body() dto: UpdateNotificationSettingsDto) {
    return this.notificationsService.updateSettings(request.user.id, dto);
  }
}
