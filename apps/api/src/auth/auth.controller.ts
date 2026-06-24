import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AUTH_COOKIE_NAME, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Log in and set the session cookie' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const { cookieOptions, sessionToken, user } = await this.authService.login(loginDto);
    response.cookie(AUTH_COOKIE_NAME, sessionToken, cookieOptions);

    return { user };
  }

  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({ summary: 'Log out the current user' })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout() {
    return this.authService.logout();
  }

  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({ summary: 'Get the current user' })
  @Get('me')
  me() {
    return this.authService.getCurrentUser();
  }
}
