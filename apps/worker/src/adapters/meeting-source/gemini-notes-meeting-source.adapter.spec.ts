import { NotImplementedException } from '@nestjs/common';

import { GeminiNotesMeetingSourceAdapter } from './gemini-notes-meeting-source.adapter.js';

describe('GeminiNotesMeetingSourceAdapter', () => {
  const adapter = new GeminiNotesMeetingSourceAdapter();

  it('throws NotImplementedException (T-11b v0 stub)', async () => {
    await expect(
      adapter.fetch({ externalMeetingId: 'notes-stub-1' }),
    ).rejects.toBeInstanceOf(NotImplementedException);
  });
});
