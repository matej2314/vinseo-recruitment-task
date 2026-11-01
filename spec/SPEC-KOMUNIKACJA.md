---
wersja: 11
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-11-01
---

# SPEC - Komunikacja (powierzchnie I/O)

Norma implementacji kontraktów komunikacji v1. Opis powierzchni i przykładowe kształty: `docs/dokumentacja_komunikacji.md`. Warstwy i zakazy procesów: `SPEC-ARCHITEKTURA`. Ten plik egzekwuje *jak* implementować I/O - bez drugiej dokumentacji koncepcyjnej.

Zmiana względem wcześniejszej normy K-5 / K-10 (utożsamianie idempotencji dema z „ten sam `fixtureKey` / `externalMeetingId` → jeden wiersz” na `POST /demo/run-meeting`): na ścieżce **DEMO/Test** każde wywołanie dostaje **nowe** `externalMeetingId` (UUID), `organizerId` = user sesji, losowy `fixtureKey` z katalogu **10**; `fixtureKey` ≠ tożsamość wiersza. DX i produkcja - poza tą zmianą K-5 (decyzja: DX `/dev/meetings/enqueue` bez zmian).

Zmiana względem wcześniejszej projekcji `GET /meetings` (element listy bez wyniku UC1): lista **musi** zawierać `summary` oraz `failureReason` (K-2a) — UI v1 podgląda wynik w tabeli bez trasy detail (`SPEC-FRONTEND`).

Zmiana względem wcześniejszego ujęcia „`audio_url` / `video_url` poza portem v1”: pola ephemeral media **nie** wchodzą do **trwałego** modelu ani do portu **pipeline** transcriptu. Osobny use case / port **on-demand nagrania** (K-5b) zwraca świeży URL. Przy **zgodzie** Fireflies = źródło transcriptu **i** nagrań (media u vendora); u nas kanon tekstu + on-demand link (`docs/dokumentacja_komunikacji.md`).

**Doprecyzowanie gałęzi zgody:** port **metadanych** (Calendar, w tym `description`) oddzielony od portu **treści** (`mock` \| `fireflies` \| `gemini-notes`). Zgoda na FF = tag **`[record-ok]`** w opisie. On-demand FF (K-5b) **tylko** przy tagu. Obecna wersja: mock + zaślepka (Faza 3.7); działające adaptery = etap 1+.

## Cel / zakres

Powierzchnie w zakresie:

| Powierzchnia | Uczestnicy |
|--------------|------------|
| HTTP API | `web` (BFF) ↔ `apps/api` |
| BFF | przeglądarka ↔ `apps/web` (`app/api/*`) ↔ `api` |
| SSE (status spotkania) | przeglądarka ↔ BFF ↔ `api` (`@Sse` / `text/event-stream`) |
| Kolejka pg-boss | `api` (enqueue) ↔ `worker` (consume) |
| Port metadanych (Calendar) | zaślepka (v0) / Calendar API (etap 1+) → `worker` |
| Port źródła treści | mock (v0) / `fireflies` \| `gemini-notes` (etap 1+) → pipeline |
| Port / use case on-demand nagrania | `api` → mock (v0) / Fireflies media (**tylko** przy zgodzie) |

**Poza tym SPEC:** reguły ACL case-by-case i bcrypt (`SPEC-AUTH_I_ACL`), kroki redact/summarize (`SPEC-PIPELINE`, `SPEC-LLM`), UI przycisku Test (`SPEC-FRONTEND`), pola Prisma (`SPEC-DANE`), audyt/pino (`SPEC-OBSERVABILITY`).

## Powiązanie ze stylem z docs

| Ustalenie | Wiązanie |
|-----------|----------|
| Cienkie controllery; ACL tylko w `api` | HTTP mapuje DTO → use case; brak reguł ACL w BFF/UI |
| Enqueue z `api`; worker konsumuje | Job `meeting.process` tylko z api; worker bez publicznego HTTP dla przeglądarki |
| Hexagonal na I/O | Port źródła + anti-corruption; nie schemat vendora 1:1 w domenie |
| Styl globalny z `SPEC-ARCHITEKTURA` | Bez redefinicji warstw; ten SPEC = norma granic komunikacji |

