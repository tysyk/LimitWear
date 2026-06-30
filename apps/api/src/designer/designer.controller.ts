import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AUTH_COOKIE_NAME } from '../auth/auth.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AnalyticsService } from '../analytics/analytics.service';
import { DesignsService } from '../designs/designs.service';
import { CreateDesignDto } from '../designs/dto/create-design.dto';
import { UpdateDesignDto } from '../designs/dto/update-design.dto';
import { RequestsService } from '../requests/requests.service';
import { Permission } from '@limitwear/shared';
import { FilesService, UploadedFileData } from '../files/files.service';
import { FileAssetCategory, FileVisibility } from '../files/schemas/file-asset.schema';
import { PayoutsService } from '../payouts/payouts.service';
import { ApplyDesignerDto } from './dto/apply-designer.dto';

@ApiTags('Designer')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('designer')
export class DesignerController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly designsService: DesignsService,
    private readonly filesService: FilesService,
    private readonly payoutsService: PayoutsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @ApiOperation({ summary: 'Submit a designer application request' })
  @RequirePermissions(Permission.DesignerApply)
  @Post('apply')
  apply(@Body() applyDesignerDto: ApplyDesignerDto, @Req() request: AuthenticatedRequest) {
    return this.requestsService.createDesignerApplication(request.user, applyDesignerDto);
  }

  @ApiOperation({ summary: 'Upload a pending attachment for a designer application' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @RequirePermissions(Permission.DesignerApply)
  @Post('application-files')
  @UseInterceptors(FileInterceptor('file'))
  uploadApplicationFile(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    const uploadedFile = this.toUploadedFileData(file);

    return this.filesService.upload({
      ...uploadedFile,
      extension: this.getExtension(uploadedFile.originalName),
      visibility: FileVisibility.Private,
      category: FileAssetCategory.DesignerApplicationFile,
      uploadedByUserId: request.user.id,
      actor: request.user,
    });
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

  @ApiOperation({ summary: 'Upload and attach a file to an owned draft design' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @RequirePermissions(Permission.DesignerDesignsUpdate)
  @Post('designs/:id/files/:category')
  @UseInterceptors(FileInterceptor('file'))
  uploadDesignFile(
    @Param('id') designId: string,
    @Param('category') category: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.designsService.uploadDesignerFile(
      request.user,
      designId,
      this.getDesignFileCategory(category),
      this.toUploadedFileData(file),
    );
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

  @ApiOperation({ summary: 'List current designer payouts' })
  @RequirePermissions(Permission.DesignerPayoutsRead)
  @Get('payouts')
  findPayouts(@Req() request: AuthenticatedRequest) {
    return this.payoutsService.listDesignerPayouts(request.user.id);
  }

  @ApiOperation({ summary: 'Get current designer analytics' })
  @RequirePermissions(Permission.DesignerAnalyticsRead)
  @Get('analytics')
  getAnalytics(@Req() request: AuthenticatedRequest) {
    return this.analyticsService.getDesignerAnalytics(request.user.id);
  }

  private getDesignFileCategory(category: string): FileAssetCategory {
    const allowedCategories = [
      FileAssetCategory.DesignOriginal,
      FileAssetCategory.DesignPreview,
      FileAssetCategory.Mockup,
    ];

    if (!allowedCategories.includes(category as FileAssetCategory)) {
      throw new BadRequestException('Unsupported design file category.');
    }

    return category as FileAssetCategory;
  }

  private toUploadedFileData(file: Express.Multer.File | undefined): UploadedFileData {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException('A file is required.');
    }

    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      body: file.buffer,
    };
  }

  private getExtension(originalName: string): string {
    return originalName.split('.').pop()?.toLowerCase() ?? '';
  }
}
