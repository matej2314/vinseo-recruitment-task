# Vinseo Recruitment Task - feature plan: Faza 3.5 frontend (UI Test multi-tester / K-5)

**Lokalizacja:** `feature-plans/vinseo-recruitment-task_feature_plan_frontend-faza-3-5-demo-multi-tester.md`  
**Kotwica major:** `vinseo-recruitment-task-frontend_major-plan.md` - **Faza 3.5** (kroki **3.5.1**, **3.5.2**), do MILESTONE „UI Test multi-tester zgodny z API dema”.  
**Refaktor względem:** Faza 3 / Krok 3.4 - Test, SSE i aktualizacja wiersza (`WYKONANY`); MILESTONE „Panel v1 działa z API” (`OSIĄGNIĘTY`) - bez przepisywania treści źródeł.  
**Zależność zewnętrzna (DoD oddania):** `vinseo-recruitment-task-backend_major-plan.md` - **Faza 3.5** (tożsamość DEMO/Test: UUID runu, katalog 10, losowanie API) musi być `WYKONANY` przed uznaniem KROK 3 / fazy frontu za domkniętą.  
**Źródła:** `docs/frontend.md`, `docs/data_flow.md`, `docs/dokumentacja_komunikacji.md`, `spec/SPEC-FRONTEND.md` (F-7/F-8), `spec/SPEC-KOMUNIKACJA.md` (K-5/K-5a), `spec/SPEC-TESTY.md` (T-13 smoke).  
**Kod bazowy:** `apps/web` (Next.js `16.4.3`, React `19`, `strict`) + `@vinseo/contracts`.  
**Statusy kroków feature:** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`

---

## Meta

| Pole | Wartość |
|------|---------|
| Wycinek | UI/BFF Test pod kontrakt DEMO multi-tester: bez wyboru fixture, własne `meetingId` per run, rosnąca lista, SSE |
| Major | Faza 3.5 (3.5.1 + 3.5.2) |
| Pass rozwojowy | BFF bez wymaganego `fixtureKey` → Dashboard Test/SSE → weryfikacja na żywym API po backend 3.5 |
| Poza zakresem wycinka | Implementacja Nest/demo UUID (backend Faza 3.5), DX `/dev/meetings/enqueue`, Faza 4–5 frontu, Playwright, trasa detail UI, UI wyboru fixture |
| Biblioteki (research) | Context7 `/vercel/next.js/v16.2.9`: Route Handlers App Router - `POST(request: Request)`, odczyt body przez `request.json()` (opcjonalnie; przy pustym body nie wymuszać parse), `Response` / proxy przez istniejący `bffProxyJson`; klient: `fetch(..., { credentials: "same-origin" })` + `EventSource` wobec BFF. **SPEC wygrywa** przy konflikcie. |

### Założenia (odwołania)

- Przycisk Test zawsze widoczny; **bez** UI wyboru fixture - losowanie po stronie API (katalog 10) - `SPEC-FRONTEND` F-7, `docs/frontend.md` §3.
- Po sukcesie: `meetingId` z odpowiedzi = własny run sesji → SSE przez BFF → zostaj na widoku; tabela aktualizuje / **dokłada** wiersz; ponowny Test = kolejny wiersz - F-8.
- Multi-tester: brak założenia jednego globalnego wiersza dema między kontami - F-8.5 / K-5.
- BFF: cienkie proxy; **nie** egzekwuje ACL, **nie** losuje fixture, **nie** nadaje UUID - F-14 / K-6…K-7.
- Request demo: ciało **puste** lub opcjonalne pola; klient **nie** wskazuje tożsamości spotkania - `docs/dokumentacja_komunikacji.md` (DEMO/Test).
- Typowanie: brak `any`; `import type` dla DTO; importy: wartości frameworka (`next` / Web API) przed lokalnymi; DTO z `@vinseo/contracts`.

### Stan wyjściowy (dlaczego refaktor)

Obecny kod **wymusza stary kontrakt** po stronie web:

- `MeetingsDashboard` hardcoduje `DEMO_FIXTURE_KEY` i wysyła `{ fixtureKey }` w body.
- BFF `POST /api/demo/run-meeting` zwraca 400, gdy brak `fixtureKey`.

`upsertRow` już dokłada wiersz przy nowym `id` - zachować; usunąć założenie współdzielonego fixture jako tożsamości.

---

## FAZA 1 - UI Test pod nowy kontrakt DEMO (multi-tester)

**Kotwica major:** Faza 3.5 - UI Test pod nowy kontrakt DEMO (multi-tester).  
**Cel fazy:** Domknąć ścieżkę użytkownika Test pod K-5 (UUID runu / multi-tester / rosnąca lista / bez wyboru fixture w UI) zgodnie z DoD Fazy 3.5 majoru frontu.

---

### KROK 1 - BFF demo: body bez wymaganego `fixtureKey`

**Status:** `W_TRAKCIE`

**Cel:** Route Handler demo nie wymaga ani nie egzekwuje wyboru mocka; przekazuje POST do Nest z pustym / opcjonalnym body zgodnie z K-5. Przygotowanie pod major **3.5.1** i F-7 (web nie jest właścicielem losowania). Odwołania: `SPEC-KOMUNIKACJA` K-5/K-6, `SPEC-FRONTEND` F-13/F-14, `docs/dokumentacja_komunikacji.md`.

**Artefakty:**

- Zmiana: `apps/web/app/api/demo/run-meeting/route.ts`
- Zmiana (opcjonalna, preferowana): `packages/contracts/src/meetings-api.ts` - typ requestu dema (puste / opcjonalne `fixtureKey`)
- Zmiana: `apps/web/lib/bff-surface.ts` - nota przy trasie demo (bez `fixtureKey` jako wymogu UI)

**Biblioteki / API:** Context7 Next 16 Route Handlers - nie wywoływać `request.json()` jako twardego wymogu; przy braku / niepoprawnym JSON traktować body jak puste i proxy’ować dalej (kontrakt: ciało może być puste). Upstream: istniejący `bffProxyJson`.

**Implementacja - typ requestu (contracts)**

W `packages/contracts/src/meetings-api.ts` dopisz (obok `DemoRunMeetingResponseDto`):

```typescript
/**
 * Body `POST /demo/run-meeting` (DEMO/Test).
 * Klient UI nie musi nic wysyłać; opcjonalne `fixtureKey` - jeśli obecne -
 * API może zignorować / nadpisać losowaniem (K-5).
 */
