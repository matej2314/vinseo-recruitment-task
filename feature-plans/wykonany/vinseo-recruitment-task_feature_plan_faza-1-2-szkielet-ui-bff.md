# Vinseo Recruitment Task - feature plan: Fazy 1–2 frontend (szkielet UI/BFF)

**Lokalizacja:** `feature-plans/vinseo-recruitment-task_feature_plan_faza-1-2-szkielet-ui-bff.md`  
**Kotwica major:** `vinseo-recruitment-task-frontend_major-plan.md` - Faza 1 + Faza 2, do **MILESTONE - Szkielet UI/BFF gotowy do spięcia z API**.  
**Źródła:** `docs/frontend.md`, `docs/architektura_katalogi_pliki.md`, `docs/dokumentacja_komunikacji.md`, `docs/anty_patterny.md`, `spec/SPEC-FRONTEND.md`, `spec/SPEC-KOMUNIKACJA.md`, `spec/SPEC-AUTH_I_ACL.md`, `spec/SPEC-TESTY.md`.  
**Kod bazowy:** `apps/web` (Next.js `16.4.3`, React `19`, Tailwind CSS `4`, `strict: true`).  
**Statusy kroków feature:** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`

---

## Meta

| Pole | Wartość |
|------|---------|
| Wycinek | Odbiór stubu `web` + szkielet powierzchni UI i cienkiego BFF |
| Major | Faza 1 (kroki 1.1–1.3), Faza 2 (kroki 2.1–2.3); kolejność `KROK` w tym pliku ≠ numeracja major (pass rozwojowy) |
| Założenie sesji | Fundament backendu może być jeszcze nieoznaczony w majorze; odbiór względem **istniejącego** stubu `apps/web` + checklisty równoważności |
| Poza zakresem wycinka | Faza 3+ (żywe cookie/ACL/SSE/demo), branding produktowy, Playwright, React Query, trasa detail UI, prawdziwa wyszukiwarka/LLM |
| Biblioteki (research) | Context7 `/vercel/next.js/v16.2.9` (Route Handlers, cookies, `params: Promise<…>`, layouty); shadcn CLI add (MCP); SPEC wygrywa przy konflikcie |

### Założenia stacku (odwołania, bez przepisywania SPEC)

- Next.js App Router + BFF w `app/api/*` - `SPEC-FRONTEND` F-13…F-14, `SPEC-KOMUNIKACJA` K-6…K-7.
- Tailwind + shadcn/ui; layout roboczy bez brandingu - `docs/frontend.md`, `SPEC-FRONTEND`.
- Data-fetching v1: natywny `fetch` (Faza 3); tu tylko placeholdery.
- Typowanie: `strict` z `apps/web/tsconfig.json`; brak `any` na granicach handlerów; `import type` dla typów; importy: framework (`next`, `next/*`) najpierw w grupie wartości.
- Smoke UI v1 (build/typecheck) - poza tym wycinkiem (`SPEC-TESTY` / major Faza 4); tu: `next build` nie może być oczywście zepsuty po szkielecie.

### Mapa tras UI (kanon wycinka)

| URL | Rola v1 | Uwagi |
|-----|---------|--------|
| `/` | Auth (login/register, przełączanie trybu) | `SPEC-FRONTEND` F-1 |
| `/meetings` | Widok domyślny: tabela + miejsce na Test | grupa `(dashboard)`; **brak** `/meetings/[id]` w UI |
| `/search` | Mock wyszukiwarki | F-10…F-12 |

Grupa `(dashboard)` **nie** dodaje segmentu URL; osobne `page.tsx` pod `/` i pod `/meetings` unikają kolizji.

### Mapa powierzchni BFF (kanon wycinka)

| BFF | Docelowe API (`SPEC-KOMUNIKACJA`) | W tym wycinku |
|-----|-----------------------------------|---------------|
| `POST /api/auth/register` | `POST /auth/register` | stub `501` |
| `POST /api/auth/login` | `POST /auth/login` | stub `501` |
| `POST /api/auth/logout` | `POST /auth/logout` | stub `501` |
| `GET /api/auth/me` | `GET /auth/me` | stub `501` |
| `POST /api/auth/refresh` | `POST /auth/refresh` | stub `501` |
| `GET /api/meetings` | `GET /meetings` | stub `501` |
| `GET /api/meetings/[id]` | `GET /meetings/:id` | stub `501` (API; **nie** strona UI) |
| `GET /api/meetings/[id]/events` | `GET /meetings/:id/events` (SSE) | stub `501` |
| `POST /api/demo/run-meeting` | `POST /demo/run-meeting` | stub `501` |

Stub **nie** egzekwuje ACL, **nie** woła pg-boss, **nie** woła adapterów - zgodnie z zakazami BFF.

---

## FAZA 1 - Odbiór fundamentu i stubu `web`

**Kotwica major:** Faza 1 - Odbiór fundamentu i stubu `web`.  
**Cel fazy:** potwierdzić, że `apps/web` da się bezpiecznie rozbudować pod UI v1 bez przebudowy monorepo; utrwalić mapę widoków/BFF i stałe tras.

### KROK 1 - Potwierdzenie gotowości stubu

**Status:** `WYKONANY`

**Cel:** Spełnić major **1.1** - stub uruchamialny w układzie repo; brak blokady „najpierw przebuduj monorepo”. Odwołania: `docs/architektura_katalogi_pliki.md`, major frontu Faza 1.

**Artefakty:**

- Bez zmian strukturalnych monorepo (zakaz powielania Fazy 1 backendu).
- Opcjonalny zapis lokalny checklisty w notatce implementacyjnej / PR - **nie** nowy plik w `docs/`.
- Ewentualna kosmetyka tylko jeśli `pnpm dev` / `pnpm build` w `apps/web` padają na domyślnym stubie create-next-app (naprawa blokera, nie redesign).

**Implementacja (procedura odbioru):**

1. Z rootu repo potwierdź lokalizację: `apps/web/package.json`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`.
2. W `apps/web`: `pnpm install` (jeśli potrzeba), `pnpm dev` - strona odpowiada lokalnie.
3. `pnpm build` - build stubu przechodzi (regresja „nie startuje” = fail DoD).
4. Checklist równoważności względem fundamentu backendu (wystarczy „tak / nie / N/A”):
   - [ ] Katalog `apps/web` istnieje i nie jest osobnym repo git.
   - [ ] Next App Router (katalog `app/`).
   - [ ] Alias `@/*` w `tsconfig` działa.
   - [ ] Brak wymogu przenosin drzewa przed Fazą 2 tego planu.
5. Jeśli fundament monorepo (workspaces root, `packages/contracts`) jest niepełny - **nie** buduj go tutaj; zanotuj lukę jako zależność majoru backendu, o ile stub `web` sam startuje.

**Biblioteki / API:** brak nowego API; Next już w stubie (`next@16.4.3`).

**Testy:** smoke ręczne `dev` + `build` (bez Playwright - `SPEC-TESTY`).

**DoD (krok):**

- `apps/web` startuje lokalnie; build nie pada na czystym stubie.
- Checklist równoważności wypełniona; brak otwartej blokady przebudowy monorepo przed FAZĄ 2.

---

### KROK 2 - Mapa widoków v1 i granic BFF

**Status:** `WYKONANY`

**Cel:** Spełnić major **1.2** - mapa widoków i granic BFF zgodna z `docs/frontend.md` / `SPEC-FRONTEND` / `SPEC-KOMUNIKACJA`; świadomie poza v1 nazwane. Utrwalenie w kodzie jako stałe tras (bez logiki ACL).

**Artefakty:**

- Nowy: `apps/web/lib/routes.ts`
- Nowy: `apps/web/lib/bff-surface.ts`

### Nowy plik - kompletny kod

`apps/web/lib/routes.ts`:

```typescript
/**
 * Kanoniczne ścieżki UI v1 - docs/frontend.md, SPEC-FRONTEND F-1…F-4, F-10.
 * Brak trasy detail UI (`/meetings/[id]`) w v1.
 */
