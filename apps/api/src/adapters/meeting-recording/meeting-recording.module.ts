import { Module } from '@nestjs/common';

import { MEETING_RECORDING_PORT } from './meeting-recording.port.js';
import { MockMeetingRecordingAdapter } from './mock-meeting-recording.adapter.js';

@Module({
  providers: [
    MockMeetingRecordingAdapter,
    {
      provide: MEETING_RECORDING_PORT,
      useExisting: MockMeetingRecordingAdapter,
    },
  ],
  exports: [MEETING_RECORDING_PORT],
})
export class MeetingRecordingModule {}
