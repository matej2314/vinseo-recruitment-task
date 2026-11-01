/**
 * Port metadanych Calendar (K-12) — fakt callu / uczestnicy indywidualni.
 * Bez segmentów transcriptu i bez media URL (≠ MeetingSourcePayload, ≠ recording).
 * `description` — opis wydarzenia (m.in. tag `[record-ok]` → zgoda na FF; brak = Gemini Notes).
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
  /** Opis wydarzenia Calendar; źródło sygnału `[record-ok]` (etap 1+). */
  readonly description?: string | null;
  readonly participants: readonly MeetingMetadataParticipant[];
}
