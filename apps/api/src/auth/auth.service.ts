import { Injectable, NotImplementedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  register(registerDto: RegisterDto): never {
    void registerDto;
    throw new NotImplementedException('POST /auth/register will be implemented in LW-012');
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
}
