const PLACEHOLDERS = {
  email: "[REDACTED_EMAIL]",
  phone: "[REDACTED_PHONE]",
  nationalId: "[REDACTED_NATIONAL_ID]",
  card: "[REDACTED_CARD]",
} as const;

/** E - adresy e-mail */
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

/**
 * T - telefony (węższy wzorzec: +48 / 00… oraz xxx-xxx-xxx / xxx xxx xxx).
 * Świadomie nie łapie „50k” / krótkich liczb bez separatorów telefonu.
 */
const PHONE_RE =
  /(?:\+|00)\d{1,3}(?:[\s-]?\d{2,4}){2,5}|\b\d{3}[\s-]\d{3}[\s-]\d{3}\b/g;

/** P - PESEL (11 cyfr) / numer dowodu (3 litery + 6 cyfr) */
const PESEL_RE = /\b\d{11}\b/g;
const ID_CARD_RE = /\b[A-Z]{3}\s?\d{6}\b/gi;

/** K - PAN karty (13–19 cyfr); Luhn przy matchu ciągłym */
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;

function luhnOk(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function redactText(input: string): string {
  let out = input.replace(EMAIL_RE, PLACEHOLDERS.email);
  out = out.replace(PHONE_RE, PLACEHOLDERS.phone);
  out = out.replace(PESEL_RE, PLACEHOLDERS.nationalId);
  out = out.replace(ID_CARD_RE, PLACEHOLDERS.nationalId);
  out = out.replace(CARD_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return match;
    if (!luhnOk(digits)) return match;
    return PLACEHOLDERS.card;
  });
  return out;
}

export function redactTextIdempotent(input: string): string {
  return redactText(redactText(input));
}
