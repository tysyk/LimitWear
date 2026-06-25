import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { OwnerGuard } from './guards/owner.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { SessionStrategy } from './strategies/session.strategy';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        const nodeEnv = configService.get<string>('NODE_ENV');

        if (!jwtSecret && nodeEnv === 'production') {
          throw new Error('JWT_SECRET is required in production');
        }

        return {
          secret: jwtSecret ?? 'limitwear-dev-jwt-secret-change-me',
          signOptions: {
            expiresIn: '7d',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, OwnerGuard, PermissionsGuard, SessionStrategy],
  exports: [AuthService, AuthGuard, JwtModule, OwnerGuard, PermissionsGuard, UsersModule],
})
export class AuthModule {}
