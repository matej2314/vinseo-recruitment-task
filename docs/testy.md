---
wersja: 10
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# Strategia testów

Jak testujemy Firmowego asystenta spotkań w v1: warstwy, obowiązkowe obszary, narzędzia i reguły CI.

## Cele

- Chronić **reguły ACL** i **redakcję** przed regresją (wymagania krytyczne produktu).
- Udowodnić **idempotentny pipeline** i **fail-closed** na niepoprawnym wyniku streszczenia.
- Unikać kosztownych e2e przeglądarkowych jako głównej siatki bezpieczeństwa w MVP.
- Te same testy lokalnie i na pull requestach; **merge do `main` tylko przy zielonych testach**.

## Piramida v1

```text
        /\
       /  \      e2e przeglądarka - poza MVP (świadomie)
      /----\
     / integ \   pipeline + API (supertest) + Postgres testowy
    /--------\
   /   unit   \  ACL, redaction, Zod, czysta idempotencja / reguły
  /------------\
```

| Warstwa | Udział v1 | Co pokrywa |
|---------|-----------|------------|
| **Unit** | Dużo | `access` (tabela przypadków), redakcja PII, schemat Zod summary, mapowania pure, reguły statusów |
| **Integracja** | Średnio | Job `meeting.process` z mockami portów + prawdziwy Postgres testowy; wybrane trasy Nest przez **supertest** (auth cookie, ACL, demo enqueue, **SSE**) |
| **E2E UI (Playwright itd.)** | Brak / poza MVP | Widok testowy i przycisk Test weryfikujemy ręcznie lub późniejszym etapem; w v1 wystarczy ścieżka API+worker |

Frontend (`web`): bez Playwright w v1; co najwyżej lekkie testy jednostkowe czystej logiki UI oraz **smoke build** (`next build` / typecheck w CI, jeśli włączone w pipeline).

## Narzędzia

| Element | Wybór |
|---------|--------|
| Runner | **Jest** (wszystkie apps; migracja ze Vitest w scaffoldzie Nest) |
| HTTP API | **supertest** + `@nestjs/testing` |
| Asercje kontraktu summary | Zod (parse w teście / oczekiwany sukces lub fail) |
| Baza | Osobna baza **testowa** `vinseo_test` (nie produkcyjna, nie współdzielona z runtime `vinseo` bez izolacji); lokalnie typowo `pnpm db:up` → `docker-compose.db.yml` (ścieżka A). Pełny `compose.dev` **nie** jest bramką CI/DoD testów |

## Baza testowa

- Ścieżka A (`docker-compose.db.yml`): jeden Postgres, dwie bazy — `vinseo` (runtime lokalny) i `vinseo_test` (integracje). Wejście: `pnpm db:up`.
- Przed suite integracyjnym lokalnie: `pnpm db:up`, potem migracje Prisma na `DATABASE_URL_TEST` (nie na `DATABASE_URL`).
- Migracje Prisma odpalane na bazę testową przed suite integracyjnym.
- **Bez** prawdziwych nagrań i danych klientów - wyłącznie fixture / mock.
- Testy jednostkowe ACL i redakcji **nie wymagają** bazy.

## Obowiązkowe przypadki v1 (DoD testów)

### Unit - ACL (`access`)

Przykładowa tabela (rozszerzać w kodzie):

| Użytkownik | Spotkanie | Oczekiwane |
|------------|-----------|------------|
| Organizator | to spotkanie | allow |
| Uczestnik wewnętrzny | to spotkanie | allow |
| Pracownik z membership projektu, nie organizator/uczestnik | spotkanie z `clientId`/`projectId` | **deny → 404** (membership poza ACL v1) |
| Obcy pracownik | cudze spotkanie | deny → API 404 |
| Admin | dowolne (w tym `confidential`) | allow |

### Unit - redakcja

- Klasy **E+T+P+K** (e-mail, telefon, PESEL/dowód, karta płatnicza) są maskowane / usuwane przed wejściem do summarizera.
- Idempotencja redakcji na już zredagowanym tekście (nie psuje treści wielokrotnie).

### Unit - Zod summary (UC1)

- Poprawny payload z mocka LlmClient → sukces.
- Brak pól / zły typ / `actionItems` bez wymaganej struktury → reject (ścieżka failed).
- Pipeline nie zależy od `summary.*` Fireflies (fixture źródła = transcript only).

