import { Module } from '@nestjs/common';

import { LlmModule } from './adapters/llm/llm.module.js';
import { MeetingSourceModule } from './adapters/meeting-source/meeting-source.module.js';
import { AppConfigModule } from './config/config.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { PipelineModule } from './pipeline/pipeline.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    MeetingSourceModule,
    LlmModule,
    PipelineModule,
    JobsModule,
  ],
})
export class AppModule {}