export const uiRoutes = {
  auth: "/",
  meetings: "/meetings",
  search: "/search",
} as const;

export type UiRoute = (typeof uiRoutes)[keyof typeof uiRoutes];

/** Świadomie poza v1 UI (docs/frontend.md - poza v1). */
export const outOfScopeUiV1 = [
  "branding / design system produktowy",
  "osobna strona detail spotkania jako główna nawigacja",
  "ukrywanie Test za NEXT_PUBLIC_DEMO_UI",
  "chat Q&A / prawdziwa wyszukiwarka",
  "dark mode / PWA / mobile-first polish jako wymóg",
  "Playwright E2E jako must-have",
] as const;
```

`apps/web/lib/bff-surface.ts`:

```typescript
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
    bffPath: "/api/meetings/[id]/events",
    apiPath: "/meetings/:id/events",
    notes: "SSE text/event-stream - żywy proxy w Fazie 3",
  },
  {
    method: "POST",
    bffPath: "/api/demo/run-meeting",
    apiPath: "/demo/run-meeting",
  },
] as const;

export const bffForbidden = [
  "egzekucja ACL treści spotkań",
  "bezpośredni enqueue pg-boss",
  "wołanie adapterów źródła / LlmClient z pominięciem api+worker",
] as const;
```

**Biblioteki:** brak.

**Testy:** typecheck - pliki kompilują się w `strict`; brak runtime testów wymaganych w tym kroku.

**DoD (krok):**

- Stałe `uiRoutes` / `bffSurface` odzwierciedlają tabelę Meta powyżej i SPEC.
- `outOfScopeUiV1` oraz `bffForbidden` są w kodzie (świadome poza v1 / zakazy BFF).

---

### KROK 3 - Gotowość warstwy web do rozbudowy

**Status:** `WYKONANY`

**Cel:** Spełnić major **1.3** - warstwa web gotowa na layout i handlery BFF bez otwierania Fazy 1 backendu. Minimalny kontrakt env pod późniejszy proxy (bez sekretów w `NEXT_PUBLIC_*`).

**Artefakty:**

- Nowy: `apps/web/lib/env.ts`
- Nowy: `apps/web/.env.example` (tylko nazwy zmiennych / przykładowe wartości nie-sekretne)
- Zmiana (fragment): `apps/web/app/layout.tsx` - metadata robocza (pełny layout roboczy w FAZIE 2)

### Nowy plik - kompletny kod

`apps/web/lib/env.ts`:

```typescript
/**
 * Konfiguracja procesu web. Wrażliwe sekrety vendorów / JWT secret - nie tu
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
```

`apps/web/.env.example`:

```bash
# Server-only: bazowy URL Nest API (użycie w żywym proxy - Faza 3 majoru frontu).
# Przykład lokalny - bez sekretów.
API_BASE_URL=http://localhost:3001
```

### Refaktor - `teraz` → `zamień na`

Plik: `apps/web/app/layout.tsx` - tylko `metadata` (reszta layoutu w FAZIE 2 / KROK 1).

**Teraz:**

```typescript
export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};
```

**Zamień na:**

```typescript
export const metadata: Metadata = {
  title: "Firmowy asystent spotkań (web)",
  description: "Szkielet UI v1 - etap 0",
};
```

**Biblioteki:** brak nowych pakietów w tym kroku.

**Testy:** `pnpm exec tsc --noEmit` / `pnpm build` w `apps/web` przechodzi po dodaniu plików.

**DoD (krok):**

- `lib/env.ts` + `.env.example` bez `NEXT_PUBLIC_*` na sekrety.
- Metadata nie jest już create-next-app; da się wejść w FAZĘ 2 bez powrotu do fundamentu backendu.

#### Propozycja commit message

```text
chore(web): accept apps/web stub and lock UI/BFF surface map

Record v1 routes and BFF surface constants so Phase 2 can scaffold views without reopening monorepo foundation work.
```

---

## FAZA 2 - Szkielet powierzchni UI i BFF

**Kotwica major:** Faza 2 - Szkielet powierzchni UI i BFF.  
**Cel fazy:** placeholdery auth / sidebar / widoków, bazowy layout roboczy + tooling UI, szkielet Route Handlers BFF - gotowość do spięcia z API w Fazie 3.  
**Pass rozwojowy:** major **2.3** (layout/tooling) **przed** **2.1** (placeholdery); potem **2.2** (BFF).

### KROK 1 - Bazowy layout roboczy i tooling UI

**Status:** `WYKONANY`

**Cel:** Spełnić major **2.3** (przesunięty rozwojowo) - czytelny layout roboczy bez brandingu; Tailwind już obecny; inicjalizacja shadcn/ui jako środki (nie cel). Odwołania: `docs/frontend.md`, `SPEC-FRONTEND` (stack, F-18).

**Artefakty:**

- Zmiana: `apps/web/app/globals.css`
- Zmiana: `apps/web/app/layout.tsx`
- Nowe (CLI shadcn): `components.json`, `lib/utils.ts`, wybrane `components/ui/*` (button, input, label, table, separator)
- Nowy: `apps/web/components/app-shell.tsx` (szkielet ramki roboczej - bez sidebara dashboardu; ten w KROKU 2)

**Implementacja - kolejność:**

1. W `apps/web`: `pnpm dlx shadcn@latest init` (Tailwind 4 / istniejący CSS) - akceptuj ścieżki `@/components`, `@/lib/utils`.
2. Dodaj komponenty:
   ```bash
   pnpm dlx shadcn@latest add button input label table separator
   ```
   (Źródło komendy: registry shadcn; pełny `sidebar` **nie** jest wymagany w v1 - prosty nav własny w KROKU 2 wystarczy, żeby nie ciągnąć design systemu.)
3. Uprość motyw do layoutu roboczego (jasny, bez wymogu dark mode - `SPEC-FRONTEND` poza wersją).

### Refaktor - `globals.css`

Plik: `apps/web/app/globals.css`

**Teraz:** (fragment dark + Arial)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

**Zamień na:** (po `init` shadcn mogą dojść zmienne shadcn - **nie usuwaj** wymaganych przez CLI; usuń wymuszanie dark mode jako „produkt”. Docelowy body roboczy:)

```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
}
```

Jeśli shadcn dopisze własny blok `@theme` / zmienne - **scal**, nie walcz z CLI; zakaz: powrót do brandingowego dark hero create-next-app.

### Refaktor - root layout

Plik: `apps/web/app/layout.tsx`

**Teraz:**

```tsx
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

**Zamień na:**

```tsx
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
```

*(Zachowaj istniejące fonty Geist albo zamień na font z init shadcn - jedna rodzina; bez dokładania brandingu.)*

### Nowy plik - kompletny kod

`apps/web/components/app-shell.tsx`:

```tsx
import type { ReactNode } from "react";

type AppShellProps = {
  readonly children: ReactNode;
  readonly title?: string;
};

/**
 * Ramka robocza v1 - bez brandingu produktowego (docs/frontend.md).
 * RSC; bez logiki sesji (Faza 3).
 */
