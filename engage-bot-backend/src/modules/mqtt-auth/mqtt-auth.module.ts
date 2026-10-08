import { Module } from '@nestjs/common';
import { MqttAuthController } from './mqtt-auth.controller';
import { MqttAuthService } from './mqtt-auth.service';

@Module({
  controllers: [MqttAuthController],
  providers: [MqttAuthService],
})
export class MqttAuthModule {}
