import { Module } from '@nestjs/common';

import { PipelineModule } from '../pipeline/pipeline.module.js';
import { MeetingProcessWorker } from './meeting-process.worker.js';
import { PgBossService } from './pg-boss.service.js';

@Module({
  imports: [PipelineModule],
  providers: [PgBossService, MeetingProcessWorker],
  exports: [PgBossService],
})
export class JobsModule {}
