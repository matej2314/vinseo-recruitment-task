import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EnqueueMeetingProcessUseCase } from './enqueue-meeting-process.use-case.js';
import { GetMeetingUseCase } from './get-meeting.use-case.js';
import { ListMeetingsUseCase } from './list-meetings.use-case.js';
import { MeetingEventsService } from './meeting-events.service.js';
import { MeetingsController } from './meetings.controller.js';

@Module({
  imports: [JobsModule, PrismaModule, AccessModule, AuthModule, AuditModule],
  providers: [
    EnqueueMeetingProcessUseCase,
    ListMeetingsUseCase,
    GetMeetingUseCase,
    MeetingEventsService,
  ],
  controllers: [MeetingsController],
  exports: [EnqueueMeetingProcessUseCase],
})
export class MeetingsModule {}
