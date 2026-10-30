import { redactSegments } from './redact-segments.js';

describe('redactSegments', () => {
  it('redacts only text, keeps speaker and startMs', () => {
    const result = redactSegments([
      {
        speaker: 'Anna',
        startMs: 0,
        text: 'Kontakt: anna@x.example',
      },
    ]);
    expect(result[0]?.speaker).toBe('Anna');
    expect(result[0]?.startMs).toBe(0);
    expect(result[0]?.text).toContain('[REDACTED_EMAIL]');
  });
});
