# Vinseo Recruitment Task - feature plan: Faza 3.6 frontend (button nagrania + BFF on-demand)

**Lokalizacja:** `feature-plans/vinseo-recruitment-task_feature_plan_frontend-faza-3-6-recording-ondemand.md`  
**Kotwica major:** `vinseo-recruitment-task-frontend_major-plan.md` — **Faza 3.6** (kroki **3.6.1**, **3.6.2**), do MILESTONE „Button nagrania demo + BFF on-demand”.  
**Rozszerzenie względem:** Faza 3 (panel v1; `WYKONANY`) oraz Faza 3.5 (UI Test; `WYKONANY`) — bez edycji ich treści ani milestone’ów `OSIĄGNIĘTY`.  
**Zależność zewnętrzna (DoD oddania):** `vinseo-recruitment-task-backend_major-plan.md` — **Faza 3.6** (szkielet on-demand mock) jest już `WYKONANY` + MILESTONE API `OSIĄGNIĘTY`; front spina BFF + button z żywym `GET /meetings/:id/recording`.  
**Źródła:** `docs/frontend.md`, `docs/data_flow.md` (§3a), `docs/dokumentacja_komunikacji.md` (1.2a), `docs/bezpieczenstwo_i_rodo.md`; `spec/SPEC-FRONTEND.md` (F-7a, F-13/F-14, F-18), `spec/SPEC-KOMUNIKACJA.md` (K-5b, K-6…K-7), `spec/SPEC-AUTH_I_ACL.md` (AC-2/AC-3 — ACL tylko w `api`), `spec/SPEC-TESTY.md` (T-13 smoke; T-11a = API, poza wycinkiem web).  
**Kod bazowy:** `apps/web` (Next.js `16.4.3`, React `19`, `strict`) + `@vinseo/contracts` (`MeetingRecordingDto`).  
**Statusy kroków feature:** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`

---

## Meta

| Pole | Wartość |
|------|---------|
| Wycinek | BFF `GET /api/meetings/:id/recording` + button nagrania zawsze widoczny w wierszu tabeli; klik → BFF → `{ url }` → otwarcie URL |
| Major | Faza 3.6 (3.6.1 + 3.6.2) |
| Pass rozwojowy | Mapa `bff-surface` + Route Handler → UI button / otwarcie URL; **brak przesunięć** względem kolejności major |
| Poza zakresem wycinka | Nest recording / mock port (backend 3.6), persist URL (zakaz D-7b), egzekucja zgody w UI, Playwright, trasa detail, Faza 4–5 frontu, prawdziwy Fireflies |
| Typy na granicach | Odpowiedź BFF/API: `MeetingRecordingDto` (`{ url: string }` z `@vinseo/contracts`); Route Handler: `params: Promise<{ id: string }>` (jak istniejące `[id]` / `[id]/events`); brak `any` |
| Biblioteki (research) | Context7 `/vercel/next.js/v16.2.9`: Route Handlers App Router — `GET(request, { params }: { params: Promise<{ id: string }> })`, `await params`; proxy przez istniejący `bffProxyJson`; klient: `fetch(..., { credentials: "same-origin" })` + `window.open(url, "_blank", "noopener,noreferrer")`. **SPEC wygrywa** przy konflikcie. |

### Założenia (odwołania)

- Button nagrania **zawsze widoczny** po zalogowaniu w wierszu tabeli (demo v0) — `SPEC-FRONTEND` F-7a, `docs/frontend.md`, `docs/bezpieczenstwo_i_rodo.md` (świadomy wyjątek).
- Ścieżka kliknięcia: UI → BFF → `api` → JSON `{ url }` → otwarcie (nowe okno/karta). **Zakaz** hardcodu URL wyłącznie w React jako jedynej ścieżki „produkcyjnej”.
- BFF: cienkie proxy cookie HttpOnly; **bez** ACL, **bez** resolve mocka — F-14 / K-6…K-7; ACL i 404 bez wycieku istnienia pozostają w `api` (AC-3 / K-5b).
- Brak redirectu HTTP 302 jako kontraktu odpowiedzi (K-5b) — BFF przekazuje status/body 1:1 jak pozostałe JSON meetings.
- Adnotacja produktowa w UI: docelowo widoczność wg zgody (po FF + procesie) — poza must-have modelu zgody w v0.
- Typowanie: `import type` dla DTO; importy wartości frameworka / Web API przed lokalnymi; DTO z `@vinseo/contracts`.

---

## FAZA 1 — Button nagrania (demo) + BFF on-demand

**Kotwica major:** Faza 3.6 — Button nagrania (demo) + BFF on-demand.  
**Cel fazy:** Domknąć BFF proxy recording oraz UI buttonu demo zgodnie z DoD Fazy 3.6 majoru frontu (F-7a / K-5b).

---

### KROK 1 — BFF proxy recording

**Status:** `WYKONANY`

**Cel:** Route Handler BFF `GET /api/meetings/[id]/recording` proxy’uje do `GET /meetings/:id/recording` z cookie; statusy/błędy jak pozostałe trasy meetings JSON. Przygotowanie pod major **3.6.1**. Odwołania: `SPEC-KOMUNIKACJA` K-5b / mapa BFF, `SPEC-FRONTEND` F-13/F-14, `docs/dokumentacja_komunikacji.md` §2.

**Artefakty:**

- Nowy: `apps/web/app/api/meetings/[id]/recording/route.ts`
- Zmiana: `apps/web/lib/bff-surface.ts` — wpis powierzchni recording

**Biblioteki / API:** Context7 Next 16 — `params` jako `Promise`; istniejący `bffProxyJson` (przekaz Cookie, `Cache-Control: no-store`, relay statusu/body). Bez egzekucji ACL i bez walidacji domenowej id w BFF (poza tym, że id pochodzi z segmentu ścieżki).

**Implementacja — nowy plik (kompletny)**

`apps/web/app/api/meetings/[id]/recording/route.ts`:

```typescript
import { bffProxyJson } from "@/lib/bff-proxy";

