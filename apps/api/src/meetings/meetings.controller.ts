import {
  Controller,
  Get,
  Param,
  Query,
  Sse,
  UseGuards,
  type MessageEvent,
} from '@nestjs/common';
import type { Observable } from 'rxjs';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { ListMeetingsQueryDto } from './dto/list-meetings-query.dto.js';
import { GetMeetingRecordingUseCase } from './get-meeting-recording.use-case.js';
import { GetMeetingUseCase } from './get-meeting.use-case.js';
import { ListMeetingsUseCase } from './list-meetings.use-case.js';
import { MeetingEventsService } from './meeting-events.service.js';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(
    private readonly listMeetings: ListMeetingsUseCase,
    private readonly getMeeting: GetMeetingUseCase,
    private readonly getMeetingRecording: GetMeetingRecordingUseCase,
    private readonly events: MeetingEventsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMeetingsQueryDto,
  ) {
    return this.listMeetings.execute(user, query.page, query.limit);
  }

  @Sse(':id/events')
  async eventsStream(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Observable<MessageEvent>> {
    return this.events.stream(user, id);
  }

  /** K-5b — deklaracja przed `@Get(':id')` (spójnie z `:id/events`). */
  @Get(':id/recording')
  recording(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.getMeetingRecording.execute(user, id);
  }

  @Get(':id')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.getMeeting.execute(user, id);
  }
}