export function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      {title ? (
        <header>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </header>
      ) : null}
      <div className="flex-1">{children}</div>
    </div>
  );
}
```

**Biblioteki:**

- shadcn CLI (powyżej); Style: Tailwind 4 już w projekcie (`@import "tailwindcss"`).
- Context7 Next: layouty App Router; `lang` / children bez `params` w root.

**Testy:** `pnpm build` po init shadcn.

**DoD (krok):**

- shadcn zainicjalizowany; button/input/label/table/separator dostępne.
- Root layout roboczy (PL, bez create-next-app hero styling jako domyślnej treści - treść strony w KROKU 2).
- Layout nie blokuje formularza / tabeli / selecta limitu w Fazie 3.

---

### KROK 2 - Placeholdery auth, sidebar i widoków

**Status:** `WYKONANY`

**Cel:** Spełnić major **2.1** - szkielet `/` (login/register), layout po „zalogowaniu” (atrapa) z sidebarem: widok domyślny + wyszukiwarka; brak trasy detail UI. `SPEC-FRONTEND` F-1, F-3, F-4, F-10…F-12 (mock bez wołań API).

**Artefakty:**

- Zmiana: `apps/web/app/page.tsx` (auth)
- Nowy: `apps/web/components/auth-mode-toggle.tsx`
- Nowy: `apps/web/app/(dashboard)/layout.tsx`
- Nowy: `apps/web/components/dashboard-sidebar.tsx`
- Nowy: `apps/web/app/(dashboard)/meetings/page.tsx`
- Nowy: `apps/web/app/(dashboard)/search/page.tsx`
- Nowy: `apps/web/lib/search-mock.ts`

### Refaktor - strona główna auth

Plik: `apps/web/app/page.tsx`

**Teraz:** domyślny landing create-next-app (Image / Templates) - **zamień cały plik**.

**Zamień na (kompletny plik):**

```tsx
import { AppShell } from "@/components/app-shell";
import { AuthModeToggle } from "@/components/auth-mode-toggle";

