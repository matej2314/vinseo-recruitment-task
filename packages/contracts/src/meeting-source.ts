/**
 * v0: wyłącznie `mock` w payloadzie joba.
 * Etap 1+: rozszerzenie o `fireflies` | `gemini-notes` przy egzekucji zgody
 * (bez zmiany nazwy joba `meeting.process` — K-12a / P-2).
 */
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