export interface DemoRunMeetingRequestDto {
  readonly fixtureKey?: string;
}
```

Eksport przez istniejący `packages/contracts/src/index.ts` (jeśli re-exportuje `meetings-api` - bez zmian lub dopilnuj re-exportu).

**Refaktor - `teraz` → `zamień na`**

Plik: `apps/web/app/api/demo/run-meeting/route.ts` (cały handler).

**Teraz:**

```typescript
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

**Zamień na:**

```typescript
import type { DemoRunMeetingRequestDto } from "@vinseo/contracts";

import { bffProxyJson } from "@/lib/bff-proxy";

/**
 * BFF demo - cienkie proxy (F-14).
 * Nie wymaga fixtureKey: wybór mocka należy do API (K-5).
 * Puste body / brak JSON → proxy `{}`.
 * Jeśli klient prześle string `fixtureKey`, przekazujemy go dalej
 * (API może zignorować / nadpisać); nie egzekwujemy obecności pola.
 */
export async function POST(request: Request): Promise<Response> {
  let upstreamBody: DemoRunMeetingRequestDto = {};

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const raw: unknown = await request.json();
      if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
        const record = raw as Record<string, unknown>;
        const fixtureKey = record.fixtureKey;
        if (typeof fixtureKey === "string" && fixtureKey.length > 0) {
          upstreamBody = { fixtureKey };
        }
      }
    } catch {
      // Puste / niepoprawne JSON przy deklarowanym JSON - traktuj jak {}
      upstreamBody = {};
    }
  }

  return bffProxyJson({
    method: "POST",
    apiPath: "/demo/run-meeting",
    request,
    contentType: "application/json",
    body: JSON.stringify(upstreamBody),
  });
}
```

**Refaktor - nota powierzchni BFF**

Plik: `apps/web/lib/bff-surface.ts` - wpis demo.

**Teraz:**