export default function AuthPage() {
  return (
    <AppShell title="Logowanie / rejestracja">
      <p className="mb-6 max-w-lg text-sm text-muted-foreground">
        Szkielet UI v1. Sesja cookie HttpOnly i ochrona tras - Faza 3 (BFF →
        API). Tu tylko placeholdery formularza.
      </p>
      <AuthModeToggle />
    </AppShell>
  );
}
```

### Nowy plik - kompletny kod

`apps/web/components/auth-mode-toggle.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uiRoutes } from "@/lib/routes";

type AuthMode = "login" | "register";

/**
 * Placeholder auth - przełączanie trybu (SPEC-FRONTEND F-1).
 * Atrapa „sukcesu”: nawigacja na dashboard bez cookie (żywe auth = Faza 3).
 */
export function AuthModeToggle() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "login" ? "default" : "outline"}
          onClick={() => setMode("login")}
        >
          Logowanie
        </Button>
        <Button
          type="button"
          variant={mode === "register" ? "default" : "outline"}
          onClick={() => setMode("register")}
        >
          Rejestracja
        </Button>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          router.push(uiRoutes.meetings);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" />
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
          />
        </div>
        <Button type="submit">
          {mode === "login" ? "Zaloguj (stub)" : "Zarejestruj (stub)"}
        </Button>
      </form>
    </div>
  );
}
```

`apps/web/components/dashboard-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <aside className="flex w-full flex-col gap-3 sm:w-48">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Panel (stub)
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
      <Link
        href={uiRoutes.auth}
        className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
      >
        Wyloguj (stub)
      </Link>
    </aside>
  );
}
```

> Jeśli po `shadcn add button` eksport `buttonVariants` nie istnieje w lokalnym pliku - użyj klas Tailwind + `cn` zamiast `buttonVariants` (ten sam wygląd roboczy). Nie dodawaj logiki ACL.

`apps/web/app/(dashboard)/layout.tsx`:

```tsx
import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/dashboard-sidebar";

