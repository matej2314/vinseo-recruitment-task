import { NotImplementedException } from '@nestjs/common';
import { asExternalMeetingId } from '@vinseo/contracts';

import { StubCalendarMeetingMetadataAdapter } from './stub-calendar-meeting-metadata.adapter.js';

describe('StubCalendarMeetingMetadataAdapter', () => {
  const adapter = new StubCalendarMeetingMetadataAdapter();

  it('throws NotImplementedException (T-11b v0 stub)', async () => {
    await expect(
      adapter.fetch({
        externalMeetingId: asExternalMeetingId('cal-stub-1'),
      }),
    ).rejects.toBeInstanceOf(NotImplementedException);
  });
});
