import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @AllowAnonymous()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({
    description: 'API process is up',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'tokinomo-backend' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  check() {
    return this.healthService.check();
  }
}