type DashboardLayoutProps = {
  readonly children: ReactNode;
};

/**
 * Layout po atrapie logowania - sidebar domyślny ↔ wyszukiwarka (F-3).
 * Ochrona sesji (redirect na `/`) - Faza 3.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:px-6">
      <DashboardSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
```

`apps/web/app/(dashboard)/meetings/page.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Widok domyślny - miejsce na tabelę + Test (F-5…F-8 w Fazie 3).
 * Brak trasy detail UI.
 */
export default function MeetingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Spotkania</h1>
        <Button type="button" disabled title="Podpięcie BFF/API - Faza 3">
          Test
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Placeholder tabeli. Limit 10/25/50/100 + <code>page</code> oraz SSE po
        Test - Faza 3.
      </p>

      <div className="flex items-center gap-2 text-sm">
        <span>Limit (stub):</span>
        <select
          className="rounded-md border bg-background px-2 py-1"
          defaultValue="10"
          disabled
          aria-label="Limit listy"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tytuł</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Podsumowanie</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3} className="text-muted-foreground">
              Brak danych - lista z API przez BFF w Fazie 3.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
```

`apps/web/lib/search-mock.ts`:

```typescript
/**
 * Statyczny mock wyszukiwarki - SPEC-FRONTEND F-11…F-12.
 * Zakaz wołań LLM / search / RAG z UI v1.
 */
export type SearchMockHit = {
  readonly id: string;
  readonly title: string;
  readonly snippet: string;
};