type RouteContext = {
  readonly params: Promise<{ id: string }>;
};

/**
 * BFF recording — cienkie proxy (F-14 / K-5b).
 * ACL i 404 bez wycieku istnienia egzekwuje wyłącznie apps/api.
 */
export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return bffProxyJson({
    method: "GET",
    apiPath: `/meetings/${id}/recording`,
    request,
  });
}
```

**Refaktor — `teraz` → `zamień na`**

Plik: `apps/web/lib/bff-surface.ts` — dopisz trasę recording w tablicy `bffSurface` (po wpisie detail / przed SSE albo zaraz po SSE; zachowaj `as const`).

**Teraz (fragment — brak wpisu recording):**

```typescript
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
```

**Zamień na:**

```typescript
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
```

**Testy:** brak obowiązkowego unit BFF w v1 (`SPEC-TESTY` T-13 = smoke build/typecheck web). Ręcznie / smoke: zalogowany `GET /api/meetings/<własne-id>/recording` → 200 + `{ url }`; bez sesji → status jak z API (401/404 wg Nest); cudze id → 404 (API).

**DoD kroku:**

- Istnieje Route Handler `GET /api/meetings/[id]/recording` używający `bffProxyJson` (cookie, bez ACL w Next).
- `bffSurface` wymienia trasę recording ↔ API.
- Status/body upstreamu są przekazywane (w tym 404 z API); brak hardcodu mock URL w BFF.

---

### KROK 2 — Button nagrania demo + otwarcie URL

**Status:** `WYKONANY`

**Cel:** W widoku domyślnym (`MeetingsDashboard`) w każdym wierszu tabeli zawsze widoczny przycisk nagrania; po sukcesie odpowiedzi otwarcie `url` z `MeetingRecordingDto`. Adnotacja demo/RODO. Major **3.6.2** / `SPEC-FRONTEND` F-7a, F-18 (`"use client"` już na dashboardzie).

**Artefakty:**

- Zmiana: `apps/web/components/meetings-dashboard.tsx`

**Biblioteki / API:** `fetch` same-origin do BFF; `window.open` po sukcesie; typ `MeetingRecordingDto` z kontraktów. UI **nie** buduje produkcyjnej ścieżki z hardcodu `https://example.com/...` (mock pochodzi z API).

**Refaktor — `teraz` → `zamień na` (fragmenty)**

Plik: `apps/web/components/meetings-dashboard.tsx`.

**1) Import typu recording**

**Teraz:**

```typescript
import type {
  DemoRunMeetingResponseDto,
  MeetingListItemDto,
  MeetingListResponseDto,
  MeetingStatusEventDto,
  MeetingListLimit,
} from "@vinseo/contracts";
```

**Zamień na:**

```typescript
import type {
  DemoRunMeetingResponseDto,
  MeetingListItemDto,
  MeetingListResponseDto,
  MeetingRecordingDto,
  MeetingStatusEventDto,
  MeetingListLimit,
} from "@vinseo/contracts";
```

**2) Stan busy / błąd nagrania (obok `testBusy` / `testError`)**

**Teraz:**

```typescript
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
```

**Zamień na:**

```typescript
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [recordingBusyId, setRecordingBusyId] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
```

**3) Handler kliknięcia (wstaw po `onTest`, przed `totalPages`)**

