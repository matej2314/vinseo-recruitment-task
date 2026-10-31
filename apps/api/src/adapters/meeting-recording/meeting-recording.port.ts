import type { ExternalMeetingId, MeetingRecordingDto } from '@vinseo/contracts';

export const MEETING_RECORDING_PORT = Symbol('MEETING_RECORDING_PORT');

export interface ResolveMeetingRecordingInput {
  readonly externalMeetingId: ExternalMeetingId;
}

/**
 * Port on-demand URL nagrania (poza pipeline transcript / MeetingSourcePort).
 * v0: mock; później: adapter Fireflies — ten sam kontrakt wyjścia { url }.
 */
export interface MeetingRecordingPort {
  resolve(
    input: ResolveMeetingRecordingInput,
  ): Promise<MeetingRecordingDto>;
}
