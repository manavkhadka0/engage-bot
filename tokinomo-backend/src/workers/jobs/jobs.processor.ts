import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export const JOBS_QUEUE = 'tokinomo-jobs';

export type JobName = 'audio-push-fanout' | 'offline-sweep' | 'nightly-rollups';

@Processor(JOBS_QUEUE)
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  async process(job: Job<{ type?: JobName }>): Promise<void> {
    this.logger.log(`job ${job.name} id=${job.id}`);
    // Implementations land with MQTT / Timescale continuous aggregates.
  }
}
