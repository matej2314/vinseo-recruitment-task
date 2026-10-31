import { Test } from '@nestjs/testing';

import { MEETING_METADATA_PORT } from './meeting-metadata.port.js';
import { MeetingMetadataModule } from './meeting-metadata.module.js';
import { StubCalendarMeetingMetadataAdapter } from './stub-calendar-meeting-metadata.adapter.js';

describe('MeetingMetadataModule (T-11b v0)', () => {
  it('binds MEETING_METADATA_PORT to Calendar stub', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MeetingMetadataModule],
    }).compile();

    const port = moduleRef.get(MEETING_METADATA_PORT);
    expect(port).toBeInstanceOf(StubCalendarMeetingMetadataAdapter);
  });
});