```typescript
  {
    method: "POST",
    bffPath: "/api/demo/run-meeting",
    apiPath: "/demo/run-meeting",
  },
```

**Zamień na:**

```typescript
  {
    method: "POST",
    bffPath: "/api/demo/run-meeting",
    apiPath: "/demo/run-meeting",
    notes:
      "Body puste lub opcjonalne; UI nie wymaga fixtureKey - losowanie po stronie API (K-5)",
  },
```

**Testy:** brak nowego harnessu Playwright (poza zakresem). Smoke: typecheck / `next build` w KROK 3 (T-13). Ręcznie: `POST /api/demo/run-meeting` z pustym body `{}` nie zwraca 400 z komunikatem „fixtureKey is required” z **BFF** (odpowiedź Nest zależy od gotowości backend Fazy 3.5).

**DoD kroku:**

- BFF nie zwraca `VALIDATION_ERROR` z powodu braku `fixtureKey`.
- Handler nie egzekwuje ACL ani losowania fixture.
- Typ `DemoRunMeetingRequestDto` (opcjonalne pole) jest w contracts albo jawnie pominięty z uzasadnieniem w nocie implementacji - preferuj dodanie typu.
- `bff-surface` dokumentuje kontrakt bez wymogu fixture w UI.

---

### KROK 2 - Dashboard: Test bez fixture + SSE / rosnąca lista

**Status:** `W_TRAKCIE`

**Cel:** UI po `POST` demo traktuje każdy sukces jako własny `meetingId`; otwiera SSE; tabela aktualizuje / dokłada wiersz; ponowny Test = kolejny wiersz; **brak** selektora / hardcodu fixture. Major **3.5.1**; `SPEC-FRONTEND` F-7/F-8; `docs/data_flow.md` §2.

**Artefakty:**

- Zmiana: `apps/web/components/meetings-dashboard.tsx`

**Biblioteki / API:** natywny `fetch` + `EventSource` wobec BFF (F-9, stack SPEC); bez React Query.

**Refaktor - `teraz` → `zamień na`**

Plik: `apps/web/components/meetings-dashboard.tsx`.

1) Usuń stałą fixture:

**Teraz:**

```typescript
const DEMO_FIXTURE_KEY = "demo-client-budget-pl";
```

**Zamień na:** *(usuń deklarację - brak zamiennika)*

2) `onTest` - body bez `fixtureKey`:

**Teraz:**

```typescript
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
```

**Zamień na:**

```typescript
  async function onTest() {
    setTestBusy(true);
    setTestError(null);
    try {
      const res = await fetch("/api/demo/run-meeting", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setTestError("Nie udało się uruchomić demo.");
        return;
      }
      const data = (await res.json()) as DemoRunMeetingResponseDto;
      // Każdy sukces = własny meetingId runu (F-8); upsert dokłada wiersz przy nowym id
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
```

3) **Bez zmian wymaganych** w `upsertRow` / `openSse` - już:
- dokłada wiersz, gdy `id` nie istnieje (`rows: [patch, ...prev.rows]`, `total + 1`);
- aktualizuje in-place przy tym samym `id`;
- zamyka SSE na `completed` | `failed`;
- **nie** robi redirectu na detail.

Upewnij się w przeglądzie diffu, że nie ma UI (select/input) wyboru fixture oraz że przycisk Test pozostaje zawsze widoczny po zalogowaniu.

**Testy:** ręczna ścieżka po domknięciu backend 3.5 (formalnie KROK 3): dwukrotny Test → dwa wiersze; SSE aktualizuje statusy. Smoke build w KROK 3.

**DoD kroku:**

- Brak `DEMO_FIXTURE_KEY` / body z wymuszonym fixture w UI.
- Brak selektora fixture w JSX.
- Po sukcesie enqueue UI używa wyłącznie `meetingId` z odpowiedzi + SSE dla tego id.
- `upsertRow` nadal dokłada nowy wiersz przy nowym id (ponowny Test = rosnąca lista w stanie lokalnym).
- Brak redirectu / nawigacji na detail po Test.

---

### KROK 3 - Spójność z kontraktem API dema (po backend Faza 3.5)

**Status:** `NIE_ROZPOCZĘTY`

