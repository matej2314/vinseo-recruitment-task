import { redactText, redactTextIdempotent } from './redact-text.js';

describe('redactText E+T+P+K', () => {
  it('masks email (E)', () => {
    expect(redactText('mail anna.budget@vinseo.example end')).toContain(
      '[REDACTED_EMAIL]',
    );
    expect(redactText('mail anna.budget@vinseo.example end')).not.toContain(
      'anna.budget@vinseo.example',
    );
  });

  it('masks phone (T)', () => {
    const out = redactText('dzwoń +48 600 100 200 proszę');
    expect(out).toContain('[REDACTED_PHONE]');
    expect(out).not.toContain('600 100 200');
  });

  it('does not mask short budget amounts as phone', () => {
    const out = redactText('budget 50k PLN na Brand Lift');
    expect(out).toBe('budget 50k PLN na Brand Lift');
    expect(out).not.toContain('[REDACTED_PHONE]');
  });

  it('masks PESEL-like (P)', () => {
    const out = redactText('PESEL 44051401359');
    expect(out).toContain('[REDACTED_NATIONAL_ID]');
    expect(out).not.toContain('44051401359');
  });

  it('masks Luhn-valid card (K)', () => {
    const out = redactText('karta 4111111111111111');
    expect(out).toContain('[REDACTED_CARD]');
    expect(out).not.toContain('4111111111111111');
  });

  it('is idempotent on already redacted text', () => {
    const once = redactText(
      'a@b.co +48 600 100 200 44051401359 4111111111111111',
    );
    expect(redactTextIdempotent(once)).toBe(once);
  });
});
