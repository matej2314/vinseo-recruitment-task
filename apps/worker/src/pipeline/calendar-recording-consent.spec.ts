import {
  RECORD_OK_TAG,
  calendarDescriptionAllowsRecording,
} from '@vinseo/contracts';

describe('calendarDescriptionAllowsRecording', () => {
  it('returns false for null, undefined, and empty description', () => {
    expect(calendarDescriptionAllowsRecording(null)).toBe(false);
    expect(calendarDescriptionAllowsRecording(undefined)).toBe(false);
    expect(calendarDescriptionAllowsRecording('')).toBe(false);
  });

  it('returns false when tag is absent', () => {
    expect(
      calendarDescriptionAllowsRecording('Spotkanie z klientem — agenda w Doc'),
    ).toBe(false);
  });

  it('returns true when [record-ok] appears anywhere (case-insensitive)', () => {
    expect(
      calendarDescriptionAllowsRecording(`Agenda\n\n${RECORD_OK_TAG}`),
    ).toBe(true);
    expect(calendarDescriptionAllowsRecording('[Record-OK] notatki')).toBe(
      true,
    );
    expect(
      calendarDescriptionAllowsRecording('prefix [record-ok] suffix'),
    ).toBe(true);
  });
});
