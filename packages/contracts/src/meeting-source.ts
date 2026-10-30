export type MeetingSourceKind = "mock";

export interface SourceParticipant {
  readonly email: string | null;
  readonly displayName: string;
  readonly internal: boolean;
}

export interface SourceSegment {
  readonly speaker: string;
  readonly text: string;
  readonly startMs: number;
}

/** Port źródła (K-12) - bez pól summary vendora. */
export interface MeetingSourcePayload {
  readonly externalId: string;
  readonly title: string;
  readonly startedAt: string;
  readonly participants: readonly SourceParticipant[];
  readonly segments: readonly SourceSegment[];
}
