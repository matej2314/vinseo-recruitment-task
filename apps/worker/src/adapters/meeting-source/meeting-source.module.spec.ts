import { Test } from '@nestjs/testing';

import { GeminiNotesMeetingSourceAdapter } from './gemini-notes-meeting-source.adapter.js';
import { MEETING_SOURCE_PORT } from './meeting-source.port.js';
import { MeetingSourceModule } from './meeting-source.module.js';
import { MockMeetingSourceAdapter } from './mock-meeting-source.adapter.js';

describe('MeetingSourceModule (T-11b v0)', () => {
  it('binds MEETING_SOURCE_PORT to mock; registers gemini-notes stub class', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MeetingSourceModule],
    }).compile();

    const port = moduleRef.get(MEETING_SOURCE_PORT);
    expect(port).toBeInstanceOf(MockMeetingSourceAdapter);
    expect(port).not.toBeInstanceOf(GeminiNotesMeetingSourceAdapter);

    const gemini = moduleRef.get(GeminiNotesMeetingSourceAdapter);
    expect(gemini).toBeInstanceOf(GeminiNotesMeetingSourceAdapter);
  });
});
