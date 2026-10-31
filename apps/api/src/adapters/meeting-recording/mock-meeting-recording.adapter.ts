import { Injectable } from '@nestjs/common';
import type { MeetingRecordingDto } from '@vinseo/contracts';

import type {
  MeetingRecordingPort,
  ResolveMeetingRecordingInput,
} from './meeting-recording.port.js';

/** Atrapa v0 — zgodna z docs 1.2a / K-5b; bez HTTP do vendora. */
export const MOCK_RECORDING_URL = 'https://example.com/demo-recording';

/**
 * Mock resolve on-demand. `externalMeetingId` jest częścią kontraktu portu
 * (tożsamość źródła); w v0 atrapa jest stała niezależnie od id.
 * Podmiana: FirefliesMeetingRecordingAdapter za MEETING_RECORDING_PORT —
 * bez zmiany kształtu MeetingRecordingDto / HTTP.
 */
@Injectable()
export class MockMeetingRecordingAdapter implements MeetingRecordingPort {
  async resolve(
    _input: ResolveMeetingRecordingInput,
  ): Promise<MeetingRecordingDto> {
    return { url: MOCK_RECORDING_URL };
  }
}
