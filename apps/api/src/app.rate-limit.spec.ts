import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { createRateLimitMiddleware, getRateLimitConfig } from './app.rate-limit';

interface MockResponse {
  json: jest.Mock;
  response: Response;
  setHeader: jest.Mock;
  status: jest.Mock;
}

describe('app rate limit helpers', () => {
  const createConfigService = (values: Record<string, string | undefined>) =>
    ({
      get: jest.fn((key: string) => values[key]),
    }) as unknown as ConfigService;

  it('uses safe defaults', () => {
    expect(getRateLimitConfig(createConfigService({}))).toEqual({
      enabled: true,
      maxRequests: 300,
      windowMs: 60_000,
    });
  });

  it('supports env overrides and explicit disable', () => {
    expect(
      getRateLimitConfig(
        createConfigService({
          RATE_LIMIT_ENABLED: 'false',
          RATE_LIMIT_MAX: '10',
          RATE_LIMIT_WINDOW_MS: '5000',
        }),
      ),
    ).toEqual({
      enabled: false,
      maxRequests: 10,
      windowMs: 5000,
    });
  });

  it('allows requests within the configured window', () => {
    const middleware = createRateLimitMiddleware({
      enabled: true,
      maxRequests: 2,
      windowMs: 60_000,
    });
    const response = createResponse();
    const next = jest.fn();

    middleware(createRequest('203.0.113.10'), response.response, next);
    middleware(createRequest('203.0.113.10'), response.response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(response.status).not.toHaveBeenCalled();
    expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Limit', '2');
    expect(response.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', '0');
  });

  it('blocks requests over the configured limit', () => {
    const middleware = createRateLimitMiddleware({
      enabled: true,
      maxRequests: 1,
      windowMs: 60_000,
    });
    const response = createResponse();
    const next = jest.fn();

    middleware(createRequest('203.0.113.20'), response.response, next);
    middleware(createRequest('203.0.113.20'), response.response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 429,
      message: 'Too many requests. Try again later.',
    });
  });

  it('tracks clients independently by forwarded IP', () => {
    const middleware = createRateLimitMiddleware({
      enabled: true,
      maxRequests: 1,
      windowMs: 60_000,
    });
    const response = createResponse();
    const next = jest.fn();

    middleware(createRequest('203.0.113.30'), response.response, next);
    middleware(createRequest('203.0.113.31'), response.response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(response.status).not.toHaveBeenCalled();
  });
});

function createRequest(ip: string): Request {
  return {
    headers: {
      'x-forwarded-for': ip,
    },
    ip,
    socket: {
      remoteAddress: ip,
    },
  } as unknown as Request;
}

function createResponse(): MockResponse {
  const setHeader = jest.fn();
  const status = jest.fn();
  const json = jest.fn();
  const response = {
    setHeader,
    status,
    json,
  };
  status.mockReturnValue(response);
  json.mockReturnValue(response);

  return {
    json,
    response: response as unknown as Response,
    setHeader,
    status,
  };
}
