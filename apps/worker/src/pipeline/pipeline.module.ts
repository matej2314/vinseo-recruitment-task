import { Module } from '@nestjs/common';

import { LlmModule } from '../adapters/llm/llm.module.js';
import { MeetingSourceModule } from '../adapters/meeting-source/meeting-source.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MeetingProcessOrchestrator } from './meeting-process.orchestrator.js';
import { MeetingRepository } from './meeting-repository.js';
import { SummarizeMeetingUseCase } from './summarize-meeting.use-case.js';

@Module({
  imports: [PrismaModule, MeetingSourceModule, LlmModule],
  providers: [
    MeetingRepository,
    SummarizeMeetingUseCase,
    MeetingProcessOrchestrator,
  ],
  exports: [MeetingProcessOrchestrator],
})
export class PipelineModule {}
