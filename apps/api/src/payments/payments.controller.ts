import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@limitwear/shared';
import { AUTH_COOKIE_NAME } from '../auth/auth.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CreatePaymentHoldDto } from './dto/create-payment-hold.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({ summary: 'Create a Monobank payment hold invoice for a pending order' })
  @RequirePermissions(Permission.OrdersCreate)
  @Post('hold')
  createHold(@Body() dto: CreatePaymentHoldDto, @Req() request: AuthenticatedRequest) {
    return this.paymentsService.createPaymentHold(request.user, dto);
  }
}