### UC2 ask (poza must-have etapu 0)

- Gdy pojawi się stub: test ACL-before-retrieve (nie woła LLM z pełną bazą). Do czasu etapu 2 - nie blokuje DoD.

### Integracja - pipeline

- Dwukrotne przetworzenie **tego samego** `externalMeetingId` → **jedno** spotkanie (idempotencja po tożsamości runu / vendora — nie po samym `fixtureKey` na ścieżce UI Test).
- Mock summarizera zwracający śmieci → status `failed`, brak kanonicznego summary.
- Happy path → `completed` + zapisane zadania.
- Katalog mocków dema obejmuje **10** kluczy; wybór na DEMO/Test jest **losowy po stronie API**.

### Integracja - API (supertest)

- Login ustawia sesję (cookie); `/auth/me` działa.
- `GET /meetings/:id` bez ACL → 404.
- `POST /demo/run-meeting` przy ważnej sesji enqueue’uje job (asercja statusu / obecności joba lub spotkania) — **bez** bramki `DEMO_ENABLED` (flaga usunięta z kontraktu v1); każde wywołanie → nowe `externalMeetingId` (UUID) i `organizerId` sesji.
- **Multi-tester DEMO:** dwóch użytkowników × Test → **dwa** spotkania; każdy przechodzi SSE / odczyt we **własnym** ACL; brak współdzielonego globalnego wiersza dema.
- Ścieżka **DX** (`/dev/meetings/enqueue`) — poza tą zmianą normy dema (osobna idempotencja).

### Integracja - SSE

- Uprawniony użytkownik: `GET /meetings/:id/events` emituje statusy pipeline (ścieżka testowa do statusu terminalnego lub emisja statusu) — w tym po własnym `meetingId` z odpowiedzi Test.
- Brak ACL / brak zasobu → **404** (jak detail).

### Audyt (`audit_log`)

- Unit lub integracja: po **deny ACL** powstaje event `meeting.access.denied` (bez treści spotkania w payloadzie).
- Po **failed** walidacji summary / jobie - odpowiedni `eventType` w `audit_log`.
- Writer audytu nie przyjmuje / nie utrwala pól z raw transcriptem (test negatywny lub kontrakt payloadu).

## Czego nie testujemy w v1 (świadomie)

- Prawdziwego GraphQL Fireflies / webhooków prod.
- Prawdziwego LLM.
- Pełnego flow UI w przeglądarce (Playwright).
- Wydajności przy 300 h/mies. (to założenie produktowe, nie load test w MVP).

## Organizacja w monorepo

- Testy współlokalizowane lub w `test/` danej aplikacji (`apps/api`, `apps/worker`).
- Skrypt root: np. `pnpm test` odpala Jest we workspaces; baza pod integrację: `pnpm db:up` (patrz `deployment.md`).
- Nazewnictwo opisuje zachowanie (`access.allows-project-member.spec.ts`), nie implementację.

## CI i reguła zespołu

- Na każdym **pull request** uruchamiane są testy (Jest) - ten sam zestaw co lokalnie w rozsądnym zakresie (unit + integracja z Compose/Postgres testowym).
- Dostępny też **workflow_dispatch** z wyborem brancha (diagnostyka).
- **Reguła:** merge do **`main` tylko przy zielonych wymaganych checkach** (branch protection: required status checks). Direct push na `main` zablokowany.

Szczegóły workflow i VPS: `deployment.md` (kolejny dokument).

## Anty-patterny testowe (skrót)

- Sam coverage % bez asercji ACL/redaction.
- Testy, które tylko powielają implementację mockami wszystkiego.
- Współdzielona baza dev+test bez izolacji.
- Poleganie wyłącznie na ręcznym kliknięciu Test w UI.

Patrz też: `anty_patterny.md`.

## Mapowanie na inne dokumenty

- Co chronimy produktowo: `dokumentacja_koncepcyjna.md`
- Gdzie leży logika: `architektura.md`, `data_flow.md`
- Kontrakty HTTP/jobów: `dokumentacja_komunikacji.md`
- UI (smoke, bez Playwright must-have): `frontend.md`
- LLM UC1/UC2: `llm_i_asystent.md`
- CI / VPS: `deployment.md`
