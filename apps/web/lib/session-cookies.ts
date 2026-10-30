/**
 * Nazwy cookie sesji - zgodne z apps/api `auth-cookies.ts`
 * (SPEC-AUTH_I_ACL: access + refresh HttpOnly).
 */
export const ACCESS_COOKIE = "ma_access" as const;
export const REFRESH_COOKIE = "ma_refresh" as const;

export const SESSION_COOKIE_NAMES = [ACCESS_COOKIE, REFRESH_COOKIE] as const;

export type SessionCookieName = (typeof SESSION_COOKIE_NAMES)[number];
