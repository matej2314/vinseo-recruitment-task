import {
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { DemoRunMeetingResponseDto } from '@vinseo/contracts';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { EnqueueMeetingProcessUseCase } from '../meetings/enqueue-meeting-process.use-case.js';
import { RunMeetingDto } from './dto/run-meeting.dto.js';

@Controller('demo')
@UseGuards(JwtAuthGuard)
export class DemoController {
  constructor(private readonly enqueue: EnqueueMeetingProcessUseCase) {}

  @Post('run-meeting')
  async runMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RunMeetingDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<DemoRunMeetingResponseDto> {
    // bez DEMO_ENABLED (K-5)
    const result = await this.enqueue.execute({
      fixtureKey: body.fixtureKey,
      requestId,
      organizerId: user.id,
    });
    return {
      meetingId: result.meetingId,
      jobId: result.jobId,
      status: 'pending',
    };
  }
}
