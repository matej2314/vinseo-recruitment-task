import type { MeetingSourcePayload } from '@vinseo/contracts';

export const MEETING_SOURCE_PORT = Symbol('MEETING_SOURCE_PORT');

export interface FetchMeetingSourceInput {
  readonly externalMeetingId: string;
  readonly fixtureKey?: string;
}

/**
 * Port źródła **treści** (K-12) — mock \| fireflies \| gemini-notes.
 * v0 happy-path: MockMeetingSourceAdapter za MEETING_SOURCE_PORT.
 * v0 powierzchnia: GeminiNotesMeetingSourceAdapter (zaślepka; nie domyślny token).
 * Etap 1+: wybór adaptera wg `[record-ok]` w opisie Calendar — fireflies (tag) \| gemini-notes (brak);
 * UC1 gdy tekst; metadata-only gdy brak materiału (P-4a). Oddzielony od
 * MEETING_METADATA_PORT (Calendar) i od recording K-5b (tylko przy `[record-ok]`).
 */
export interface MeetingSourcePort {
  fetch(input: FetchMeetingSourceInput): Promise<MeetingSourcePayload>;
}
