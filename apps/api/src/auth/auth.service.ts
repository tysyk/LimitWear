import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

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

  login(loginDto: LoginDto): never {
    void loginDto;
    throw new NotImplementedException('POST /auth/login will be implemented in LW-013');
  }

  logout(): never {
    throw new NotImplementedException('POST /auth/logout will be implemented in LW-014');
  }

  getCurrentUser(): never {
    throw new NotImplementedException('GET /auth/me will be implemented in LW-015');
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
}
