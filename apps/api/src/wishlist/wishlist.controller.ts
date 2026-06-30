import {
  Body,
  Controller,
  Delete,
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
import { Permission } from '@limitwear/shared';
import { AUTH_COOKIE_NAME } from '../auth/auth.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { UpdateWishlistItemDto } from './dto/update-wishlist-item.dto';
import { WishlistService } from './wishlist.service';

@ApiTags('Wishlist')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @ApiOperation({ summary: 'List current user wishlist items' })
  @RequirePermissions(Permission.WishlistManage)
  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.wishlistService.listForUser(request.user.id);
  }

  @ApiOperation({ summary: 'Add a drop to the current user wishlist' })
  @RequirePermissions(Permission.WishlistManage)
  @Post(':dropId')
  add(@Req() request: AuthenticatedRequest, @Param('dropId') dropId: string) {
    return this.wishlistService.addForUser(request.user.id, dropId);
  }

  @ApiOperation({ summary: 'Close a current user wishlist item without deleting history' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.WishlistManage)
  @Delete(':dropId')
  close(@Req() request: AuthenticatedRequest, @Param('dropId') dropId: string) {
    return this.wishlistService.closeForUser(request.user.id, dropId);
  }

  @ApiOperation({ summary: 'Update current user wishlist notification settings' })
  @RequirePermissions(Permission.WishlistManage)
  @Patch(':dropId/settings')
  updateSettings(
    @Req() request: AuthenticatedRequest,
    @Param('dropId') dropId: string,
    @Body() dto: UpdateWishlistItemDto,
  ) {
    return this.wishlistService.updateForUser(request.user.id, dropId, dto);
  }
}
