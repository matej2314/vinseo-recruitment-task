# Vinseo Recruitment Task — feature plan: Faza 3 frontend (UI v1 ↔ API)

**Lokalizacja:** `feature-plans/vinseo-recruitment-task_feature_plan_frontend-faza-3-ui-v1-api.md`  
**Kotwica major:** `vinseo-recruitment-task-frontend_major-plan.md` — **Faza 3** (kroki 3.1–3.5), do **MILESTONE — Panel v1 działa z API**.  
**Zależność zewnętrzna (już domknięta):** `vinseo-recruitment-task-backend_major-plan.md` — Faza 3 `WYKONANY` + MILESTONE „API sesji i ACL gotowe pod front” `OSIĄGNIĘTY`.  
**Źródła:** `docs/frontend.md`, `docs/data_flow.md`, `docs/dokumentacja_komunikacji.md`, `spec/SPEC-FRONTEND.md`, `spec/SPEC-KOMUNIKACJA.md`, `spec/SPEC-AUTH_I_ACL.md`, `spec/SPEC-TESTY.md`.  
**Kod bazowy:** `apps/web` (Next.js `16.4.3`, React `19`, Tailwind `4`, shadcn/ui, `strict: true`) + kontrakty `@vinseo/contracts`.  
**Statusy kroków feature:** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`

---

## Meta

| Pole | Wartość |
|------|---------|
| Wycinek | Żywe spięcie UI v1 z API: sesja cookie przez BFF, tabela + paginacja, Test + SSE, mock wyszukiwarki |
| Major | Faza 3 (3.1–3.5); kolejność `KROK` w tym pliku ≠ numeracja major (pass rozwojowy) |
| Pass rozwojowy | Helper BFF → auth BFF (K-6a) → auth UI/ochrona → meetings UI → Test/SSE → mock/security |
| Poza zakresem wycinka | Faza 4–5 frontu (smoke CI / README / polish), branding, Playwright, React Query, trasa detail UI, prawdziwa wyszukiwarka/LLM, ACL w BFF |
| Biblioteki (research) | Context7 `/vercel/next.js/v16.2.9` + lokalne `apps/web/node_modules/next/dist/docs/`: Route Handlers (`cookies`, `Set-Cookie`), `params: Promise<…>`, **`proxy.ts`** (middleware deprecated), streaming `Response` body; SPEC wygrywa przy konflikcie |

### Założenia stacku (odwołania, bez przepisywania SPEC)

- Next.js App Router + BFF w `app/api/*` — `SPEC-FRONTEND` F-13…F-14, `SPEC-KOMUNIKACJA` K-6…K-7.
- Sesja wyłącznie cookie HttpOnly (`ma_access`, `ma_refresh` — te same nazwy co `apps/api`); **zakaz** Web Storage na tokeny — F-15 / `SPEC-AUTH_I_ACL`.
- BFF: cienkie proxy; **jedyny** wyjątek domenowy UI-only: `passwordConfirm` na register (K-6a).
- Data-fetching: natywny `fetch` (F-9); SSE klient: `EventSource` wobec BFF (F-8).
- Typowanie: `strict` z `apps/web/tsconfig.json`; brak `any` na granicach; `import type` dla typów; importy: framework (`next`, `next/*`) najpierw w grupie wartości; DTO z `@vinseo/contracts`.
- `API_BASE_URL` tylko server-side (`apps/web/.env.example`); **bez** `NEXT_PUBLIC_` na URL API / sekrety (F-16).

### Mapa tras UI (kanon)

| URL | Rola v1 |
|-----|---------|
| `/` | Auth (F-1); start **login** |
| `/meetings` | Tabela + Test (F-5…F-8); grupa `(dashboard)` |
| `/search` | Mock wyszukiwarki (F-10…F-12) |

**Brak** `/meetings/[id]` w UI.

### Mapa powierzchni BFF (żywy proxy w tym wycinku)

| BFF | API | Uwaga |
|-----|-----|--------|
| `POST /api/auth/register` | `POST /auth/register` | K-6a: match + strip `passwordConfirm` |
| `POST /api/auth/login` | `POST /auth/login` | bez `passwordConfirm` |
| `POST /api/auth/logout` | `POST /auth/logout` | przekaż cookie |
| `GET /api/auth/me` | `GET /auth/me` | |
| `POST /api/auth/refresh` | `POST /auth/refresh` | cookie refresh |
| `GET /api/meetings` | `GET /meetings` | `page` + `limit` |
| `GET /api/meetings/[id]` | `GET /meetings/:id` | API detail (UI bez strony detail) |
| `GET /api/meetings/[id]/events` | `GET /meetings/:id/events` | SSE `text/event-stream` |
| `POST /api/demo/run-meeting` | `POST /demo/run-meeting` | body `{ fixtureKey }` |

---

## FAZA 1 — UI v1: sesja, tabela + Test + SSE, mock wyszukiwarki

**Kotwica major:** Faza 3 — UI v1: sesja, tabela + Test + SSE, mock wyszukiwarki.  
**Cel fazy:** Domknąć minimalny panel etapu 0 na żywym API (auth cookie, lista po ACL, Test→SSE, mock search) zgodnie z DoD Fazy 3 majoru frontu.

---

### KROK 1 — Infrastruktura BFF (env, proxy cookie, envelope, contracts)

**Status:** `WYKONANY`

**Cel:** Wspólna warstwa proxy używana przez wszystkie handlery — forward `Cookie` do Nest, relay `Set-Cookie` do przeglądarki (host BFF), envelope K-8 przy braku konfiguracji. Odwołania: `SPEC-KOMUNIKACJA` K-6…K-8, `SPEC-FRONTEND` F-13…F-16; major **3.2** (fundament pod).

**Artefakty:**

- Zmiana: `apps/web/package.json` — zależność `@vinseo/contracts`
- Zmiana: `apps/web/next.config.ts` — `transpilePackages: ["@vinseo/contracts"]`
- Zmiana: `apps/web/lib/env.ts` — wymagany `API_BASE_URL` w handlerach
- Nowy: `apps/web/lib/session-cookies.ts`
- Nowy: `apps/web/lib/bff-proxy.ts`
- Zmiana: `apps/web/lib/bff-stub.ts` — zostaje tylko jako dokument historyczny **albo** usunięcie po podmianie wszystkich route (preferuj usunięcie importów stubów w KROK 2–5; plik stub można skasować na końcu KROK 5)

**Implementacja — zależność monorepo**

W `apps/web/package.json` dodaj:

```json
"@vinseo/contracts": "workspace:*"
```

W katalogu `apps/web`: `pnpm install` (z rootu monorepo). Przed typecheck: `pnpm --filter @vinseo/contracts build` (jak w skryptach `dev:api`).

**Refaktor — `apps/web/next.config.ts`**

**Teraz:**

```ts
const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};
```

**Zamień na:**

```ts
const nextConfig: NextConfig = {
  transpilePackages: ["@vinseo/contracts"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};
```

**Refaktor — `apps/web/lib/env.ts` (cały plik)**

**Zamień na:**

```ts
/**
 * Konfiguracja procesu web. Wrażliwe sekrety vendorów / JWT secret — nie tu
 * (SPEC-FRONTEND F-16). API URL tylko server-side (BFF), bez NEXT_PUBLIC_.
 */
