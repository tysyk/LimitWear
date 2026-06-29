import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@limitwear/shared';
import { AUTH_COOKIE_NAME } from '../auth/auth.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { DeliveryService } from '../delivery/delivery.service';
import { CreateTtnDto } from '../delivery/dto/create-ttn.dto';

@ApiTags('Admin Delivery')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('admin/delivery')
export class AdminDeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @ApiOperation({ summary: 'Create Nova Poshta TTN for a ready-to-ship order' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminDeliveryCreateTtn)
  @Post(':orderId/create-ttn')
  createTtn(@Param('orderId') orderId: string, @Body() dto: CreateTtnDto) {
    return this.deliveryService.createTtnForOrder(orderId, dto);
  }
}
