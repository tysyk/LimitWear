import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@limitwear/shared';
import type { Request } from 'express';
import { AUTH_COOKIE_NAME } from '../auth.service';
import { UsersService } from '../../users/users.service';
import type { AuthenticatedRequest } from '../types/authenticated-request';

interface AuthSessionPayload {
  sub?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionToken = this.getCookieValue(request, AUTH_COOKIE_NAME);

    if (!sessionToken) {
      throw new UnauthorizedException('Authentication is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthSessionPayload>(sessionToken);

      if (!payload.sub) {
        throw new UnauthorizedException('Authentication is required');
      }

      const user = await this.usersService.findById(payload.sub);

      if (!user || user.status !== UserStatus.Active) {
        throw new UnauthorizedException('Authentication is required');
      }

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication is required');
    }
  }

  private getCookieValue(request: Request, cookieName: string): string | undefined {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return undefined;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const cookiePrefix = `${cookieName}=`;
    const cookie = cookies.find((value) => value.startsWith(cookiePrefix));

    return cookie ? decodeURIComponent(cookie.slice(cookiePrefix.length)) : undefined;
  }
}
