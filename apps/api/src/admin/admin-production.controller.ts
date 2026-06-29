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
import { TransitionProductionPackageDto } from '../production/dto/transition-production-package.dto';
import { ProductionService } from '../production/production.service';

@ApiTags('Admin Production')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('admin/production')
export class AdminProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @ApiOperation({ summary: 'List production packages' })
  @RequirePermissions(Permission.AdminProductionRead)
  @Get()
  list() {
    return this.productionService.listProductionPackages();
  }

  @ApiOperation({ summary: 'Get production package details' })
  @RequirePermissions(Permission.AdminProductionRead)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.productionService.getProductionPackage(id);
  }

  @ApiOperation({ summary: 'Ensure a production package exists for a completed drop' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminProductionUpdate)
  @Post('drops/:dropId/ensure-package')
  ensurePackage(@Param('dropId') dropId: string, @Req() request: AuthenticatedRequest) {
    return this.productionService.ensurePackageForDrop(
      dropId,
      { id: request.user.id, email: request.user.email, role: request.user.role },
      {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    );
  }

  @ApiOperation({ summary: 'Transition production package status' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminProductionUpdate)
  @Post(':id/transition')
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionProductionPackageDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productionService.transitionProductionPackage(
      { id: request.user.id, email: request.user.email, role: request.user.role },
      id,
      dto,
      {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    );
  }
}
