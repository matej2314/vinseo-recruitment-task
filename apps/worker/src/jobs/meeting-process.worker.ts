import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  MEETING_PROCESS_JOB_NAME,
  type MeetingProcessJobPayload,
} from '@vinseo/contracts';

import { MeetingProcessOrchestrator } from '../pipeline/meeting-process.orchestrator.js';
import { PgBossService } from './pg-boss.service.js';

@Injectable()
export class MeetingProcessWorker implements OnModuleInit {
  private readonly logger = new Logger(MeetingProcessWorker.name);

  constructor(
    private readonly boss: PgBossService,
    private readonly orchestrator: MeetingProcessOrchestrator,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.boss.client.work(MEETING_PROCESS_JOB_NAME, async (jobs) => {
      for (const job of jobs) {
        const data = job.data as MeetingProcessJobPayload;
        this.logger.log(
          `Processing ${MEETING_PROCESS_JOB_NAME} job=${job.id}`,
        );
        await this.orchestrator.run(data);
      }
    });
  }
}
