import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MEETING_PROCESS_JOB_NAME } from '@vinseo/contracts';
import PgBoss from 'pg-boss';

import type { ApiEnv } from '../config/env.schema.js';

@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name);
  private boss: PgBoss | null = null;

  constructor(private readonly config: ConfigService<ApiEnv, true>) {}

  get client(): PgBoss {
    if (!this.boss) {
      throw new Error('PgBoss not started');
    }
    return this.boss;
  }

  async onModuleInit(): Promise<void> {
    const connectionString = this.config.get('DATABASE_URL', { infer: true });
    this.boss = new PgBoss(connectionString);
    this.boss.on('error', (err: Error) => {
      this.logger.error(err);
    });
    await this.boss.start();
    await this.boss.createQueue(MEETING_PROCESS_JOB_NAME);
    this.logger.log(`pg-boss started; queue ${MEETING_PROCESS_JOB_NAME}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.boss?.stop();
  }
}
