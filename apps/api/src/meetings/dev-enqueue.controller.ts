import { Body, Controller, Post } from '@nestjs/common';

import { DevEnqueueMeetingDto } from './dev-enqueue.dto.js';
import { EnqueueMeetingProcessUseCase } from './enqueue-meeting-process.use-case.js';

/**
 * DX-only: bez sesji cookie. Rejestrowany wyłącznie gdy NODE_ENV !== 'production'.
 * Produkcyjne demo z auth: POST /demo/run-meeting (major Faza 3).
 */
@Controller('dev/meetings')
export class DevEnqueueController {
  constructor(private readonly enqueue: EnqueueMeetingProcessUseCase) {}

  @Post('enqueue')
  enqueueMeeting(@Body() body: DevEnqueueMeetingDto) {
    return this.enqueue.execute({
      fixtureKey: body.fixtureKey,
      requestId: body.requestId,
    });
  }
}
