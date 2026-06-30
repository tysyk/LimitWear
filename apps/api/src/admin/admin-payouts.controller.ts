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
import { MarkPayoutPaidDto } from '../payouts/dto/mark-payout-paid.dto';
import { PayoutsService } from '../payouts/payouts.service';

@ApiTags('Admin Payouts')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('admin/payouts')
export class AdminPayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @ApiOperation({ summary: 'List designer payouts' })
  @RequirePermissions(Permission.AdminPayoutsRead)
  @Get()
  list() {
    return this.payoutsService.listAdminPayouts();
  }

  @ApiOperation({ summary: 'Ensure payout exists for a completed drop' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminPayoutsRead)
  @Post('drops/:dropId/ensure')
  ensureForDrop(@Param('dropId') dropId: string) {
    return this.payoutsService.ensurePayoutForDrop(dropId);
  }

  @ApiOperation({ summary: 'Mark a payout as paid or partially paid' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminPayoutsMarkPaid)
  @Post(':id/mark-paid')
  markPaid(
    @Param('id') id: string,
    @Body() dto: MarkPayoutPaidDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.payoutsService.markPaid(
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
