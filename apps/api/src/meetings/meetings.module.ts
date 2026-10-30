import { Module, type DynamicModule } from '@nestjs/common';

import { JobsModule } from '../jobs/jobs.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DevEnqueueController } from './dev-enqueue.controller.js';
import { EnqueueMeetingProcessUseCase } from './enqueue-meeting-process.use-case.js';

@Module({})
export class MeetingsModule {
  static register(): DynamicModule {
    return {
      module: MeetingsModule,
      imports: [JobsModule, PrismaModule],
      providers: [EnqueueMeetingProcessUseCase],
      controllers:
        process.env.NODE_ENV === 'production' ? [] : [DevEnqueueController],
    };
  }
}