export type WebServerEnv = {
  readonly apiBaseUrl: string | undefined;
};

export function readWebServerEnv(
  env: NodeJS.ProcessEnv = process.env,
): WebServerEnv {
  const raw = env.API_BASE_URL?.trim();
  return {
    apiBaseUrl: raw && raw.length > 0 ? raw : undefined,
  };
}

/** BFF: brak API_BASE_URL → nie wołaj Nest (obserwowalny fail konfiguracji). */
export function requireApiBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const { apiBaseUrl } = readWebServerEnv(env);
  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured");
  }
  return apiBaseUrl.replace(/\/$/, "");
}
```

**Nowy plik — `apps/web/lib/session-cookies.ts`:**

```ts
/**
 * Nazwy cookie sesji — zgodne z apps/api `auth-cookies.ts`
 * (SPEC-AUTH_I_ACL: access + refresh HttpOnly).
 */
export const ACCESS_COOKIE = "ma_access" as const;
export const REFRESH_COOKIE = "ma_refresh" as const;

export const SESSION_COOKIE_NAMES = [ACCESS_COOKIE, REFRESH_COOKIE] as const;

export type SessionCookieName = (typeof SESSION_COOKIE_NAMES)[number];
```

**Nowy plik — `apps/web/lib/bff-proxy.ts`:**

```ts
import type { HttpErrorBody } from "@vinseo/contracts";

import { requireApiBaseUrl } from "@/lib/env";

export type BffProxyInit = {
  readonly method: "GET" | "POST";
  readonly apiPath: string;
  /** Ścieżka względna API zaczynająca się od `/` (np. `/auth/login`). */
  readonly request: Request;
  readonly body?: string | undefined;
  readonly contentType?: string | undefined;
  readonly searchParams?: URLSearchParams | undefined;
};

