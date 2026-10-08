import { Module } from '@nestjs/common';
import { WorkersModule } from '../../workers/workers.module';
import { DeviceSimulatorService } from './device-simulator.service';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [WorkersModule],
  controllers: [DevicesController],
  providers: [DevicesService, DeviceSimulatorService],
  exports: [DevicesService, DeviceSimulatorService],
})
export class DevicesModule {}