**Wyjątek względem stylu globalnego:** brak.

## Wymagania egzekwowalne

### HTTP API (`apps/api`)

K-1. Walidacja każdego wejścia HTTP: DTO + `class-validator` / `class-transformer` oraz globalny / trasowy `ValidationPipe`. Niepoprawne ciało → **400** + envelope błędów (K-8).

K-2. Trasy v1 (semantyka jak w docs; ścieżki bazowe):

| Metoda | Ścieżka | Auth | Zachowanie |
|--------|---------|------|------------|
| `POST` | `/auth/register` | nie | rejestracja pracownika (e-mail + hasło) |
| `POST` | `/auth/login` | nie | logowanie; ustawia cookie access + refresh HttpOnly |
| `POST` | `/auth/logout` | tak | kończy sesję; czyści cookie |
| `GET` | `/auth/me` | tak | bieżący użytkownik |
| `POST` | `/auth/refresh` | refresh cookie | rotacja tokenów (`SPEC-AUTH_I_ACL`) |
| `GET` | `/meetings` | tak | lista spotkań po ACL; paginacja `limit` + **`page`** (`SPEC-AUTH_I_ACL`); kształt elementu: K-2a |
| `GET` | `/meetings/:id` | tak | detail po ACL (API; UI v1 nie ma osobnej strony detail); rozszerza K-2a o pola dodatkowe |
| `GET` | `/meetings/:id/recording` | tak | on-demand nagranie: JSON `{ url: string }`; ACL jak detail (K-5b) |
| `GET` | `/meetings/:id/events` | tak | **SSE** statusów pipeline dla spotkania (ACL jak detail) |
| `POST` | `/meetings/:id/reprocess` | tak | **etap 1+:** enqueue ponownego `meeting.process` (K-5c); poza obowiązkowym v0 |
| `POST` | `/demo/run-meeting` | tak | enqueue joba `meeting.process` (mock/fixture); **bez** bramki env `DEMO_ENABLED` |

K-2a. Element listy `GET /meetings` (DTO / `packages/contracts`, spójnie z `docs/dokumentacja_komunikacji.md`):
- zawiera metadane wiersza (m.in. `id`, `title`, `startedAt`, `processingStatus`, …) **oraz** `summary: unknown | null` i `failureReason: string | null`;
- `summary` = kanon UC1 po sukcesie / `null` gdy brak; `failureReason` przy `failed` (lub `null`);
- **zakaz** pełnego transcriptu w elemencie listy;
- detail **rozszerza** listę (np. `externalParticipants`), nie jest jedynym miejscem z `summary` / `failureReason` w v1.
Zmiana względem: wcześniejsza praktyka / opis docs z summary wyłącznie w detail — obowiązuje projekcja wyniku także na liście (pod tabelę UI).

K-3. Sesja w komunikacji: cookie **HttpOnly**; atrybuty **Secure** / **SameSite** według środowiska. Ciało odpowiedzi logowania **nie** musi duplikować sekretu sesji w JSON. Szczegóły hashowania i reguł ACL → `SPEC-AUTH_I_ACL`.

K-4. Brak uprawnień do istniejącego spotkania: odpowiedź jak **404** (bez wycieku istnienia zasobu). Pełne reguły „kto widzi” (ACL v1: organizator ∨ uczestnik ∨ admin) → `SPEC-AUTH_I_ACL`.

K-5. Demo (`POST /demo/run-meeting`) - ścieżka UI Test:

