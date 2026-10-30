import { Module } from '@nestjs/common';

import { DevEnqueueController } from './dev-enqueue.controller.js';
import { MeetingsModule } from './meetings.module.js';

/**
 * DX-only: POST /dev/meetings/enqueue bez sesji.
 * Importowany w AppModule wyłącznie gdy NODE_ENV !== 'production'.
 */
@Module({
  imports: [MeetingsModule],
  controllers: [DevEnqueueController],
})
export class DevMeetingsModule {}
