# Adaptery workera (I/O)

## Obecna wersja (etap 0 / v0)

| Port | Token / klasa | Implementacja |
|------|---------------|---------------|
| Treść | `MEETING_SOURCE_PORT` | `MockMeetingSourceAdapter` (happy-path demo) |
| Treść (powierzchnia) | `GeminiNotesMeetingSourceAdapter` | zaślepka `NotImplemented` — **nie** domyślny token |
| Metadane | `MEETING_METADATA_PORT` | `StubCalendarMeetingMetadataAdapter` — zaślepka; **nie** wołana z orchestratora |
| LLM | `LLM_CLIENT_PORT` | mock |

On-demand nagranie FF (K-5b) żyje w **`apps/api`**, nie tutaj. Gałąź **bez** `[record-ok]` nie używa mechanizmu nagrania FF.

## Etap 1+ (ta sama powierzchnia portów)

1. Calendar API za `MEETING_METADATA_PORT` (tytuł, czas, `description`, uczestnicy indywidualni; bez ekspansji grup).
2. Zgoda na nagrywanie = obecność tagu **`[record-ok]`** w `description` (`calendarDescriptionAllowsRecording` w `@vinseo/contracts`). Jest tag → `fireflies`; **brak tagu** → `gemini-notes` (bezpieczny default).
3. Gdy Notes zwraca tekst → redakcja + UC1; gdy brak materiału → metadata-only (P-4a) — **sam** brak tagu ≠ metadata-only.
4. Pola zgody / `contentSource` w schemacie przy adapterach prod (`SPEC-DANE` D-7c) — nie w zaślepce v0.
5. Zakaz fat-adaptera Calendar+FF+Notes; Calendar ≠ audio.
