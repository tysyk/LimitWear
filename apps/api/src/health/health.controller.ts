import { Controller, Get, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  checks: {
    database: 'connected' | 'connecting' | 'disconnecting' | 'disconnected' | 'unavailable';
  };
}

@Controller('health')
export class HealthController {
  constructor(@Optional() @InjectConnection() private readonly connection?: Connection) {}

  @Get()
  check(): HealthResponse {
    const database = this.getDatabaseStatus();

    return {
      status: database === 'disconnected' || database === 'disconnecting' ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV ?? 'development',
      checks: {
        database,
      },
    };
  }

  private getDatabaseStatus(): HealthResponse['checks']['database'] {
    const readyState = this.connection ? Number(this.connection.readyState) : undefined;

    switch (readyState) {
      case 0:
        return 'disconnected';
      case 1:
        return 'connected';
      case 2:
        return 'connecting';
      case 3:
        return 'disconnecting';
      default:
        return 'unavailable';
    }
  }
}