**Cel:** Potwierdzić, że BFF/UI nie wymuszają starego kontraktu (współdzielony `fixtureKey` jako tożsamość) i że ścieżka Test działa na żywym API po K-5. Major **3.5.2**; zależność od backend Fazy 3.5 jest **jawna** w DoD.

**Artefakty:**

- Brak obowiązkowych nowych plików aplikacji.
- Ewentualne poprawki regresyjne wyłącznie w plikach z KROK 1–2, jeśli weryfikacja ujawni lukę **po stronie web** (np. pozostały hardcode).
- Smoke: typecheck / `pnpm --filter @vinseo/web build` (lub równoważne z root) - `SPEC-TESTY` T-13.

**Zależność (twarda dla DoD tego kroku):**

Backend Faza 3.5 `WYKONANY` (UUID runu, `organizerId` sesji, losowy `fixtureKey` z katalogu 10, `fixtureKey` ≠ tożsamość wiersza). Bez tego KROK 3 **nie** domyka się „na stubie” - status zostaje `NIE_ROZPOCZĘTY` / wstrzymany do gotowości API.

**Checklist weryfikacji (obserwowalna):**

| # | Sprawdzenie | Oczekiwanie |
|---|-------------|-------------|
| 1 | Grep `apps/web` na `fixtureKey` / `DEMO_FIXTURE_KEY` | Brak wymuszania w UI; BFF nie wymaga pola |
| 2 | `POST /api/demo/run-meeting` z `{}` (zalogowany) | 200 + `meetingId`, `jobId`, `status: "pending"` |
| 3 | SSE `/api/meetings/:id/events` dla zwróconego id | Statusy `pending`→…→`completed`\|`failed`; wiersz aktualizowany |
| 4 | Ponowny Test tej samej sesji | **Nowy** `meetingId` + drugi wiersz (lista rośnie) |
| 5 | Druga sesja / drugi user (multi-tester) | Własne wiersze; brak „kradzieży” cudzego dema w liście ACL |
| 6 | Brak UI wyboru fixture | Potwierdzone wizualnie / w JSX |
| 7 | Smoke | `next build` / typecheck web OK |

**Poza zakresem weryfikacji tego kroku:** zmiana semantyki DX `/dev/meetings/enqueue`; katalog 10 po stronie worker/source (backend).

**DoD kroku:**

- Checklist 1–7 spełniony na żywym stacku po backend Faza 3.5.
- Brak regresji Fazy 3 UI poza zamierzonym kontraktem dema (auth, paginacja, mock search, SSE bez redirectu).
- Jawny zapis w nocie oddania: zależność backend 3.5 domknięta.

---

#### Propozycja commit message

```text
feat(web): align Test flow with multi-tester demo contract

Stop requiring fixtureKey in BFF/UI so each Test uses the API-owned run id and growing list semantics.
```

---

## Weryfikacja wycinka

| Kryterium | Źródło |
|-----------|--------|
| Test bez UI fixture; losowanie API | F-7, K-5, major 3.5.1 |
| `meetingId` z odpowiedzi + SSE + upsert/dokładanie; ponowny Test = kolejny wiersz | F-8, major 3.5.1 |
| Multi-tester / brak globalnego wiersza dema w założeniach UI | F-8, K-5, major 3.5.2 |
| BFF bez ACL / bez wyboru mocka | F-14 |
| Smoke web | T-13 |
| Zależność backend Faza 3.5 | major front 3.5 DoD + major backend 3.5 |

**Pass rozwojowy (sesja):** KROK 1 → KROK 2 → KROK 3; bez dalszych przesunięć.

---

## Ślad do major (informacyjnie - edycja major poza tym skillem)

Po **realnej** implementacji i spełnieniu DoD:

| Element major frontendu | Po implementacji |
|-------------------------|------------------|
| Faza 3.5 | `WYKONANY` |
| Krok 3.5.1 | `WYKONANY` |
| Krok 3.5.2 | `WYKONANY` |
| MILESTONE - UI Test multi-tester zgodny z API dema | `OSIĄGNIĘTY` (gdy DoD milestone + zależność backend 3.5) |

Ten feature plan **nie** zmienia plików major ani nie uruchamia implementacji kodu.
)
