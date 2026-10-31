/**
 * Powierzchnia BFF ↔ API - SPEC-KOMUNIKACJA K-6…K-7, docs/dokumentacja_komunikacji.md §2.
 * BFF: proxy + cookie; bez ACL, bez enqueue poza wywołaniem api (Faza 3).
 */
export type BffMethod = "GET" | "POST";

export interface BffSurfaceRoute {
  readonly method: BffMethod;
  readonly bffPath: string;
  readonly apiPath: string;
  readonly notes?: string;
}

export const bffSurface: readonly BffSurfaceRoute[] = [
  { method: "POST", bffPath: "/api/auth/register", apiPath: "/auth/register" },
  { method: "POST", bffPath: "/api/auth/login", apiPath: "/auth/login" },
  { method: "POST", bffPath: "/api/auth/logout", apiPath: "/auth/logout" },
  { method: "GET", bffPath: "/api/auth/me", apiPath: "/auth/me" },
  { method: "POST", bffPath: "/api/auth/refresh", apiPath: "/auth/refresh" },
  { method: "GET", bffPath: "/api/meetings", apiPath: "/meetings" },
  {
    method: "GET",
    bffPath: "/api/meetings/[id]",
    apiPath: "/meetings/:id",
    notes: "API detail; UI v1 bez strony detail",
  },
  {
    method: "GET",
    bffPath: "/api/meetings/[id]/recording",
    apiPath: "/meetings/:id/recording",
    notes: "On-demand JSON { url } (K-5b); ACL tylko w api",
  },
  {
    method: "GET",
    bffPath: "/api/meetings/[id]/events",
    apiPath: "/meetings/:id/events",
    notes: "SSE text/event-stream - żywy proxy w Fazie 3",
  },
  {
    method: "POST",
    bffPath: "/api/demo/run-meeting",
    apiPath: "/demo/run-meeting",
    notes:
      "Body puste lub opcjonalne; UI nie wymaga fixtureKey - losowanie po stronie API (K-5)",
  },
] as const;

export const bffForbidden = [
  "egzekucja ACL treści spotkań",
  "bezpośredni enqueue pg-boss",
  "wołanie adapterów źródła / LlmClient z pominięciem api+worker",
] as const;
