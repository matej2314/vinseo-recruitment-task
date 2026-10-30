---
wersja: 4
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# SPEC — Komunikacja (powierzchnie I/O)

Norma implementacji kontraktów komunikacji v1. Opis powierzchni i przykładowe kształty: `docs/dokumentacja_komunikacji.md`. Warstwy i zakazy procesów: `SPEC-ARCHITEKTURA`. Ten plik egzekwuje *jak* implementować I/O — bez drugiej dokumentacji koncepcyjnej.

Zmiana względem v1 tego SPEC: dodana powierzchnia **SSE** statusu spotkania (po demo / pipeline); UI aktualizuje tabelę bez osobnej trasy detail (`SPEC-FRONTEND`).

## Cel / zakres

Powierzchnie w zakresie:

| Powierzchnia | Uczestnicy |
|--------------|------------|
| HTTP API | `web` (BFF) ↔ `apps/api` |
| BFF | przeglądarka ↔ `apps/web` (`app/api/*`) ↔ `api` |
| SSE (status spotkania) | przeglądarka ↔ BFF ↔ `api` (`@Sse` / `text/event-stream`) |
| Kolejka pg-boss | `api` (enqueue) ↔ `worker` (consume) |
| Port źródła spotkań | mock (v1) / przyszły adapter → kontrakt wejścia pipeline |

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
| `GET` | `/meetings` | tak | lista spotkań po ACL; paginacja `limit` + **`page`** (`SPEC-AUTH_I_ACL`) |
| `GET` | `/meetings/:id` | tak | detail po ACL (API; UI v1 nie ma osobnej strony detail) |
| `GET` | `/meetings/:id/events` | tak | **SSE** statusów pipeline dla spotkania (ACL jak detail) |
| `POST` | `/demo/run-meeting` | tak | enqueue joba `meeting.process` (mock/fixture); **bez** bramki env `DEMO_ENABLED` |

K-3. Sesja w komunikacji: cookie **HttpOnly**; atrybuty **Secure** / **SameSite** według środowiska. Ciało odpowiedzi logowania **nie** musi duplikować sekretu sesji w JSON. Szczegóły hashowania i reguł ACL → `SPEC-AUTH_I_ACL`.

K-4. Brak uprawnień do istniejącego spotkania: odpowiedź jak **404** (bez wycieku istnienia zasobu). Pełne reguły „kto widzi” (ACL v1: organizator ∨ uczestnik ∨ admin) → `SPEC-AUTH_I_ACL`.

K-5. Demo (`POST /demo/run-meeting`):

- wymaga zalogowanego pracownika;
- **nie** sprawdza ani nie wymaga `DEMO_ENABLED` (flaga poza normą implementacji);
- wyłącznie **enqueue** `meeting.process` (nie omija workera);
- idempotencja: ten sam `externalMeetingId` / `fixtureKey` nie tworzy drugiego rekordu spotkania;
- przykład ciała: `{ "fixtureKey": "demo-client-budget-pl" }`; odpowiedź zawiera m.in. `meetingId`, `jobId`, status początkowy (np. `pending`);
- po enqueue UI otwiera SSE (`K-5a`) i aktualizuje wiersz tabeli (`SPEC-FRONTEND`) — bez wymogu osobnej nawigacji na detail.

K-5a. SSE — `GET /meetings/:id/events` (Nest `@Sse`, Observable `MessageEvent`):

- wymaga sesji; brak ACL / brak zasobu → **404** (jak detail);
- strumień zdarzeń ze zmianami `processingStatus`: `pending` | `processing` | `completed` | `failed`;
- payload zdarzenia (kształt logiczny): co najmniej `meetingId`, `processingStatus`; przy `completed` wolno dołączyć skrót pól listy/summary potrzebnych do odświeżenia wiersza tabeli;
- zamknięcie strumienia po statusie terminalnym (`completed` | `failed`) lub disconnect klienta;
- BFF wystawia równoważny endpoint (np. `GET /api/meetings/:id/events`) proxy’ujący strumień z przekazywaniem cookie.

### BFF (`apps/web`, `app/api/*`)

K-6. BFF **wolno:** przyjmować żądania UI (w tym Test i SSE), przekazywać/ustawiać cookie HttpOnly w przepływie auth, proxy’ować do HTTP API / SSE, mapować statusy/błędy, lekko agregować pod widok **bez** zmiany reguł dostępu.

