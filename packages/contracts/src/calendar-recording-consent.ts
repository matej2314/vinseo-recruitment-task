/**
 * Tag w opisie wydarzenia Google Calendar (pole `description`).
 * Obecność → ścieżka Fireflies (nagrywanie); brak → Notes by Gemini.
 * Match case-insensitive; token może wystąpić w dowolnym miejscu opisu.
 */
export const RECORD_OK_TAG = '[record-ok]' as const;

const RECORD_OK_PATTERN = /\[record-ok\]/i;

/**
 * Czy opis eventu Calendar zezwala na ścieżkę nagrywania (Fireflies).
 * Brak / pusty opis = brak zgody na nagrywanie (bezpieczny default).
 */
export const calendarDescriptionAllowsRecording = (
  description: string | null | undefined,
): boolean => {
  if (description == null || description.length === 0) {
    return false;
  }
  return RECORD_OK_PATTERN.test(description);
};
