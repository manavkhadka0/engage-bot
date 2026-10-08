import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  check() {
    return {
      status: 'ok' as const,
      service: 'engage-bot-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