function joinApiUrl(apiBaseUrl: string, apiPath: string, search?: URLSearchParams): string {
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const url = new URL(path, `${apiBaseUrl}/`);
  if (search) {
    search.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

/** Przekaż Cookie z przeglądarki → Nest (bez ACL w BFF). */
export function inboundCookieHeader(request: Request): string | undefined {
  const cookie = request.headers.get("cookie");
  return cookie && cookie.length > 0 ? cookie : undefined;
}

/**
 * Relay Set-Cookie z Nest → odpowiedź BFF.
 * Usuń Domain, żeby przeglądarka wiązała cookie z hostem web (nie api).
 * Context7 Next 16: wolno ustawiać `Set-Cookie` na `Response` / Headers.
 */
export function appendUpstreamSetCookies(
  target: Headers,
  upstream: Headers,
): void {
  const getSetCookie = (
    upstream as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  const lines =
    typeof getSetCookie === "function"
      ? getSetCookie.call(upstream)
      : (() => {
          const single = upstream.get("set-cookie");
          return single ? [single] : [];
        })();

  for (const line of lines) {
    const rewritten = line
      .split(";")
      .map((part) => part.trim())
      .filter((part) => !/^domain=/i.test(part))
      .join("; ");
    target.append("Set-Cookie", rewritten);
  }
}

export function configErrorResponse(): Response {
  const body: HttpErrorBody = {
    statusCode: 503,
    message: "API_BASE_URL is not configured",
    code: "BFF_MISCONFIGURED",
  };
  return Response.json(body, {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export function validationErrorResponse(message: string): Response {
  const body: HttpErrorBody = {
    statusCode: 400,
    message,
    code: "VALIDATION_ERROR",
  };
  return Response.json(body, {
    status: 400,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Proxy JSON (auth, meetings, demo). Nie egzekwuje ACL.
 */
export async function bffProxyJson(init: BffProxyInit): Promise<Response> {
  let apiBaseUrl: string;
  try {
    apiBaseUrl = requireApiBaseUrl();
  } catch {
    return configErrorResponse();
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (init.contentType) {
    headers.set("Content-Type", init.contentType);
  }
  const cookie = inboundCookieHeader(init.request);
  if (cookie) {
    headers.set("Cookie", cookie);
  }
  const requestId = init.request.headers.get("x-request-id");
  if (requestId) {
    headers.set("x-request-id", requestId);
  }

  const upstream = await fetch(
    joinApiUrl(apiBaseUrl, init.apiPath, init.searchParams),
    {
      method: init.method,
      headers,
      body: init.body,
      cache: "no-store",
      // Cookie sesji Nest — nie śledź redirectów auth między hostami
      redirect: "manual",
    },
  );

  const outHeaders = new Headers();
  outHeaders.set("Cache-Control", "no-store");
  const contentType = upstream.headers.get("content-type");
  if (contentType) {
    outHeaders.set("Content-Type", contentType);
  }
  appendUpstreamSetCookies(outHeaders, upstream.headers);

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

/**
 * Proxy SSE: przekaż body stream bez buforowania całego strumienia.
 */
export async function bffProxySse(init: {
  readonly apiPath: string;
  readonly request: Request;
}): Promise<Response> {
  let apiBaseUrl: string;
  try {
    apiBaseUrl = requireApiBaseUrl();
  } catch {
    return configErrorResponse();
  }

  const headers = new Headers();
  headers.set("Accept", "text/event-stream");
  const cookie = inboundCookieHeader(init.request);
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const upstream = await fetch(joinApiUrl(apiBaseUrl, init.apiPath), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    const outHeaders = new Headers();
    outHeaders.set("Cache-Control", "no-store");
    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      outHeaders.set("Content-Type", contentType);
    }
    appendUpstreamSetCookies(outHeaders, upstream.headers);
    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  }

  const outHeaders = new Headers();
  outHeaders.set("Content-Type", "text/event-stream");
  outHeaders.set("Cache-Control", "no-cache, no-transform");
  outHeaders.set("Connection", "keep-alive");
  appendUpstreamSetCookies(outHeaders, upstream.headers);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}
```

**Biblioteki / API:**

- Context7 Next `v16.2.9`: Route Handlers — `cookies` / `Set-Cookie` na `Response`; dynamic `params: Promise`.
- Lokalne docs: `proxy.ts` zamiast deprecated `middleware` (użyte w KROK 3).
- SPEC > Context7 przy konflikcie.

**Testy:** `pnpm --filter @vinseo/contracts build` + typecheck importów w `apps/web` (pełny smoke build — Faza 4 majoru; tu: brak błędów TS na nowych plikach).

**DoD (krok):**

- `@vinseo/contracts` dostępne w `apps/web`.
- `bffProxyJson` / `bffProxySse` forwardują Cookie i relay’ują Set-Cookie bez Domain Nest.
- Brak `API_BASE_URL` → 503 + `BFF_MISCONFIGURED` (K-8).
- Zero logiki ACL / enqueue w helperach.

---

### KROK 2 — BFF auth + register `passwordConfirm` (K-6a)

**Status:** `WYKONANY`

**Cel:** Spełnić major **3.2** — żywe handlery auth; register: match `passwordConfirm` przed proxy, mismatch → 400 bez Nest; OK → strip do `{ email, password }`. Login bez `passwordConfirm`. `SPEC-KOMUNIKACJA` K-6a.

**Artefakty:**

- Zmiana (całe pliki route):  
  `apps/web/app/api/auth/register/route.ts`  
  `apps/web/app/api/auth/login/route.ts`  
  `apps/web/app/api/auth/logout/route.ts`  
  `apps/web/app/api/auth/me/route.ts`  
  `apps/web/app/api/auth/refresh/route.ts`

**Implementacja — kompletne pliki**

`apps/web/app/api/auth/register/route.ts`:

```ts
import {
  bffProxyJson,
  validationErrorResponse,
} from "@/lib/bff-proxy";

type RegisterBffBody = {
  readonly email?: unknown;
  readonly password?: unknown;
  readonly passwordConfirm?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return validationErrorResponse("Invalid JSON body");
  }

  const body = raw as RegisterBffBody;
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirm =
    typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";

  if (!email || !password || !passwordConfirm) {
    return validationErrorResponse(
      "email, password and passwordConfirm are required",
    );
  }

  if (password !== passwordConfirm) {
    return validationErrorResponse("passwordConfirm does not match password");
  }

  return bffProxyJson({
    method: "POST",
    apiPath: "/auth/register",
    request,
    contentType: "application/json",
    body: JSON.stringify({ email, password }),
  });
}
```

`apps/web/app/api/auth/login/route.ts`:

```ts
import { bffProxyJson, validationErrorResponse } from "@/lib/bff-proxy";

type LoginBody = {
  readonly email?: unknown;
  readonly password?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return validationErrorResponse("Invalid JSON body");
  }

  const body = raw as LoginBody;
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return validationErrorResponse("email and password are required");
  }

  return bffProxyJson({
    method: "POST",
    apiPath: "/auth/login",
    request,
    contentType: "application/json",
    body: JSON.stringify({ email, password }),
  });
}
```

`apps/web/app/api/auth/logout/route.ts`:

```ts
import { bffProxyJson } from "@/lib/bff-proxy";

export async function POST(request: Request): Promise<Response> {
  return bffProxyJson({
    method: "POST",
    apiPath: "/auth/logout",
    request,
  });
}
```

`apps/web/app/api/auth/me/route.ts`:

```ts
import { bffProxyJson } from "@/lib/bff-proxy";

export async function GET(request: Request): Promise<Response> {
  return bffProxyJson({
    method: "GET",
    apiPath: "/auth/me",
    request,
  });
}
```

`apps/web/app/api/auth/refresh/route.ts`:

```ts
import { bffProxyJson } from "@/lib/bff-proxy";

export async function POST(request: Request): Promise<Response> {
  return bffProxyJson({
    method: "POST",
    apiPath: "/auth/refresh",
    request,
  });
}
```

**Biblioteki:** `bffProxyJson` (KROK 1); Nest `POST /auth/register` bez `passwordConfirm` (kontrakt API bez zmian).

**Testy (ręczne / obserwowalne):**

1. `POST /api/auth/register` z `password !== passwordConfirm` → **400**, w logach API **brak** requestu register.
2. Match → Nest dostaje tylko `{ email, password }`; odpowiedź ustawia cookie `ma_access` / `ma_refresh` na hoście web.
3. Login → cookie; `GET /api/auth/me` z tymi cookie → 200.

**DoD (krok):**

- Mismatch BFF → 400 + envelope, **bez** wołania Nest.
- Sukces register → API tylko `{ email, password }`.
- Login / logout / me / refresh proxy’ują z cookie; brak ACL w BFF.

---

### KROK 3 — Auth UI F-1 + ochrona tras + wylogowanie

**Status:** `WYKONANY`

**Cel:** Spełnić major **3.1** — klasyczny UX auth (F-1), sukces → cookie przez BFF → `/meetings`; brak ważnej sesji na chronionych → `/`; wylogowanie przez BFF. Refaktor względem Faza 2 / Krok 2.1 (szkielet przełączania).

**Artefakty:**

- Zmiana: `apps/web/components/auth-mode-toggle.tsx` (cały plik — F-1)
- Zmiana: `apps/web/app/page.tsx`
- Nowy: `apps/web/proxy.ts` (miękka bramka cookie)
- Nowy: `apps/web/lib/require-session.ts` (twarda weryfikacja `me` w layoutcie dashboard)
- Zmiana: `apps/web/app/(dashboard)/layout.tsx`
- Zmiana: `apps/web/components/dashboard-sidebar.tsx` (żywy logout)

**Refaktor — `apps/web/components/auth-mode-toggle.tsx` (cały plik)**

Usuń konkurencyjne taby „Logowanie/Rejestracja” (F-1: przełączanie wyłącznie linkami tekstowymi pod formularzem).

**Zamień na:**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uiRoutes } from "@/lib/routes";

type AuthMode = "login" | "register";

type AuthFormState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "error"; readonly message: string };

/**
 * Auth UI v1 — SPEC-FRONTEND F-1.
 * Start: login; CTA; linki tekstowe; register: passwordConfirm + match przed submit.
 * Sesja tylko przez cookie HttpOnly z BFF — bez localStorage/sessionStorage.
 */
export function AuthModeToggle() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [formState, setFormState] = useState<AuthFormState>({ status: "idle" });

  const mismatch =
    mode === "register" &&
    passwordConfirm.length > 0 &&
    password !== passwordConfirm;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    if (typeof email !== "string" || !email) {
      setFormState({ status: "error", message: "Podaj e-mail." });
      return;
    }
    if (mode === "register" && password !== passwordConfirm) {
      setFormState({
        status: "error",
        message: "Hasła muszą być takie same.",
      });
      return;
    }

    setFormState({ status: "submitting" });
    const path =
      mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { email, password }
        : { email, password, passwordConfirm };

    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });
      if (!res.ok) {
        let message = "Nie udało się zalogować.";
        try {
          const err = (await res.json()) as { message?: string };
          if (typeof err.message === "string") {
            message = err.message;
          }
        } catch {
          /* ignore */
        }
        setFormState({ status: "error", message });
        return;
      }
      router.push(uiRoutes.meetings);
      router.refresh();
    } catch {
      setFormState({
        status: "error",
        message: "Błąd sieci. Spróbuj ponownie.",
      });
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {mode === "register" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="passwordConfirm">Powtórz hasło</Label>
            <Input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              aria-invalid={mismatch}
            />
            {mismatch ? (
              <p className="text-sm text-destructive" role="alert">
                Hasła nie są zgodne.
              </p>
            ) : null}
          </div>
        ) : null}
        <Button
          type="submit"
          disabled={formState.status === "submitting" || mismatch}
        >
          {mode === "login" ? "Zaloguj się" : "Zarejestruj się"}
        </Button>
      </form>

      {formState.status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {formState.message}
        </p>
      ) : null}

      <div className="text-center text-sm">
        {mode === "login" ? (
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setMode("register");
              setFormState({ status: "idle" });
            }}
          >
            Nie masz konta? Zarejestruj się!
          </button>
        ) : (
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setMode("login");
              setPasswordConfirm("");
              setFormState({ status: "idle" });
            }}
          >
            Masz już konto? Zaloguj się!
          </button>
        )}
      </div>
    </div>
  );
}
```

**Refaktor — `apps/web/app/page.tsx`**

**Zamień na:**

```tsx
import { AppShell } from "@/components/app-shell";
import { AuthModeToggle } from "@/components/auth-mode-toggle";

export default function AuthPage() {
  return (
    <AppShell title="Logowanie / rejestracja" centered>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Sesja przez cookie HttpOnly (BFF → API). Brak tokenów w Web Storage.
      </p>
      <AuthModeToggle />
    </AppShell>
  );
}
```

**Nowy plik — `apps/web/proxy.ts`**

Miękka bramka: brak obu cookie sesji → redirect na `/` (F-2). Twarda walidacja JWT w layoutcie (poniżej). Next 16: **`proxy.ts`**, nie `middleware.ts` (lokalne docs + Context7).

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session-cookies";
import { uiRoutes } from "@/lib/routes";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected =
    pathname === uiRoutes.meetings ||
    pathname.startsWith(`${uiRoutes.meetings}/`) ||
    pathname === uiRoutes.search ||
    pathname.startsWith(`${uiRoutes.search}/`);

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasAccess = request.cookies.has(ACCESS_COOKIE);
  const hasRefresh = request.cookies.has(REFRESH_COOKIE);
  if (!hasAccess && !hasRefresh) {
    const url = request.nextUrl.clone();
    url.pathname = uiRoutes.auth;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/meetings/:path*", "/search/:path*"],
};
```

**Nowy plik — `apps/web/lib/require-session.ts`:**

Layout RSC: tylko obecność cookie (+ misconfig). Cykl **refresh → me** robi klient dashboardu przez BFF same-origin (`credentials: "same-origin"`), żeby `Set-Cookie` z Nest wróciły do przeglądarki (RSC `fetch` do Nest po refresh nie ustawi cookie w browserze).

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireApiBaseUrl } from "@/lib/env";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session-cookies";
import { uiRoutes } from "@/lib/routes";

/**
 * RSC: brak cookie sesji → `/` (F-2).
 * Walidacja JWT + refresh: klient (POST /api/auth/refresh, GET /api/auth/me).
 */
export async function requireSessionCookies(): Promise<void> {
  const jar = await cookies();
  if (!jar.has(ACCESS_COOKIE) && !jar.has(REFRESH_COOKIE)) {
    redirect(uiRoutes.auth);
  }
  try {
    requireApiBaseUrl();
  } catch {
    redirect(uiRoutes.auth);
  }
}
```

**Refaktor — `apps/web/app/(dashboard)/layout.tsx`**

**Zamień na:**

```tsx
import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireSessionCookies } from "@/lib/require-session";

type DashboardLayoutProps = {
  readonly children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  await requireSessionCookies();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:px-6">
      <DashboardSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
```

**Refaktor — `apps/web/components/dashboard-sidebar.tsx` (fragment logout)**

**Teraz:** `Link` „Wyloguj (stub)” → `/`.

**Zamień cały plik na:**

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { uiRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const items = [
  { href: uiRoutes.meetings, label: "Spotkania" },
  { href: uiRoutes.search, label: "Wyszukiwarka" },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    router.replace(uiRoutes.auth);
    router.refresh();
  }

  return (
    <aside className="flex w-full flex-col gap-3 sm:w-48">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Panel
      </p>
      <nav className="flex flex-row gap-2 sm:flex-col">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: active ? "default" : "ghost" }),
                "justify-start",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <button
        type="button"
        onClick={onLogout}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "justify-start",
        )}
      >
        Wyloguj
      </button>
    </aside>
  );
}
```

**DoD (krok):**

- Start `/` w trybie login; CTA i linki F-1; mismatch haseł → **brak** submitu sieciowego.
- Login/register → cookie → `/meetings`.
- Bez cookie na `/meetings` / `/search` → `/`.
- Brak access/refresh w `localStorage` / `sessionStorage`.
- Wyloguj woła BFF i wraca na `/`.

---

### KROK 4 — BFF meetings + dashboard: tabela, limit, page

**Status:** `WYKONANY`

**Cel:** Spełnić major **3.3** — lista z API przez BFF (już po ACL), select limitu ∈ {10,25,50,100} + `page`. F-5, F-6; `SPEC-AUTH_I_ACL` paginacja.

**Artefakty:**

- Zmiana: `apps/web/app/api/meetings/route.ts`
- Zmiana: `apps/web/app/api/meetings/[id]/route.ts`
- Nowy: `apps/web/components/meetings-dashboard.tsx`
- Zmiana: `apps/web/app/(dashboard)/meetings/page.tsx`

**`apps/web/app/api/meetings/route.ts`:**

```ts
import { MEETING_LIST_LIMITS } from "@vinseo/contracts";

import { bffProxyJson, validationErrorResponse } from "@/lib/bff-proxy";

const allowed = new Set<number>(MEETING_LIST_LIMITS);

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pageRaw = url.searchParams.get("page") ?? "1";
  const limitRaw = url.searchParams.get("limit") ?? "10";
  const page = Number(pageRaw);
  const limit = Number(limitRaw);

  if (!Number.isInteger(page) || page < 1) {
    return validationErrorResponse("page must be a positive integer");
  }
  if (!allowed.has(limit)) {
    return validationErrorResponse("limit must be one of 10, 25, 50, 100");
  }

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return bffProxyJson({
    method: "GET",
    apiPath: "/meetings",
    request,
    searchParams,
  });
}
```

> Uwaga: walidacja limitu/page w BFF jest **lustrzana** względem API (UX / wczesny 400). **Nie** jest egzekucją ACL. API i tak odrzuca zły limit.

**`apps/web/app/api/meetings/[id]/route.ts`:**

```ts
import { bffProxyJson } from "@/lib/bff-proxy";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return bffProxyJson({
    method: "GET",
    apiPath: `/meetings/${id}`,
    request,
  });
}
```

**Nowy — `apps/web/components/meetings-dashboard.tsx`** (szkielet listy + paginacja; Test/SSE w KROK 5 w **tym samym** pliku — poniżej w KROK 5 pełna wersja).  
W **tym** kroku wystarczy wersja bez SSE (można od razu wkleić pełny plik z KROK 5, żeby uniknąć podwójnego refaktoru — **zalecane: od razu pełny komponent z KROK 5**, a DoD KROK 4 weryfikuje listę/paginację niezależnie od Test).

**`apps/web/app/(dashboard)/meetings/page.tsx`:**

```tsx
import { MeetingsDashboard } from "@/components/meetings-dashboard";

export default function MeetingsPage() {
  return <MeetingsDashboard />;
}
```

**DoD (krok):**

- Tabela pokazuje `items` z `GET /api/meetings?page&limit`.
- Zmiana limitu / strony wysyła parametry; limit tylko z {10,25,50,100}.
- UI nie „dopuszcza po ID” — widać wyłącznie to, co zwróci API.

---

### KROK 5 — BFF demo/SSE + Test + aktualizacja wiersza

**Status:** `WYKONANY`

**Cel:** Spełnić major **3.4** — Test → `POST /api/demo/run-meeting` → SSE `GET /api/meetings/:id/events` → aktualizacja wiersza in-place; `failed` → status + komunikat; **bez** redirectu na detail. F-7, F-8; `docs/data_flow.md`; K-5 / K-5a.

**Artefakty:**

- Zmiana: `apps/web/app/api/demo/run-meeting/route.ts`
- Zmiana: `apps/web/app/api/meetings/[id]/events/route.ts`
- Nowy/final: `apps/web/components/meetings-dashboard.tsx` (pełny)
- Stała fixture: `demo-client-budget-pl` (jak e2e API / K-5)

**`apps/web/app/api/demo/run-meeting/route.ts`:**

```ts
import { bffProxyJson, validationErrorResponse } from "@/lib/bff-proxy";

type DemoBody = {
  readonly fixtureKey?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return validationErrorResponse("Invalid JSON body");
  }
  const body = raw as DemoBody;
  const fixtureKey =
    typeof body.fixtureKey === "string" ? body.fixtureKey : "";
  if (!fixtureKey) {
    return validationErrorResponse("fixtureKey is required");
  }

  return bffProxyJson({
    method: "POST",
    apiPath: "/demo/run-meeting",
    request,
    contentType: "application/json",
    body: JSON.stringify({ fixtureKey }),
  });
}
```

**`apps/web/app/api/meetings/[id]/events/route.ts`:**

```ts
import { bffProxySse } from "@/lib/bff-proxy";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return bffProxySse({
    apiPath: `/meetings/${id}/events`,
    request,
  });
}
```

**Nowy plik (kompletny) — `apps/web/components/meetings-dashboard.tsx`:**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  DemoRunMeetingResponseDto,
  MeetingDetailDto,
  MeetingListItemDto,
  MeetingListResponseDto,
  MeetingStatusEventDto,
  MeetingListLimit,
} from "@vinseo/contracts";
import { MEETING_LIST_LIMITS } from "@vinseo/contracts";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { uiRoutes } from "@/lib/routes";

const DEMO_FIXTURE_KEY = "demo-client-budget-pl";

type RowView = MeetingListItemDto & {
  readonly summaryPreview?: string | null;
  readonly failureMessage?: string | null;
};

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "ready";
      readonly page: number;
      readonly limit: MeetingListLimit;
      readonly total: number;
      readonly rows: readonly RowView[];
    };

function summaryToPreview(summary: unknown): string | null {
  if (summary == null) return null;
  if (typeof summary === "string") return summary.slice(0, 160);
  try {
    return JSON.stringify(summary).slice(0, 160);
  } catch {
    return null;
  }
}

export function MeetingsDashboard() {
  const router = useRouter();
  const [limit, setLimit] = useState<MeetingListLimit>(10);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureSessionThenLoad() {
      const me = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (me.status === 401) {
        const refreshed = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "same-origin",
        });
        if (!refreshed.ok) {
          router.replace(uiRoutes.auth);
          return;
        }
        const me2 = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!me2.ok) {
          router.replace(uiRoutes.auth);
          return;
        }
      } else if (!me.ok) {
        router.replace(uiRoutes.auth);
        return;
      }

      const res = await fetch(
        `/api/meetings?page=${page}&limit=${limit}`,
        { credentials: "same-origin" },
      );
      if (cancelled) return;
      if (!res.ok) {
        setState({
          status: "error",
          message: "Nie udało się pobrać listy spotkań.",
        });
        return;
      }
      const data = (await res.json()) as MeetingListResponseDto;
      setState({
        status: "ready",
        page: data.page,
        limit: data.limit as MeetingListLimit,
        total: data.total,
        rows: data.items,
      });
    }

    setState({ status: "loading" });
    void ensureSessionThenLoad();
    return () => {
      cancelled = true;
    };
  }, [page, limit, router]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, []);

  function upsertRow(patch: RowView) {
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      const idx = prev.rows.findIndex((r) => r.id === patch.id);
      if (idx === -1) {
        return { ...prev, rows: [patch, ...prev.rows], total: prev.total + 1 };
      }
      const rows = prev.rows.slice();
      rows[idx] = { ...rows[idx], ...patch };
      return { ...prev, rows };
    });
  }

  function openSse(meetingId: string) {
    eventSourceRef.current?.close();
    const es = new EventSource(`/api/meetings/${meetingId}/events`, {
      withCredentials: true,
    });
    eventSourceRef.current = es;

    es.onmessage = (ev) => {
      let payload: MeetingStatusEventDto;
      try {
        payload = JSON.parse(ev.data) as MeetingStatusEventDto;
      } catch {
        return;
      }

      const base: RowView = {
        id: payload.meetingId,
        title: payload.title ?? null,
        startedAt: null,
        durationSeconds: null,
        organizerId: null,
        clientId: null,
        clientLinkStatus: "unmatched",
        confidential: false,
        processingStatus: payload.processingStatus,
        summaryPreview: summaryToPreview(payload.summary ?? null),
      };

      if (payload.processingStatus === "failed") {
        void (async () => {
          const detailRes = await fetch(`/api/meetings/${meetingId}`, {
            credentials: "same-origin",
          });
          let failureMessage = "Przetwarzanie nie powiodło się.";
          if (detailRes.ok) {
            const detail = (await detailRes.json()) as MeetingDetailDto;
            if (detail.failureReason) {
              failureMessage = detail.failureReason;
            }
            upsertRow({
              ...base,
              ...detail,
              failureMessage,
              summaryPreview: summaryToPreview(detail.summary),
            });
          } else {
            upsertRow({ ...base, failureMessage });
          }
        })();
      } else {
        upsertRow(base);
      }

      if (
        payload.processingStatus === "completed" ||
        payload.processingStatus === "failed"
      ) {
        es.close();
        eventSourceRef.current = null;
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
    };
  }

  async function onTest() {
    setTestBusy(true);
    setTestError(null);
    try {
      const res = await fetch("/api/demo/run-meeting", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureKey: DEMO_FIXTURE_KEY }),
      });
      if (!res.ok) {
        setTestError("Nie udało się uruchomić demo.");
        return;
      }
      const data = (await res.json()) as DemoRunMeetingResponseDto;
      upsertRow({
        id: data.meetingId,
        title: null,
        startedAt: null,
        durationSeconds: null,
        organizerId: null,
        clientId: null,
        clientLinkStatus: "unmatched",
        confidential: false,
        processingStatus: data.status,
      });
      openSse(data.meetingId);
    } catch {
      setTestError("Błąd sieci przy Test.");
    } finally {
      setTestBusy(false);
    }
  }

  const totalPages =
    state.status === "ready"
      ? Math.max(1, Math.ceil(state.total / state.limit))
      : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Spotkania</h1>
        <Button type="button" onClick={onTest} disabled={testBusy}>
          Test
        </Button>
      </div>

      {testError ? (
        <p className="text-sm text-destructive" role="alert">
          {testError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span>Limit</span>
          <select
            className="rounded-md border bg-background px-2 py-1"
            value={limit}
            aria-label="Limit listy"
            onChange={(e) => {
              setPage(1);
              setLimit(Number(e.target.value) as MeetingListLimit);
            }}
          >
            {MEETING_LIST_LIMITS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Poprzednia
          </Button>
          <span>
            Strona {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Następna
          </Button>
        </div>
      </div>

      {state.status === "loading" ? (
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      ) : null}
      {state.status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tytuł</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Podsumowanie / błąd</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Brak spotkań. Użyj Test, aby uruchomić demo.
                </TableCell>
              </TableRow>
            ) : (
              state.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.title ?? "—"}</TableCell>
                  <TableCell>{row.processingStatus}</TableCell>
                  <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                    {row.processingStatus === "failed"
                      ? (row.failureMessage ?? "failed")
                      : (row.summaryPreview ?? "—")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
```

