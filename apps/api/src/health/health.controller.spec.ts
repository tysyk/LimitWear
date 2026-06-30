import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns an ok status with runtime checks', () => {
    const response = controller.check();

    expect(typeof response.timestamp).toBe('string');
    expect(typeof response.uptimeSeconds).toBe('number');
    expect(response).toMatchObject({
      status: 'ok',
      environment: process.env.NODE_ENV ?? 'development',
      checks: {
        database: 'unavailable',
      },
    });
  });

  it('reports degraded status when the database is disconnected', () => {
    const disconnectedController = new HealthController({ readyState: 0 } as never);
    const response = disconnectedController.check();

    expect(typeof response.timestamp).toBe('string');
    expect(typeof response.uptimeSeconds).toBe('number');
    expect(response).toMatchObject({
      status: 'degraded',
      environment: process.env.NODE_ENV ?? 'development',
      checks: {
        database: 'disconnected',
      },
    });
  });
});
