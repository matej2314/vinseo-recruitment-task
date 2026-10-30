import type { MeetingSourcePayload } from '@vinseo/contracts';

export const MEETING_SOURCE_PORT = Symbol('MEETING_SOURCE_PORT');

export interface FetchMeetingSourceInput {
  readonly externalMeetingId: string;
  readonly fixtureKey?: string;
}

export interface MeetingSourcePort {
  fetch(input: FetchMeetingSourceInput): Promise<MeetingSourcePayload>;
}