> `clientLinkStatus: "unmatched"` przy wierszu z Test — literał z `ClientLinkStatus` (`internal` | `matched` | `unmatched`); po reload / detail SSE nadpisze pola z API.

**Biblioteki:** EventSource + BFF SSE (F-8); Nest `@Sse` emituje `data` jako JSON (parse w `onmessage`).

**DoD (krok):**

- Test zawsze widoczny; enqueue przez BFF; SSE aktualizuje wiersz; brak zmiany trasy.
- `failed` → status + komunikat (`failureReason` z detail lub fallback).
- BFF SSE nie egzekwuje ACL (Nest tak).

---

### KROK 6 — Mock wyszukiwarki + domknięcie bezpieczeństwa UI

**Status:** `WYKONANY`

**Cel:** Spełnić major **3.5** — interaktywny mock (bez API LLM/search); F-10…F-12, F-15…F-17; brak sekretów w bundlu; brak logowania pełnego transcriptu w konsoli na prod.

**Artefakty:**

- Zmiana: `apps/web/app/(dashboard)/search/page.tsx`
- Nowy: `apps/web/components/search-mock-panel.tsx`
- Ewentualnie: usunięcie `apps/web/lib/bff-stub.ts` jeśli żaden route go nie importuje
- Przegląd: `apps/web` pod kątem `localStorage` / `sessionStorage` / `NEXT_PUBLIC_` / `console.log` transcriptu

