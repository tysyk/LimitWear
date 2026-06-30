import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DropStatus, Permission } from '@limitwear/shared';
import { AUTH_COOKIE_NAME } from '../auth/auth.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CreateDropDto } from '../drops/dto/create-drop.dto';
import { TransitionDropDto } from '../drops/dto/transition-drop.dto';
import { UpdateDropDto } from '../drops/dto/update-drop.dto';
import { DropsService } from '../drops/drops.service';
import { PaymentsService } from '../payments/payments.service';
import { ProductionService } from '../production/production.service';

@ApiTags('Admin Drops')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('admin/drops')
export class AdminDropsController {
  constructor(
    private readonly dropsService: DropsService,
    private readonly paymentsService: PaymentsService,
    private readonly productionService: ProductionService,
  ) {}

  @ApiOperation({ summary: 'List all drops for admin operations' })
  @RequirePermissions(Permission.AdminDropsRead)
  @Get()
  list() {
    return this.dropsService.findAdminDrops();
  }

  @ApiOperation({ summary: 'Get a drop for admin operations' })
  @RequirePermissions(Permission.AdminDropsRead)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dropsService.findAdminDrop(id);
  }

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
  async transition(
    @Param('id') id: string,
    @Body() dto: TransitionDropDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const drop = await this.dropsService.transitionDrop(request.user, id, dto.status, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    if (this.shouldFinalizeHolds(dto.status)) {
      await this.paymentsService.finalizeActiveHoldsForDrop(id);
    }

    if (this.shouldCancelHolds(dto.status)) {
      await this.paymentsService.cancelActiveHoldsForDrop(id);
    }

    if (this.shouldCreateProductionPackage(dto.status)) {
      await this.productionService.ensurePackageForDrop(
        id,
        { id: request.user.id, email: request.user.email, role: request.user.role },
        {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        },
      );
    }

    return drop;
  }

  private shouldFinalizeHolds(status: DropStatus): boolean {
    return [DropStatus.SoldOut, DropStatus.Successful, DropStatus.Completed].includes(status);
  }

  private shouldCancelHolds(status: DropStatus): boolean {
    return [DropStatus.Failed, DropStatus.Cancelled].includes(status);
  }

  private shouldCreateProductionPackage(status: DropStatus): boolean {
    return [DropStatus.SoldOut, DropStatus.Successful, DropStatus.Completed].includes(status);
  }
}
