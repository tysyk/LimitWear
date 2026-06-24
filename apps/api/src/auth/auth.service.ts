import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@limitwear/shared';
import { compare, hash } from 'bcryptjs';
import type { CookieOptions } from 'express';
import { PublicUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export const AUTH_COOKIE_NAME = 'limitwear_session';
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const normalizedEmail = this.normalizeEmail(registerDto.email);
    this.validateEmail(normalizedEmail);
    this.validatePassword(registerDto.password);

    const existingUser = await this.usersService.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await hash(registerDto.password, 12);
    const user = await this.usersService.createUser({
      email: normalizedEmail,
      passwordHash,
      firstName: this.normalizeOptionalString(registerDto.firstName),
      lastName: this.normalizeOptionalString(registerDto.lastName),
      phone: this.normalizeOptionalString(registerDto.phone),
    });

    return { user };
  }

  async login(loginDto: LoginDto) {
    const normalizedEmail = this.normalizeEmail(loginDto.email);
    const password = this.normalizeRequiredString(loginDto.password);
    this.validateEmail(normalizedEmail);

    const userWithPasswordHash =
      await this.usersService.findByEmailWithPasswordHash(normalizedEmail);

    if (!userWithPasswordHash) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await compare(password, userWithPasswordHash.passwordHash);

    if (!isPasswordValid || userWithPasswordHash.status !== UserStatus.Active) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const user = await this.usersService.updateLastLoginAt(userWithPasswordHash.id, new Date());
    const sessionToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user,
      sessionToken,
      cookieOptions: this.getAuthCookieOptions(),
    };
  }

  logout() {
    return {
      cookieOptions: this.getAuthCookieOptions(),
    };
  }

  getCurrentUser(user: PublicUser) {
    return { user };
  }

  private normalizeEmail(email: string): string {
    return this.normalizeRequiredString(email).toLowerCase();
  }

  private normalizeRequiredString(value: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Required string field is missing');
    }

    return value.trim();
  }

  private normalizeOptionalString(value?: string): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : undefined;
  }

  private validateEmail(email: string): void {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      throw new BadRequestException('Email format is invalid');
    }
  }

  private validatePassword(password: string): void {
    if (typeof password !== 'string' || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      throw new BadRequestException('Password must contain letters and numbers');
    }
  }

  private getAuthCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
      path: '/',
      sameSite: 'lax',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
    };
  }
}
