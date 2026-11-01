import { Injectable, NotImplementedException } from '@nestjs/common';
import type { MeetingSourcePayload } from '@vinseo/contracts';

import type {
  FetchMeetingSourceInput,
  MeetingSourcePort,
} from './meeting-source.port.js';

/**
 * Zaślepka v0 adaptera treści `gemini-notes` (Notes by Gemini / Meet).
 * Nie jest domyślnym MEETING_SOURCE_PORT — happy-path pozostaje na mocku.
 * Zakaz: audio / recording FF; fat-adapter z Calendar.
 *
 * Etap 1+: prawdziwy klient Notes — ten sam MeetingSourcePort / MeetingSourcePayload;
 * wybór vs fireflies: brak `[record-ok]` w opisie Calendar → ten adapter (P-2a);
 * puste Notes → metadata-only (P-4a).
 */
@Injectable()
export class GeminiNotesMeetingSourceAdapter implements MeetingSourcePort {
  async fetch(_input: FetchMeetingSourceInput): Promise<MeetingSourcePayload> {
    throw new NotImplementedException(
      'gemini-notes meeting source is a v0 stub; Google Meet / Notes API lands in stage 1+',
    );
  }
}