- wymaga zalogowanego pracownika;
- **nie** sprawdza ani nie wymaga `DEMO_ENABLED` (flaga poza normą implementacji);
- wyłącznie **enqueue** `meeting.process` (nie omija workera);
- **tożsamość runu:** serwer nadaje **nowe** `externalMeetingId` (UUID) na **każde** wywołanie; ustawia `organizerId` = użytkownik sesji; klient **nie** musi podawać unikalnego ID spotkania;
- **wybór mocka:** serwer **losuje** `fixtureKey` spośród katalogu **10** fixture’ów za portem źródła; opcjonalne `fixtureKey` w body - jeśli zostaje w kontrakcie HTTP - serwer może zignorować / nadpisać losowaniem (norma: wybór należy do API demo);
- **`fixtureKey` ≠ klucz tożsamości wiersza** na DEMO/Test - ten sam klucz może powtórzyć się u wielu użytkowników i runów; każde wywołanie → osobny rekord `Meeting` (lista może rosnąć; multi-tester bez współdzielonego globalnego wiersza);
- odpowiedź zawiera m.in. `meetingId` (własny run), `jobId`, status początkowy (np. `pending`);
- po enqueue UI otwiera SSE (`K-5a`) i aktualizuje / dokłada wiersz tabeli (`SPEC-FRONTEND`) - bez wymogu osobnej nawigacji na detail;
- **poza tą zmianą K-5:** DX `POST /dev/meetings/enqueue` (dotychczasowa idempotencja `fixtureKey` ≈ `externalMeetingId`) oraz ścieżka produkcyjna (Fireflies / webhook) - bez zmiany reguł biznesowych w tym wymaganiu.

K-5a. SSE - `GET /meetings/:id/events` (Nest `@Sse`, Observable `MessageEvent`):

- wymaga sesji; brak ACL / brak zasobu → **404** (jak detail);
- strumień zdarzeń ze zmianami `processingStatus`: `pending` | `processing` | `completed` | `failed`;
- payload zdarzenia (kształt logiczny): co najmniej `meetingId`, `processingStatus`; przy `completed` wolno / należy dołączyć pola potrzebne do wiersza (`title`, `summary`); przy `failed` wolno / należy dołączyć `failureReason` — spójnie z K-2a (live update bez osobnego GET detail);
- zamknięcie strumienia po statusie terminalnym (`completed` | `failed`) lub disconnect klienta;
- BFF wystawia równoważny endpoint (np. `GET /api/meetings/:id/events`) proxy’ujący strumień z przekazywaniem cookie.
Zmiana względem: wcześniejsza K-5a bez jawnego `failureReason` w evencie przy `failed`.

K-5b. On-demand nagranie - `GET /meetings/:id/recording`:

- wymaga sesji; brak ACL / brak zasobu → **404** (jak detail);
- odpowiedź **200** JSON: `{ "url": string }` — **zakaz** redirectu HTTP 302 jako kontraktu odpowiedzi;
- **v0 / etap 0:** źródło URL = **mock** (atrapa `https://example.com/...`); tożsamość względem źródła = `externalMeetingId` (mock zwraca atrapę niezależnie od realnego media); button demo zawsze widoczny (`SPEC-FRONTEND` F-7a);
- **po integracji Fireflies (etap 1+, przy zgodzie na nagrywanie):** ten sam kontrakt HTTP; adapter prod odświeża ephemeral media URL z API FF (TTL vendora); szkielet → pełna funkcja bez zmiany kształtu odpowiedzi;
- **przy braku zgody (prod):** mechanizm / udostępnianie nagrania FF **nie** obowiązuje (brak buttonu) — treść z Notes by Gemini, nie audio FF (`SPEC-PIPELINE` P-2a);
- **zakaz** zapisu `audio_url` / `video_url` (lub równoważnego) do trwałego modelu `Meeting` — wyłącznie odpowiedź on-demand (`SPEC-DANE`);
- BFF: cienkie proxy (np. `GET /api/meetings/:id/recording`) z przekazywaniem cookie.
Zmiana względem: wcześniejsze ujęcie pól media FF „poza portem v1” bez osobnego use case — obowiązuje rozróżnienie portu **pipeline** transcript vs port/use case **on-demand** media; oraz zawężenie FF media do gałęzi ze zgodą.

