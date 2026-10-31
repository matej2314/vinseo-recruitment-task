/**
 * Port metadanych Calendar (K-12) — fakt callu / uczestnicy indywidualni.
 * Bez segmentów transcriptu i bez media URL (≠ MeetingSourcePayload, ≠ recording).
 */
export interface MeetingMetadataParticipant {
  readonly email: string | null;
  readonly displayName: string;
  readonly internal: boolean;
}

export interface MeetingMetadataPayload {
  readonly externalId: string;
  readonly title: string;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly participants: readonly MeetingMetadataParticipant[];
}
