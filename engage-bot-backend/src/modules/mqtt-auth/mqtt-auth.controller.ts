import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { MqttAuthService } from './mqtt-auth.service';

/**
 * Called by EMQX's HTTP authentication/authorization sources, not by any
 * user — unauthenticated on purpose, and not part of the public API surface.
 */
@ApiExcludeController()
@Controller('mqtt')
export class MqttAuthController {
  constructor(private readonly mqttAuth: MqttAuthService) {}

  @Post('auth')
  @AllowAnonymous()
  @HttpCode(200)
  async auth(@Body() body: { username?: string; password?: string }) {
    const { allow, superuser } = await this.mqttAuth.authenticate(
      body.username,
      body.password,
    );
    return allow ? { result: 'allow', is_superuser: !!superuser } : { result: 'deny' };
  }

  @Post('acl')
  @AllowAnonymous()
  @HttpCode(200)
  async acl(@Body() body: { username?: string; topic?: string; action?: string }) {
    const allow = await this.mqttAuth.authorize(
      body.username,
      body.topic,
      body.action,
    );
    return { result: allow ? 'allow' : 'deny' };
  }
}