K-7. BFF **nie wolno:** egzekwować ACL treści spotkań; enqueue’ować pg-boss bezpośrednio; wołać adapterów źródła / LlmClient z pominięciem `api` + `worker`.

Mapowanie (prefiks `/api` po stronie BFF dozwolony):

| BFF | API |
|-----|-----|
| `POST /api/demo/run-meeting` | `POST /demo/run-meeting` |
| `GET /api/meetings`, `GET /api/meetings/:id` | odpowiadające trasy |
| `GET /api/meetings/:id/events` | `GET /meetings/:id/events` (SSE) |
| `/api/auth/*` | `/auth/*` (w tym `refresh`) |

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
  "externalMeetingId": "fireflies-or-mock-id",
  "source": "mock",
  "fixtureKey": "demo-client-budget-pl",
  "requestId": "correlation-id-from-api"
}
```

W v1 `source: "mock"`. Idempotencja: klucz oparty o `externalMeetingId` (spójnie z `fixtureKey` na ścieżce mock).  
Przy enqueue z `api` (w tym demo) **`requestId`** z requestu HTTP trafia do payloadu — korelacja z workerem (`SPEC-OBSERVABILITY` O-6).

K-11. Statusy widoczne dla API: `pending` → `processing` → `completed` | `failed`. Ponowne enqueue z tym samym kluczem: bez duplikatu spotkania.

### Port źródła spotkań

K-12. Minimalny kontrakt obiektu źródłowego (jak w docs): `externalId`, `title`, `startedAt`, `participants[]` (`email`, `displayName`, `internal`), `segments[]` (`speaker`, `text`, `startMs`).

K-13. Typy kształtu wolno trzymać w `packages/contracts`. **Walidacja runtime (Zod) kontraktu źródła: w `apps/api` oraz `apps/worker`.** Zakaz Zod w `packages/` (`SPEC-ARCHITEKTURA`).

K-14. Po stronie pipeline wynik streszczenia ma osobny kontrakt (Zod w aplikacji); **nie** pochodzi z `summary.*` Fireflies — szczegóły zapisu/fail-closed → `SPEC-PIPELINE` / `SPEC-LLM`. Tu obowiązuje: **nie zapisywać ani nie używać** `summary.*` vendora jako kanonu ani wejścia do DB.

K-15. Mapowanie Fireflies → port (tabela w `docs/dokumentacja_komunikacji.md`) obowiązuje przy przyszłej podmianie adaptera. W v1: **mock** za portem. Webhook FF / OAuth Google: **poza implementacją v1** (brak normatywnego endpointu webhooka w kodzie MVP).

## Norma: wzorce

### Wymagane

- DTO + ValidationPipe / class-validator na wejściach HTTP `api`.
- BFF jako cienkie proxy (cookie, statusy, SSE) bez reguł domenowych.
- Nazwany job `meeting.process` + klucz idempotencji.
- SSE statusu spotkania (`@Sse` / `text/event-stream`) z ACL jak przy odczycie.
- Anti-corruption: mock/adapter mapuje na **port źródła**, nie na surowy schemat vendora w use case’ach.
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
- [ ] Trasy auth / meetings / demo / SSE działają zgodnie z tabelą K-2; demo enqueue’uje `meeting.process` bez sprawdzania `DEMO_ENABLED`.
- [ ] SSE wymaga auth+ACL; emituje statusy aż do `completed`/`failed`; BFF proxy’uje strumień.
- [ ] BFF nie egzekwuje ACL i nie woła adapterów I/O bezpośrednio.
- [ ] Job ma nazwę `meeting.process` i payload ze źródłem mock + kluczem idempotencji.
- [ ] Obiekt źródłowy jest walidowany Zod w api i w workerze; niepoprawny kształt nie przechodzi dalej jako sukces.
- [ ] Brak zapisu / użycia `summary.*` Fireflies jako kanonu.
- [ ] Brak publicznego HTTP workera dla przeglądarki i braku HTTP odczytu audytu.

## Poza zakresem

- Implementacja webhooka Fireflies i produkcyjnych credentiali.
- UC2 / RAG / `POST /ask`.
- Szczegóły redakcji PII i wywołania LlmClient.
- Widoki React i copy przycisku Test.
- Schemat tabel i migracje Prisma.
- Katalog eventType `audit_log` i format pino.
