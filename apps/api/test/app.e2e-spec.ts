import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthResponse } from '../src/health/health.controller';
import { HealthModule } from './../src/health/health.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((response) => {
        const body = response.body as HealthResponse;

        expect(typeof body.timestamp).toBe('string');
        expect(typeof body.uptimeSeconds).toBe('number');
        expect(typeof body.environment).toBe('string');
        expect(body).toMatchObject({
          status: 'ok',
          checks: {
            database: 'unavailable',
          },
        });
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
