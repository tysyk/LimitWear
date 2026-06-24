import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserRole, UserStatus } from '@limitwear/shared';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  status: UserStatus;
  firstName?: string;
  lastName?: string;
  phone?: string;
  telegramUsername?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: Date;
}

export interface UserWithPasswordHash extends PublicUser {
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<PublicUser | null> {
    const user = await this.userModel.findOne({ email: this.normalizeEmail(email) }).exec();
    return user ? this.toPublicUser(user) : null;
  }

  async findByEmailWithPasswordHash(email: string): Promise<UserWithPasswordHash | null> {
    const user = await this.userModel
      .findOne({ email: this.normalizeEmail(email) })
      .select('+passwordHash')
      .exec();

    return user ? { ...this.toPublicUser(user), passwordHash: user.passwordHash } : null;
  }

  async updateLastLoginAt(userId: string, lastLoginAt: Date): Promise<PublicUser> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { lastLoginAt }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User was not found');
    }

    return this.toPublicUser(user);
  }

  async createUser(input: CreateUserInput): Promise<PublicUser> {
    try {
      const user = await this.userModel.create({
        email: this.normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      });

      return this.toPublicUser(user);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Email is already registered');
      }

      throw error;
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toPublicUser(user: UserDocument): PublicUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      telegramUsername: user.telegramUsername,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
  }
}