```typescript
  async function onOpenRecording(meetingId: string) {
    setRecordingBusyId(meetingId);
    setRecordingError(null);
    try {
      const res = await fetch(
        `/api/meetings/${encodeURIComponent(meetingId)}/recording`,
        { credentials: "same-origin" },
      );
      if (!res.ok) {
        setRecordingError(
          res.status === 404
            ? "Nie udało się otworzyć nagrania (brak dostępu lub zasób)."
            : "Nie udało się pobrać linku do nagrania.",
        );
        return;
      }
      const data = (await res.json()) as MeetingRecordingDto;
      if (typeof data.url !== "string" || data.url.length === 0) {
        setRecordingError("Odpowiedź nagrania bez poprawnego url.");
        return;
      }
      const opened = window.open(data.url, "_blank", "noopener,noreferrer");
      if (opened == null) {
        setRecordingError(
          "Przeglądarka zablokowała nowe okno. Odblokuj popupy dla tej strony.",
        );
      }
    } catch {
      setRecordingError("Błąd sieci przy pobieraniu nagrania.");
    } finally {
      setRecordingBusyId(null);
    }
  }
```

**4) UI: adnotacja + alert + kolumna Akcje**

**Teraz (nagłówek / błędy Test / tabela):**

```tsx
      {testError ? (
        <p className="text-sm text-destructive" role="alert">
          {testError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm">
```

…oraz:

```tsx
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
```

**Zamień na:**

```tsx
      {testError ? (
        <p className="text-sm text-destructive" role="alert">
          {testError}
        </p>
      ) : null}

      {recordingError ? (
        <p className="text-sm text-destructive" role="alert">
          {recordingError}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Przycisk „Nagranie” jest zawsze widoczny w v0 (demo szkieletu
        on-demand). Docelowo widoczność będzie powiązana ze zgodą na
        nagrywanie.
      </p>

      <div className="flex flex-wrap items-center gap-3 text-sm">
```

…oraz:

```tsx
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tytuł</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Podsumowanie / błąd</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
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
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={recordingBusyId === row.id}
                      onClick={() => {
                        void onOpenRecording(row.id);
                      }}
                    >
                      {recordingBusyId === row.id ? "…" : "Nagranie"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
```

**Kolejność w kroku:** najpierw import + stan + `onOpenRecording`, potem JSX (adnotacja, alert, kolumna). Button **w każdym wierszu** (także przy pustym wyniku pipeline) — F-7a „zawsze widoczny”; brak warunku na `processingStatus` / hardcodzie URL.

**Testy:** smoke `pnpm --filter @vinseo/web build` (T-13). Ręcznie: po Test + wierszu klik „Nagranie” → nowe okno z mock URL z API; brak hardcodu URL w bundlu jako ścieżki produkcyjnej (jedyna ścieżka = BFF).

**DoD kroku:**

- Po zalogowaniu button „Nagranie” jest widoczny w każdym wierszu listy v1.
- Klik → `GET /api/meetings/:id/recording` (cookie) → przy 200 otwarcie `url` z JSON.
- Widoczna adnotacja demo / docelowa zgoda.
- Brak hardcodu produkcyjnego URL w React jako jedynej ścieżki; błędy 4xx/sieci pokazane użytkownikowi.

---

#### Propozycja commit message

```text
feat(web): add recording BFF proxy and always-visible demo button

Wire GET /api/meetings/:id/recording to the API on-demand contract and open
the returned url from each meetings table row without hardcoding media URLs.
```

---

## Weryfikacja wycinka

| Kryterium | Oczekiwanie |
|-----------|-------------|
| Kotwica major 3.6.1 | BFF proxy recording działa (cookie, bez ACL w Next) |
| Kotwica major 3.6.2 | Button zawsze widoczny; otwarcie `url` z JSON |
| `SPEC-FRONTEND` F-7a | Ścieżka BFF/API; zakaz hardcodu jako produkcji |
| `SPEC-KOMUNIKACJA` K-5b | Proxy `GET …/recording` → `{ url }` |
| `SPEC-AUTH_I_ACL` | UI/BFF nie omijają 404 API bez ACL |
| Docs | Zgodność z `frontend.md` / `data_flow.md` §3a |
| Smoke | `next build` / typecheck web bez regresji typów |
| Poza zakresem | Brak zmian Nest, Prisma, Playwright, modelu zgody |

## Ślad do major (informacyjnie, po implementacji)

Po realnej implementacji (poza tą sesją) w `vinseo-recruitment-task-frontend_major-plan.md` można oznaczyć:

- Faza 3.6 → `WYKONANY`
- Krok 3.6.1, 3.6.2 → `WYKONANY`
- MILESTONE „Button nagrania demo + BFF on-demand” → `OSIĄGNIĘTY`

Ten plik feature planu **nie** zmienia major.
)
