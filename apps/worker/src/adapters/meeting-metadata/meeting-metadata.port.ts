import type {
  ExternalMeetingId,
  MeetingMetadataPayload,
} from '@vinseo/contracts';

export const MEETING_METADATA_PORT = Symbol('MEETING_METADATA_PORT');

export interface FetchMeetingMetadataInput {
  readonly externalMeetingId: ExternalMeetingId;
}

/**
 * Port metadanych faktu callu (Google Calendar w etapie 1+).
 * v0: zaślepka — bez OAuth / Calendar API.
 * Oddzielony od MeetingSourcePort (treść) i od MeetingRecordingPort (api / K-5b).
 * Zakaz: ekspansja grup Workspace; Calendar ≠ magazyn audio.
 *
 * Etap 1+: GoogleCalendarMeetingMetadataAdapter za MEETING_METADATA_PORT —
 * ten sam kształt MeetingMetadataPayload (w tym `description` pod tag `[record-ok]`);
 * uczestnicy wyłącznie indywidualni.
 */
export interface MeetingMetadataPort {
  fetch(input: FetchMeetingMetadataInput): Promise<MeetingMetadataPayload>;
}
