import { asExternalMeetingId } from '@vinseo/contracts';

import {
  MOCK_RECORDING_URL,
  MockMeetingRecordingAdapter,
} from './mock-meeting-recording.adapter.js';

describe('MockMeetingRecordingAdapter', () => {
  it('returns example.com atrapa without depending on externalMeetingId', async () => {
    const adapter = new MockMeetingRecordingAdapter();
    const result = await adapter.resolve({
      externalMeetingId: asExternalMeetingId('any-source-id'),
    });
    expect(result).toEqual({ url: MOCK_RECORDING_URL });
    expect(result.url.startsWith('https://example.com/')).toBe(true);
  });
});
