import { Module } from '@nestjs/common';

import { MEETING_METADATA_PORT } from './meeting-metadata.port.js';
import { StubCalendarMeetingMetadataAdapter } from './stub-calendar-meeting-metadata.adapter.js';

@Module({
  providers: [
    StubCalendarMeetingMetadataAdapter,
    {
      provide: MEETING_METADATA_PORT,
      useExisting: StubCalendarMeetingMetadataAdapter,
    },
  ],
  exports: [MEETING_METADATA_PORT, StubCalendarMeetingMetadataAdapter],
})
export class MeetingMetadataModule {}
