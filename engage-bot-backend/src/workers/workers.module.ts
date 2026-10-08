import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { RealtimeModule } from '../modules/realtime/realtime.module';
import { IngestionWorker } from './ingestion/ingestion.worker';
import { CommandPublisher } from './jobs/command-publisher';
import { JOBS_QUEUE, JobsProcessor } from './jobs/jobs.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
    }),
    BullModule.registerQueue({ name: JOBS_QUEUE }),
    forwardRef(() => RealtimeModule),
  ],
  providers: [JobsProcessor, IngestionWorker, CommandPublisher],
  exports: [BullModule, IngestionWorker, CommandPublisher],
})
export class WorkersModule {}
