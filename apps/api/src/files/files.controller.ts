import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AUTH_COOKIE_NAME } from '../auth/auth.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@UseGuards(AuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiOperation({ summary: 'Get a direct public URL or an authorized signed private URL' })
  @Get(':id/access-url')
  getAccessUrl(@Param('id') fileId: string, @Req() request: AuthenticatedRequest) {
    return this.filesService.getPrivateUrlForUser(request.user, fileId).then((url) => ({ url }));
  }
}
