import type { ExternalMeetingId, FixtureKey, RequestId } from './ids.js';
import type { MeetingSourceKind } from './meeting-source.js';

export const MEETING_PROCESS_JOB_NAME = 'meeting.process' as const;

export interface MeetingProcessJobPayload {
  readonly externalMeetingId: ExternalMeetingId | string;
  readonly source: MeetingSourceKind;
  readonly fixtureKey?: FixtureKey | string;
  readonly requestId?: RequestId | string;
}
