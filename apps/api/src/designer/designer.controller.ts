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
import { AUTH_COOKIE_NAME } from '../auth/auth.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { DesignsService } from '../designs/designs.service';
import { CreateDesignDto } from '../designs/dto/create-design.dto';
import { UpdateDesignDto } from '../designs/dto/update-design.dto';
import { RequestsService } from '../requests/requests.service';
import { Permission } from '@limitwear/shared';
import { ApplyDesignerDto } from './dto/apply-designer.dto';

@ApiTags('Designer')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('designer')
export class DesignerController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly designsService: DesignsService,
  ) {}

  @ApiOperation({ summary: 'Submit a designer application request' })
  @RequirePermissions(Permission.DesignerApply)
  @Post('apply')
  apply(@Body() applyDesignerDto: ApplyDesignerDto, @Req() request: AuthenticatedRequest) {
    return this.requestsService.createDesignerApplication(request.user, applyDesignerDto);
  }

  @ApiOperation({ summary: 'List current designer designs' })
  @RequirePermissions(Permission.DesignerDesignsRead)
  @Get('designs')
  findDesigns(@Req() request: AuthenticatedRequest) {
    return this.designsService.findDesignerDesigns(request.user);
  }

  @ApiOperation({ summary: 'Create a draft design' })
  @RequirePermissions(Permission.DesignerDesignsCreate)
  @Post('designs')
  createDesign(@Body() createDesignDto: CreateDesignDto, @Req() request: AuthenticatedRequest) {
    return this.designsService.createDesignerDesign(request.user, createDesignDto);
  }

  @ApiOperation({ summary: 'Update an owned draft design' })
  @RequirePermissions(Permission.DesignerDesignsUpdate)
  @Patch('designs/:id')
  updateDesign(
    @Param('id') designId: string,
    @Body() updateDesignDto: UpdateDesignDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.designsService.updateDesignerDesign(request.user, designId, updateDesignDto);
  }

  @ApiOperation({ summary: 'Submit an owned design for review' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DesignerDesignsSubmit)
  @Post('designs/:id/submit')
  submitDesign(@Param('id') designId: string, @Req() request: AuthenticatedRequest) {
    return this.designsService.submitDesignerDesign(request.user, designId);
  }
}
