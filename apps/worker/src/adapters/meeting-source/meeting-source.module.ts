import { Module } from '@nestjs/common';

import { MEETING_SOURCE_PORT } from './meeting-source.port.js';
import { MockMeetingSourceAdapter } from './mock-meeting-source.adapter.js';

@Module({
  providers: [
    MockMeetingSourceAdapter,
    { provide: MEETING_SOURCE_PORT, useExisting: MockMeetingSourceAdapter },
  ],
  exports: [MEETING_SOURCE_PORT],
})
export class MeetingSourceModule {}
