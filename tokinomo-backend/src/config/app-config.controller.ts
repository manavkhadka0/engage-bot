import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('config')
@Controller('config')
export class AppConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get('public')
  @AllowAnonymous()
  @ApiOperation({ summary: 'Public client config (no secrets)' })
  @ApiOkResponse({ description: 'Safe public settings for the frontend' })
  publicConfig() {
    return {
      appName: 'Tokinomo',
      apiUrl: this.config.get<string>('app.appUrl'),
      frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
      authBasePath: '/api/auth',
      features: {
        emailVerification: true,
        organizations: true,
        realtime: true,
      },
    };
  }
}