**Nowy — `apps/web/components/search-mock-panel.tsx`:**

```tsx
"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { searchMockHits } from "@/lib/search-mock";

/**
 * Mock wyszukiwarki — F-11…F-12. Filtr lokalny po hardcodzie; zero fetch.
 */
export function SearchMockPanel() {
  const [query, setQuery] = useState("");

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchMockHits;
    return searchMockHits.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.snippet.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Wyszukiwarka</h1>
      <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Atrapa: wyniki są hardcodowane (filtr tylko w przeglądarce). Brak wołań
        LLM / search / RAG w v1 (`SPEC-FRONTEND` F-12).
      </p>
      <Input
        type="search"
        placeholder="Szukaj (mock — bez API)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Pole wyszukiwania (mock)"
      />
      <ul className="flex flex-col gap-3">
        {hits.map((hit) => (
          <li key={hit.id} className="rounded-md border px-3 py-2">
            <p className="font-medium">{hit.title}</p>
            <p className="text-sm text-muted-foreground">{hit.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**`apps/web/app/(dashboard)/search/page.tsx`:**

```tsx
import { SearchMockPanel } from "@/components/search-mock-panel";

export default function SearchPage() {
  return <SearchMockPanel />;
}
```

**Checklist bezpieczeństwa (wykonaj i odhacz w PR):**

- [ ] Brak zapisu `ma_access` / `ma_refresh` / JWT do `localStorage` / `sessionStorage`.
- [ ] Brak `NEXT_PUBLIC_` z sekretami / URL API (API tylko `API_BASE_URL` server).
- [ ] Brak `console.log` pełnego transcriptu w kodzie klienta (F-17).
- [ ] Żaden handler BFF nie zawiera reguł ACL / bezpośredniego enqueue.
- [ ] Usunięte nieużywane importy `bffStubResponse` / plik stub.

**DoD (krok):**

- Wyszukiwarka nie woła zabronionych API (Network: brak requestów search/LLM).
- Kryteria F-15…F-17 spełnione w zakresie v1.
- Faza 3 major DoD domknięta łącznie z KROK 1–5.

---

#### Propozycja commit message

```text
feat(web): wire UI v1 to API via BFF session, meetings, Test SSE