export const searchMockHits: readonly SearchMockHit[] = [
  {
    id: "mock-1",
    title: "Przykładowe spotkanie (atrapa)",
    snippet: "Wynik hardcodowany - bez backendu AI.",
  },
  {
    id: "mock-2",
    title: "Drugi wpis mock",
    snippet: "UI v1 nie woła endpointów search/LLM.",
  },
] as const;
```

`apps/web/app/(dashboard)/search/page.tsx`:

```tsx
import { Input } from "@/components/ui/input";
import { searchMockHits } from "@/lib/search-mock";

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Wyszukiwarka</h1>
      <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Atrapa: wyniki poniżej są hardcodowane. Brak wołań LLM / search /
        RAG w v1 (`SPEC-FRONTEND` F-12).
      </p>
      <Input
        type="search"
        placeholder="Szukaj (mock - bez API)"
        disabled
        aria-label="Pole wyszukiwania (mock)"
      />
      <ul className="flex flex-col gap-3">
        {searchMockHits.map((hit) => (
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

**Biblioteki:** `next/navigation` (`useRouter`, `usePathname`), `next/link` - App Router (Context7: layouty / nawigacja). `"use client"` tylko na interakcji (F-18).

**Testy:** ręcznie: `/` przełącza login/register; stub submit → `/meetings`; sidebar → `/search` i z powrotem; **brak** linku do `/meetings/[id]`.

**DoD (krok):**

- Nawigacja między placeholderami sidebar działa.
- Brak osobnej trasy detail UI jako ścieżki produktu.
- Wyszukiwarka ma jawną adnotację atrapy i nie woła API.

---

### KROK 3 - Szkielet BFF (proxy)

**Status:** `WYKONANY`

**Cel:** Spełnić major **2.2** - placeholdery Route Handlers pod auth / meetings / demo / SSE; cienkie proxy w kontrakcie powierzchni; **bez** ACL i **bez** omijania `api`. `SPEC-KOMUNIKACJA` K-6…K-7, `SPEC-FRONTEND` F-13…F-14. Context7: Route Handlers zwracają `Response`; cookies przez `cookies()` / nagłówki - **żywe** ustawianie cookie w Fazie 3; tu stub `501`.

**Artefakty:**

- Nowy: `apps/web/lib/bff-stub.ts`
- Nowy: `apps/web/app/api/auth/register/route.ts`
- Nowy: `apps/web/app/api/auth/login/route.ts`
- Nowy: `apps/web/app/api/auth/logout/route.ts`
- Nowy: `apps/web/app/api/auth/me/route.ts`
- Nowy: `apps/web/app/api/auth/refresh/route.ts`
- Nowy: `apps/web/app/api/meetings/route.ts`
- Nowy: `apps/web/app/api/meetings/[id]/route.ts`
- Nowy: `apps/web/app/api/meetings/[id]/events/route.ts`
- Nowy: `apps/web/app/api/demo/run-meeting/route.ts`

### Nowy plik - kompletny kod

`apps/web/lib/bff-stub.ts`:

```typescript
import type { BffMethod } from "@/lib/bff-surface";

export type BffStubBody = {
  readonly status: "BFF_STUB";
  readonly method: BffMethod;
  readonly bffPath: string;
  readonly apiPath: string;
  readonly message: string;
};

/**
 * Odpowiedź placeholdera BFF do Fazy 3.
 * Nie zawiera reguł ACL ani side-effectów kolejki.
 */
export function bffStubResponse(input: {
  readonly method: BffMethod;
  readonly bffPath: string;
  readonly apiPath: string;
}): Response {
  const body: BffStubBody = {
    status: "BFF_STUB",
    method: input.method,
    bffPath: input.bffPath,
    apiPath: input.apiPath,
    message:
      "Szkielet BFF - żywy proxy (cookie, SSE, demo) w Fazie 3 majoru frontu. Bez ACL w BFF.",
  };

  return Response.json(body, {
    status: 501,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
```

Wzór handlera auth (powtórz dla login / logout / me / refresh ze ścieżkami z `bffSurface`):

`apps/web/app/api/auth/register/route.ts`:

```typescript
import { bffStubResponse } from "@/lib/bff-stub";

export function POST(): Response {
  return bffStubResponse({
    method: "POST",
    bffPath: "/api/auth/register",
    apiPath: "/auth/register",
  });
}
```

`apps/web/app/api/auth/login/route.ts`:

```typescript
import { bffStubResponse } from "@/lib/bff-stub";

export function POST(): Response {
  return bffStubResponse({
    method: "POST",
    bffPath: "/api/auth/login",
    apiPath: "/auth/login",
  });
}
```

`apps/web/app/api/auth/logout/route.ts`:

```typescript
import { bffStubResponse } from "@/lib/bff-stub";

export function POST(): Response {
  return bffStubResponse({
    method: "POST",
    bffPath: "/api/auth/logout",
    apiPath: "/auth/logout",
  });
}
```

`apps/web/app/api/auth/me/route.ts`:

```typescript
import { bffStubResponse } from "@/lib/bff-stub";

export function GET(): Response {
  return bffStubResponse({
    method: "GET",
    bffPath: "/api/auth/me",
    apiPath: "/auth/me",
  });
}
```

`apps/web/app/api/auth/refresh/route.ts`:

```typescript
import { bffStubResponse } from "@/lib/bff-stub";

export function POST(): Response {
  return bffStubResponse({
    method: "POST",
    bffPath: "/api/auth/refresh",
    apiPath: "/auth/refresh",
  });
}
```

`apps/web/app/api/meetings/route.ts`:

```typescript
import { bffStubResponse } from "@/lib/bff-stub";

export function GET(): Response {
  return bffStubResponse({
    method: "GET",
    bffPath: "/api/meetings",
    apiPath: "/meetings",
  });
}
```

`apps/web/app/api/meetings/[id]/route.ts`:

```typescript
import { bffStubResponse } from "@/lib/bff-stub";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return bffStubResponse({
    method: "GET",
    bffPath: `/api/meetings/${id}`,
    apiPath: `/meetings/${id}`,
  });
}
```

`apps/web/app/api/meetings/[id]/events/route.ts`:

```typescript
import { bffStubResponse } from "@/lib/bff-stub";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

/**
 * Placeholder SSE. Żywy proxy `text/event-stream` - Faza 3
 * (Context7: streaming Response; tu bez strumienia).
 */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return bffStubResponse({
    method: "GET",
    bffPath: `/api/meetings/${id}/events`,
    apiPath: `/meetings/${id}/events`,
  });
}
```

`apps/web/app/api/demo/run-meeting/route.ts`:

```typescript
import { bffStubResponse } from "@/lib/bff-stub";

export function POST(): Response {
  return bffStubResponse({
    method: "POST",
    bffPath: "/api/demo/run-meeting",
    apiPath: "/demo/run-meeting",
  });
}
```

**Zakazy w implementacji tego kroku (egzekwowalne w review):**

- Brak Prisma / pg-boss / reguł „czy user widzi meeting” w handlerach.
- Brak `NEXT_PUBLIC_*` z sekretami.
- Brak pełnego proxy do API „na zapas” bez kontraktu Fazy 3 - stub ma być czytelny.

**Biblioteki:** App Router Route Handlers (`route.ts`); `params` jako `Promise` (Next 15+ / 16 - Context7). Cookies API - **nie** wymagane w stubie `501`.

**Testy:** `curl -i -X POST http://localhost:3000/api/auth/login` → `501` + JSON `BFF_STUB`; analogicznie `GET /api/meetings`, `GET /api/meetings/demo-id/events`, `POST /api/demo/run-meeting`. Typecheck przechodzi.

**DoD (krok):**

- Wszystkie pozycje z mapy BFF (Meta) mają pliki handlerów.
- Odpowiedzi stub nie zawierają logiki ACL / enqueue.
- Komentarze / body wskazują docelowe `apiPath` pod Fazę 3.

#### Propozycja commit message

```text
feat(web): scaffold UI placeholders and stub BFF route surface

Provide auth/dashboard shells and 501 BFF handlers so Phase 3 can wire cookies, meetings, demo, and SSE without rebuilding the view map.
```

---

## Weryfikacja wycinka

| Kryterium | Jak sprawdzić |
|-----------|----------------|
| Pokrycie kotwicy major F1+F2 | Kroki 1.1–1.3 oraz 2.1–2.3 (z przesunięciem 2.3→2.1 w kolejności feature) mają `KROK` z DoD |
| Zgodność docs/SPEC | Trasy UI / BFF / zakazy = `docs/frontend.md`, `SPEC-FRONTEND`, `SPEC-KOMUNIKACJA`; brak detail UI; mock search bez LLM |
| Pass rozwojowy | Layout/tooling przed placeholderami; BFF po UI surface |
| Kod nowych plików | Kompletny w planie; refaktory jako `teraz → zamień na` |
| Nagłówki | Wyłącznie `FAZA` / `KROK`; commit message EN na końcu każdej fazy |
| Testy | Smoke ręczne + build; bez Playwright must-have |
| Major nietknięty | Statusy major aktualizuje się **po** implementacji (poza tą sesją) |

### Ślad do major (informacyjnie, po późniejszej implementacji)

| Element major frontu | Po implementacji tego wycinka |
|----------------------|-------------------------------|
| Faza 1 | `WYKONANY` |
| MILESTONE - Stub web zaakceptowany pod UI v1 | `OSIĄGNIĘTY` |
| Faza 2 | `WYKONANY` |
| MILESTONE - Szkielet UI/BFF gotowy do spięcia z API | `OSIĄGNIĘTY` |
| Faza 3+ | bez zmian (`NIE_ROZPOCZĘTY`) |

Ten skill **nie** edytuje pliku major.
