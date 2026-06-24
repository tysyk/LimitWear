import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    void context;
    throw new UnauthorizedException(
      'AuthGuard will be implemented with session/JWT cookies in LW-015/LW-016',
    );
  }
}