K-5c. **Aktualizuj źródło** - `POST /meetings/:id/reprocess` (**etap 1+**; poza obowiązkową implementacją v0):

- wymaga sesji; brak ACL / brak zasobu → **404** (jak detail);
- wyłącznie **enqueue** `meeting.process` z **istniejącym** `externalMeetingId` spotkania (`SPEC-PIPELINE` P-6 / P-7a) — **zakaz** synchronicznego fetchu Calendar/FF/Notes/Drive w handlerze;
- odpowiedź: `meetingId`, `jobId`, status początkowy (np. `pending`) — spójnie z innymi enqueue;
- **zakaz** tworzenia drugiego `Meeting`; **zakaz** traktowania endpointu jako syncu / downloadu nagrania (media = K-5b);
- BFF (etap 1+): cienkie proxy (np. `POST /api/meetings/:id/reprocess`) z cookie.
Zmiana względem: brak jawnego kontraktu HTTP dla recovery metadata-only — obowiązuje K-5c + docs `data_flow.md` §5a.

### BFF (`apps/web`, `app/api/*`)

K-6. BFF **wolno:** przyjmować żądania UI (w tym Test, SSE i recording), przekazywać/ustawiać cookie HttpOnly w przepływie auth, proxy’ować do HTTP API / SSE / recording, mapować statusy/błędy, lekko agregować pod widok **bez** zmiany reguł dostępu; walidować pola **wyłącznie UI** przy rejestracji (`passwordConfirm` - K-6a) **bez** ACL treści ani reguł domenowych poza tą bramką.

K-6a. BFF `POST /api/auth/register` - wyjątek względem domyślnej reguły „semantyka ciał BFF jak HTTP API” (zmiana względem wcześniejszego mapowania 1:1 dla wszystkich auth):
- ciało BFF **wymaga** `email`, `password`, `passwordConfirm`;
- przed proxy: `password === passwordConfirm`; przy mismatch → HTTP **400** + envelope (K-8), **bez** wołania Nest `POST /auth/register`;
- przy OK: proxy do API wyłącznie `{ email, password }` - `passwordConfirm` **nie** trafia do `api`;
- Nest `POST /auth/register` bez zmian semantyki (e-mail + hasło; K-2) - bez wymogu `passwordConfirm` po stronie API;
- login BFF (`POST /api/auth/login`) bez `passwordConfirm` (jak API).

K-7. BFF **nie wolno:** egzekwować ACL treści spotkań; enqueue’ować pg-boss bezpośrednio; wołać adapterów źródła / LlmClient z pominięciem `api` + `worker`.

Mapowanie (prefiks `/api` po stronie BFF dozwolony):

| BFF | API |
|-----|-----|
| `POST /api/demo/run-meeting` | `POST /demo/run-meeting` |
| `GET /api/meetings`, `GET /api/meetings/:id` | odpowiadające trasy |
| `GET /api/meetings/:id/recording` | `GET /meetings/:id/recording` (K-5b) |
| `GET /api/meetings/:id/events` | `GET /meetings/:id/events` (SSE) |
| `/api/auth/*` | `/auth/*` (w tym `refresh`; register: strip `passwordConfirm` - K-6a) |

### Envelope błędów

