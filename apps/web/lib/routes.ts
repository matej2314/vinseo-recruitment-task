/**
 * Kanoniczne ścieżki UI v1 — docs/frontend.md, SPEC-FRONTEND F-1…F-4, F-10.
 * Brak trasy detail UI (`/meetings/[id]`) w v1.
 */
export const uiRoutes = {
  auth: "/",
  meetings: "/meetings",
  search: "/search",
} as const;

export type UiRoute = (typeof uiRoutes)[keyof typeof uiRoutes];

/** Świadomie poza v1 UI (docs/frontend.md — poza v1). */
export const outOfScopeUiV1 = [
  "branding / design system produktowy",
  "osobna strona detail spotkania jako główna nawigacja",
  "ukrywanie Test za NEXT_PUBLIC_DEMO_UI",
  "chat Q&A / prawdziwa wyszukiwarka",
  "dark mode / PWA / mobile-first polish jako wymóg",
  "Playwright E2E jako must-have",
] as const;
