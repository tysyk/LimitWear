import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@limitwear/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { PublicUser, UsersService } from '../src/users/users.service';
import { AUTH_COOKIE_NAME, AuthService } from '../src/auth/auth.service';
import { AuthController } from '../src/auth/auth.controller';
import { AuthGuard } from '../src/auth/guards/auth.guard';

interface AuthPayload {
  email: string;
  firstName?: string;
  password: string;
}

interface AuthCookieOptions {
  httpOnly: boolean;
  maxAge: number;
  path: string;
  sameSite: 'lax';
  secure: boolean;
}

interface LoginResult {
  cookieOptions: AuthCookieOptions;
  sessionToken: string;
  user: PublicUser;
}

interface AuthServiceMock {
  getCurrentUser: jest.Mock<{ user: PublicUser }, [PublicUser]>;
  login: jest.Mock<Promise<LoginResult>, [AuthPayload]>;
  logout: jest.Mock<
    {
      cookieOptions: AuthCookieOptions;
    },
    []
  >;
  register: jest.Mock<Promise<{ user: PublicUser }>, [AuthPayload]>;
}

describe('AuthController (e2e)', () => {
  const publicUser: PublicUser = {
    id: 'user-id',
    email: 'user@example.com',
    role: UserRole.User,
    permissions: [],
    status: UserStatus.Active,
    firstName: 'Test',
    lastName: 'User',
    isEmailVerified: false,
    isPhoneVerified: false,
  };

  let app: INestApplication<App>;
  let authService: AuthServiceMock;
  let jwtService: {
    verifyAsync: jest.Mock;
  };
  let usersService: {
    findById: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      getCurrentUser: jest.fn((user: PublicUser) => ({ user })),
      login: jest.fn<Promise<LoginResult>, [AuthPayload]>().mockResolvedValue({
        user: publicUser,
        sessionToken: 'session-token',
        cookieOptions: {
          httpOnly: true,
          maxAge: 604800000,
          path: '/',
          sameSite: 'lax',
          secure: false,
        },
      }),
      logout: jest.fn<{ cookieOptions: AuthCookieOptions }, []>().mockReturnValue({
        cookieOptions: {
          httpOnly: true,
          maxAge: 604800000,
          path: '/',
          sameSite: 'lax',
          secure: false,
        },
      }),
      register: jest.fn<Promise<{ user: PublicUser }>, [AuthPayload]>().mockResolvedValue({
        user: publicUser,
      }),
    };
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-id' }),
    };
    usersService = {
      findById: jest.fn().mockResolvedValue(publicUser),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers a user', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'user@example.com',
        password: 'Password1',
        firstName: 'Test',
      })
      .expect(201)
      .expect({
        user: publicUser,
      });

    expect(authService.register.mock.calls[0][0]).toEqual({
      email: 'user@example.com',
      password: 'Password1',
      firstName: 'Test',
    });
  });

  it('logs in and sets the session cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'Password1',
      })
      .expect(200)
      .expect({
        user: publicUser,
      });

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining(`${AUTH_COOKIE_NAME}=session-token`)]),
    );
  });

  it('returns the current user for an authenticated request', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=session-token`])
      .expect(200)
      .expect({
        user: publicUser,
      });

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('session-token');
    expect(usersService.findById).toHaveBeenCalledWith('user-id');
  });

  it('rejects protected routes without the session cookie', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);

    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('logs out and clears the session cookie', async () => {
    const response = await request(app.getHttpServer()).post('/auth/logout').expect(200).expect({
      success: true,
    });

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining(`${AUTH_COOKIE_NAME}=`)]),
    );
    expect(authService.logout).toHaveBeenCalled();
  });
});