K-8. Wspólny kształt błędu HTTP API (i spójnie mapowany przez BFF):

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "requestId": "optional-correlation-id"
}
```

| Kod HTTP | Kiedy |
|----------|--------|
| 400 | Walidacja DTO |
| 401 | Brak / nieważna sesja |
| 403 | Zalogowany, operacja zabroniona (gdy świadomie nie używamy 404) |
| 404 | Brak zasobu **lub** brak ACL do spotkania |
| 409 | Konflikt idempotencji / stanu (gdy rozróżniamy) |
| 500 | Błąd nieobsłużony |

### Kolejka pg-boss

K-9. Nazwa joba: **`meeting.process`**. Enqueue: **`api`** (w tym demo). Worker tylko konsumuje.

K-10. Payload (kształt logiczny; typ w `packages/contracts`):

```json
{
  "externalMeetingId": "550e8400-e29b-41d4-a716-446655440000",
  "source": "mock",
  "fixtureKey": "demo-fixture-03",
  "requestId": "correlation-id-from-api"
}
```

W v1 `source: "mock"`. Idempotencja joba / spotkania: klucz = **`externalMeetingId`**. Na DEMO/Test: `externalMeetingId` = UUID runu; `fixtureKey` = wylosowany materiał mocka (katalog 10) - **nie** wymaga się `externalMeetingId === fixtureKey`.  
Przy enqueue z `api` (w tym demo) **`requestId`** z requestu HTTP trafia do payloadu - korelacja z workerem (`SPEC-OBSERVABILITY` O-6).

K-11. Statusy widoczne dla API: `pending` → `processing` → `completed` | `failed`. Ponowne enqueue z tym samym `externalMeetingId`: bez duplikatu spotkania. Kolejne wywołania UI Test **nie** współdzielą jednego `externalMeetingId`.

### Port źródła treści + port metadanych

K-12. Minimalny kontrakt obiektu **treści** (jak w docs): `externalId`, `title`, `startedAt`, `participants[]` (`email`, `displayName`, `internal`), `segments[]` (`speaker`, `text`, `startMs`). Port **metadanych** (Calendar) jest osobny — fakt callu / opcjonalne `description` / uczestnicy indywidualni; nie zastępuje kontraktu transcriptu. `MeetingMetadataPayload.description` niesie sygnał `[record-ok]`.

K-12a. Wybór adaptera treści (norma prod / etap 1+): `[record-ok]` w `description` → `fireflies`; brak tagu → `gemini-notes` (`SPEC-PIPELINE` P-2a; `calendarDescriptionAllowsRecording`). Obecna wersja: happy-path **mock**; zaślepka `gemini-notes` / Calendar (Faza 3.7) **bez** wymogu prawdziwego Google w CI; helper tagu w `@vinseo/contracts` wolno testować bez Calendar.

K-13. Typy kształtu wolno trzymać w `packages/contracts`. **Walidacja runtime (Zod) kontraktu źródła: w `apps/api` oraz `apps/worker`.** Zakaz Zod w `packages/` (`SPEC-ARCHITEKTURA`).

K-14. Po stronie pipeline wynik streszczenia ma osobny kontrakt (Zod w aplikacji); **nie** pochodzi z `summary.*` Fireflies - szczegóły zapisu/fail-closed → `SPEC-PIPELINE` / `SPEC-LLM`. Tu obowiązuje: **nie zapisywać ani nie używać** `summary.*` vendora jako kanonu ani wejścia do DB.

K-15. Mapowanie Fireflies → port pipeline (tabela w `docs/dokumentacja_komunikacji.md`) obowiązuje przy podmianie adaptera transcriptu **w gałęzi ze zgodą**. W v0: **mock** + zaślepki. Webhook FF / OAuth Google / działający Calendar: **poza implementacją obecnej wersji** (brak normatywnego endpointu webhooka w kodzie MVP; obowiązkowe przy adapterach prod etap 1+). Ephemeral `audio_url` / `video_url` FF: poza mapowaniem do portu pipeline i poza DB; wyłącznie K-5b (on-demand, przy zgodzie).

## Norma: wzorce

### Wymagane

- DTO + ValidationPipe / class-validator na wejściach HTTP `api`.
- BFF jako cienkie proxy (cookie, statusy, SSE, recording) bez reguł domenowych - z wyjątkiem walidacji UI-only `passwordConfirm` na register (K-6a).
- Nazwany job `meeting.process` + klucz idempotencji.
- SSE statusu spotkania (`@Sse` / `text/event-stream`) z ACL jak przy odczycie.
- On-demand nagranie (K-5b): JSON `{ url }`, ACL jak detail, v0 = mock.
- Anti-corruption: mock/adapter mapuje na **port treści** (i osobno metadane Calendar), nie na surowy schemat vendora w use case’ach; media URL poza portem pipeline; zakaz fat-adaptera.
- Wspólny envelope błędów (K-8).
- Kształty w `packages/contracts` (typy); Zod źródła w **api i worker**.

### Nie wolno

- Publicznego API dla klientów zewnętrznych / partnerów w v1.
- Powierzchni powiadomień (mail, Slack), gRPC, Kafka ani brokera poza pg-boss.
- HTTP / BFF do odczytu `audit_log`.
- Endpointu asystenta Q&A (`POST /ask` lub równoważne) w v1 kodu.
- Omijania workera przy demo (synchroniczny pełny pipeline w HTTP).
- Wołania adapterów źródła / LLM z BFF.
- Traktowania `DEMO_ENABLED` jako bramki zachowania demo.
- Persistencji ephemeral URL nagrania w modelu spotkania.

## Zatwierdzony stack (obszar)

| Element | Wybór |
|---------|--------|
| HTTP API | NestJS (`apps/api`) |
| Walidacja HTTP | class-validator + class-transformer |
| BFF | Next.js App Router Route Handlers |
| SSE | NestJS `@Sse` + Observable `MessageEvent` (rxjs); klient przez BFF |
| Kolejka | pg-boss |
| Kontrakty typów | `packages/contracts` |
| Walidacja portu źródła | Zod w `apps/api` i `apps/worker` |

Bez dodatkowej biblioteki sesji / cookie poza praktyką Nest + Next uzgodnioną w auth (`SPEC-AUTH_I_ACL`).

## Kryteria akceptacji

- [ ] Wejścia HTTP `api` odrzucają niepoprawne DTO kodem 400 + envelope.
- [ ] Trasy auth / meetings / demo / recording / SSE działają zgodnie z tabelą K-2; demo enqueue’uje `meeting.process` bez sprawdzania `DEMO_ENABLED`.
- [ ] Element listy `GET /meetings` zawiera `summary` i `failureReason` (K-2a); detail rozszerza listę, nie jest jedynym źródłem wyniku w v1.
- [ ] DEMO/Test (K-5): każde wywołanie → nowe `externalMeetingId` (UUID) + `organizerId` sesji + losowy `fixtureKey` z katalogu 10; multi-tester → osobne wiersze; `fixtureKey` ≠ tożsamość wiersza.
- [ ] Recording (K-5b): z ACL → `{ url }` (v0 mock `https://example.com/...`); bez ACL → 404; BFF proxy; brak persist URL.
- [ ] BFF register: mismatch `passwordConfirm` → 400 bez wołania API; przy OK proxy tylko `{ email, password }` (K-6a); Nest register bez `passwordConfirm`.
- [ ] SSE wymaga auth+ACL; emituje statusy aż do `completed`/`failed`; BFF proxy’uje strumień.
- [ ] BFF nie egzekwuje ACL i nie woła adapterów I/O bezpośrednio.
- [ ] Job ma nazwę `meeting.process` i payload z `externalMeetingId` jako kluczem idempotencji (na demie: UUID runu + osobny `fixtureKey`).
- [ ] Obiekt źródłowy jest walidowany Zod w api i w workerze; niepoprawny kształt nie przechodzi dalej jako sukces.
- [ ] Brak zapisu / użycia `summary.*` Fireflies jako kanonu.
- [ ] Brak publicznego HTTP workera dla przeglądarki i braku HTTP odczytu audytu.

## Poza zakresem

- Implementacja webhooka Fireflies, OAuth Google, działającego Calendar / `gemini-notes` (w v0: mock K-5b + zaślepka Faza 3.7; prod = etap 1+).
- `POST /meetings/:id/reprocess` (K-5c) — poza obowiązkowym v0; obowiązkowe w etapie 1+.
- UC2 / RAG / `POST /ask`.
- Szczegóły redakcji PII i wywołania LlmClient.
- Widoki React i copy przycisku Test / buttonu nagrania (`SPEC-FRONTEND`).
- Schemat tabel i migracje Prisma.
- Katalog eventType `audit_log` i format pino.
