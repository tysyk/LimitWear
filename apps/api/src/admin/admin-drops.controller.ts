import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { CreateDropDto } from '../drops/dto/create-drop.dto';
import { TransitionDropDto } from '../drops/dto/transition-drop.dto';
import { UpdateDropDto } from '../drops/dto/update-drop.dto';
import { DropsService } from '../drops/drops.service';

@ApiTags('Admin Drops')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('admin/drops')
export class AdminDropsController {
  constructor(private readonly dropsService: DropsService) {}

  @ApiOperation({ summary: 'Create a draft drop' })
  @RequirePermissions(Permission.AdminDropsCreate)
  @Post()
  create(@Body() dto: CreateDropDto, @Req() request: AuthenticatedRequest) {
    return this.dropsService.createAdminDrop(request.user, dto);
  }

  @ApiOperation({ summary: 'Edit a drop before launch' })
  @RequirePermissions(Permission.AdminDropsUpdate)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDropDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dropsService.updateAdminDrop(request.user, id, dto);
  }

  @ApiOperation({ summary: 'Launch a ready drop' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminDropsLaunch)
  @Post(':id/launch')
  launch(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.dropsService.launchDrop(request.user, id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @ApiOperation({ summary: 'Transition a drop through its lifecycle' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminDropsUpdate)
  @Post(':id/transition')
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionDropDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dropsService.transitionDrop(request.user, id, dto.status, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}
