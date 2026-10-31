import { Module } from '@nestjs/common';

import { GeminiNotesMeetingSourceAdapter } from './gemini-notes-meeting-source.adapter.js';
import { MEETING_SOURCE_PORT } from './meeting-source.port.js';
import { MockMeetingSourceAdapter } from './mock-meeting-source.adapter.js';

@Module({
  providers: [
    MockMeetingSourceAdapter,
    GeminiNotesMeetingSourceAdapter,
    { provide: MEETING_SOURCE_PORT, useExisting: MockMeetingSourceAdapter },
  ],
  exports: [MEETING_SOURCE_PORT, GeminiNotesMeetingSourceAdapter],
})
export class MeetingSourceModule {}
