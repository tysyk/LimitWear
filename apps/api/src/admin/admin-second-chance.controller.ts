import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@limitwear/shared';
import { AUTH_COOKIE_NAME } from '../auth/auth.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateSecondChanceListingDto } from '../second-chance/dto/create-second-chance-listing.dto';
import { SecondChanceService } from '../second-chance/second-chance.service';

@ApiTags('Admin Second Chance')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('admin/second-chance')
export class AdminSecondChanceController {
  constructor(private readonly secondChanceService: SecondChanceService) {}

  @ApiOperation({ summary: 'List Second Chance listings' })
  @RequirePermissions(Permission.AdminSecondChanceRead)
  @Get()
  list() {
    return this.secondChanceService.listListings();
  }

  @ApiOperation({ summary: 'Create a Second Chance listing' })
  @RequirePermissions(Permission.AdminSecondChanceManage)
  @Post()
  create(@Body() dto: CreateSecondChanceListingDto) {
    return this.secondChanceService.createListing(dto);
  }

  @ApiOperation({ summary: 'Set wishlist priority window' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminSecondChanceManage)
  @Post(':id/priority')
  setPriority(@Param('id') id: string, @Body('priorityWindowUntil') priorityWindowUntil: string) {
    return this.secondChanceService.setPriority(id, priorityWindowUntil);
  }

  @ApiOperation({ summary: 'Make listing public' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminSecondChanceManage)
  @Post(':id/public')
  makePublic(@Param('id') id: string, @Body('publicAvailableAt') publicAvailableAt?: string) {
    return this.secondChanceService.makePublic(id, publicAvailableAt);
  }

  @ApiOperation({ summary: 'Mark listing sold' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminSecondChanceManage)
  @Post(':id/sold')
  markSold(@Param('id') id: string) {
    return this.secondChanceService.markSold(id);
  }

  @ApiOperation({ summary: 'Expire listing' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminSecondChanceManage)
  @Post(':id/expire')
  expire(@Param('id') id: string) {
    return this.secondChanceService.expire(id);
  }

  @ApiOperation({ summary: 'Cancel listing' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AdminSecondChanceManage)
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.secondChanceService.cancel(id);
  }
}
