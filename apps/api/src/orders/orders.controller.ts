import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@limitwear/shared';
import { AUTH_COOKIE_NAME } from '../auth/auth.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Create a pending payment order' })
  @RequirePermissions(Permission.OrdersCreate)
  @Post()
  createOrder(@Body() dto: CreateOrderDto, @Req() request: AuthenticatedRequest) {
    return this.ordersService.createOrder(request.user, dto);
  }

  @ApiOperation({ summary: 'Cancel an order before the drop is guaranteed' })
  @RequirePermissions(Permission.OrdersUpdate)
  @Post(':id/cancel')
  cancelOrder(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.ordersService.cancelOrder(request.user, id);
  }
}
