import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { WorkersModule } from '../../workers/workers.module';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';

@Module({
  imports: [BillingModule, WorkersModule],
  controllers: [AudioController],
  providers: [AudioService],
  exports: [AudioService],
})
export class AudioModule {}