Replace BFF stubs with cookie-forwarding proxy (including register
passwordConfirm), protect dashboard routes, and update meeting rows
in-place over SSE without a detail page.
```

---

## Weryfikacja wycinka

| Kryterium | Źródło |
|-----------|--------|
| Auth F-1 (login start, CTA, linki, passwordConfirm UI) | `SPEC-FRONTEND` |
| Redirect bez sesji; cookie HttpOnly; brak Web Storage | F-2, F-15; major 3.1 |
| BFF K-6a register | `SPEC-KOMUNIKACJA`; major 3.2 |
| Lista + limit/page | F-5, F-6; major 3.3 |
| Test + SSE in-place; failed z komunikatem | F-7, F-8; major 3.4 |
| Mock search bez LLM | F-10…F-12; major 3.5 |
| BFF bez ACL | F-14; K-7 |
| Pass rozwojowy | KROK 1→6 jak wyżej |
| Nagłówki tylko `FAZA` / `KROK` | ten plik |
| Commit message EN Conventional Commits | koniec FAZA 1 |
| Major nietknięty w tej sesji | skill |

**Smoke E2E manualny (lokalnie, przy działającym api+worker+db):**

1. `API_BASE_URL=http://localhost:3001` w `apps/web/.env`.
2. Register → dashboard; refresh strony → nadal sesja (lub refresh cookie).
3. Test → wiersz `pending`→`processing`→`completed|failed` bez zmiany URL.
4. `/search` — filtr lokalny; brak requestów AI.
5. Wyloguj → `/`; `/meetings` → redirect `/`.

---

## Ślad do major (informacyjnie — po późniejszej implementacji)

Po spełnieniu DoD implementacji (poza tą sesją):

| Element major frontu | Oczekiwany status |
|----------------------|-------------------|
| Faza 3 | `WYKONANY` |
| Kroki 3.1–3.5 | `WYKONANY` |
| MILESTONE — Panel v1 działa z API | `OSIĄGNIĘTY` |

Ten feature plan **nie** zmienia pliku major.

---

## Podsumowanie passu rozwojowego

1. Helper BFF przed handlerami.  
2. Major 3.2 (BFF register) przed 3.1 (auth UI).  
3. Meetings/demo/SSE BFF razem z UI, które je konsumują.  
4. Mock/security na końcu.  
**Brak** przenosin między fazami major — wyłącznie Faza 3 frontu.
