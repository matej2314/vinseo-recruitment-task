# Vinseo - Firmowy asystent spotkań

Zadanie rekrutacyjne: **Mid Fullstack Developer** (Vinseo).  
Cel produktu: Warunkowe pozyskiwanie i przetwarzanie transkrypcji spotkań Google Meet, generowanie podsumowań w czytelnym formacie. Kontrola dostępu do informacji na temat spotkań i kontrola kontekstu przekazywanego modelowi AI. Docelowo również wyszukiwarka kontekstowa operująca na historii spotkań.

---

## Założenie produktowe

Budujemy **własny** system asystenta spotkań (model danych, uprawnienia, pipeline, API, integracje).  


| Warstwa | Rola |
|---------|------|
| Google Workspace + Meet | Kalendarz / spotkania w organizacji (prod później; w kodzie: mock) |
| Fireflies / Notes by Gemini | Adapter pozyskania dodatkowych danych o spotkaniach (MVP: **mock** o stabilnym kontrakcie) |
| Funkcjonalności aplikacji | Redakcja, streszczenie/zadania, ACL, API + panel (retencja/erase: norma w `docs/`, kod etap 2+) |

Szczegóły koncepcji, RODO, kosztów i etapów: katalog [`docs/`](./docs/README.md). Normy implementacji: [`spec/`](./spec/SPEC-README.md).

---

## Stack

| Obszar | Wybór |
|--------|--------|
| API | NestJS (`apps/api`) |
| Worker | Osobny proces NestJS bez warstwy HTTP (`apps/worker`) |
| Frontend | Next.js (`apps/web`) - obecnie w wersji uproszczonej |
| DB | PostgreSQL + Prisma 7 (adapter `pg`) |
| Kolejka | pg-boss (ta sama baza; api enqueue, worker) |
| Walidacja HTTP / env | class-validator; zod w `api` / `worker` (env, źródło, summary) |
| Testy | Jest (`@vinseo/api`, `@vinseo/worker`) |
| Lokalnie | Compose A: tylko Postgres; Compose B: pełny stack |

---

## Architektura (wysoki poziom)

Wspólny rdzeń: job **`meeting.process`** (pg-boss) → worker  
`fetch → redact → summarize (+ Zod) → persist` → PostgreSQL.  
Odczyt przez **api** (sesja + ACL) i **web** (BFF + panel + SSE).

### Dziś (demo w repo)

```text
[UI Test / DX enqueue]
        │  meeting.process (mock źródła)
        ▼
   [pg-boss] → [worker] → [PostgreSQL]
                              │
                    [api + ACL] ← [web BFF + panel]
```

- **Test** (`POST /demo/run-meeting`, sesja): nowe `externalMeetingId` (UUID) + `organizerId` użytkownika + losowy `fixtureKey` z katalogu mocków.
- **DX** (`POST /dev/meetings/enqueue`, bez sesji, tylko `development`): `fixtureKey` ≈ klucz idempotencji.
- Przed LlmClient: redakcja PII (E+T+P+K). LLM w demie: mock + Zod.
- Porty Calendar / Notes by Gemini: zaślepki pod etap 1+ (`docs/`).

### Docelowo (etap 1+: Workspace first)

```text
[Google Calendar]  ──discovery──►  [job calendar.reconcile]
   fakt callu, Event.id,                  │ enqueue meeting.process
   description ([record-ok]?),            │ externalMeetingId = Event.id
   uczestnicy                             ▼
                                   [pg-boss] → [worker]
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
            metadane Calendar    treść: fireflies      treść: gemini-notes
                                 (gdy [record-ok])     (bez tagu)
                                         │
                                         ▼
                              UC1 summary  |  metadata-only
                                         ▼
                                   [PostgreSQL] → [api + ACL] → [web]
```

- **Calendar = źródło prawdy o fakcie spotkania** (cron `calendar.reconcile`; opcjonalnie Push jako hint). **Nie** discovery przez webhook Fireflies.
- **Fireflies / Notes by Gemini = adaptery treści** (wybór po tagu `[record-ok]` w opisie wydarzenia). Webhook FF = content-ready / upgrade tego samego `Event.id`, nie jedyne wejście.
- Brak materiału treści → rekord spotkania i tak powstaje (**metadata-only**).
- Ten sam worker i ACL co w demie; zmienia się trigger i źródło metadanych/treści.

Szczegóły: [`docs/data_flow.md`](./docs/data_flow.md), [`docs/plan_wdrozenia_etapy.md`](./docs/plan_wdrozenia_etapy.md).

---

## Struktura repozytorium

```text
apps/
  api/                 # Nest - HTTP (auth, ACL, demo)
  worker/              # Nest - ApplicationContext; (pipeline asynchroniczny)
  web/                 # Next - demo strony głównej i dashboardu
packages/
  contracts/           # wspólne typy (m.in. statusy, client-link, job payload)
prisma/
  schema.prisma
  migrations/          # init_etap0 + align_acl_v1_client_link
docs/                  # dokumentacja produktowa / architektoniczna
spec/                  # normy implementacji
docker-compose.db.yml  # ścieżka A - Postgres (`vinseo` + `vinseo_test`)
docker-compose.dev.yml # ścieżka B - Postgres + api + worker + web
docker/dev/            # Dockerfile stacku B
```

---

## Uruchomienie

Wymagania: **Node ≥ 22**, **pnpm**, **Docker**.

**Nie** uruchamiaj jednocześnie `pnpm db:up` i `pnpm dev:stack:up` na tych samych portach (5432 / 3000 / 3001).

### Konfiguracja

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
```

W root `.env` uzupełnij atomy Postgres (Compose ich wymaga) oraz sekrety API, np.:

```env
POSTGRES_USER=vinseo
POSTGRES_PASSWORD=vinseo
POSTGRES_DB=vinseo
POSTGRES_DB_TEST=vinseo_test
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://vinseo:vinseo@localhost:5432/vinseo?schema=public
DATABASE_URL_TEST=postgresql://vinseo:vinseo@localhost:5432/vinseo_test?schema=public
JWT_SECRET=change-me-dev-jwt-secret-min-32-chars!!
COOKIE_SECURE=false
```

`JWT_SECRET` jest wymagany do startu API (min. 32 znaki). Reszta atomów Postgres — jak w `.env.example`.

W `apps/web/.env` ustaw BFF pod ścieżkę A (appki na hoście):

```env
API_BASE_URL=http://localhost:3001
```

Dla **Compose B** (`pnpm dev:stack:up`) `docker-compose.dev.yml` nadpisuje w serwisie `web` `API_BASE_URL=http://api:3001` (hostname usługi `api` w sieci Dockera) — lokalny `localhost` z `apps/web/.env` nie psuje wtedy BFF.

### Stack + przykładowe spotkanie

```bash
pnpm dev:stack:up
# pnpm dev:stack:logs
# pnpm dev:stack:down
```

Serwis `deps` robi install / `db:generate` / `db:migrate:deploy`, potem startują `api`, `worker`, `web`.

1. Otwórz http://localhost:3000
2. Zarejestruj konto i zaloguj się
3. Na dashboardzie kliknij **Test** - enqueue joba `meeting.process` (mock źródła → redakcja PII → mock LLM + Zod → zapis). Status w panelu → `completed`.

Smoke API: http://localhost:3001/health → `{"status":"ok"}`.

### Testy kodu

```bash
pnpm test                 # unit (api + worker)
pnpm test:integration     # pipeline workera (efemeryczny Compose jak e2e; teardown `down -v`)
pnpm test:e2e             # e2e api (ten sam `docker-compose.e2e.yml`; nie równolegle z integration)
```

### Opcjonalnie: appki na hoście (tylko Postgres w Dockerze)

```bash
pnpm db:up
pnpm db:generate && pnpm db:migrate:deploy
pnpm dev:api      # :3001
pnpm dev:worker
pnpm dev:web      # :3000; API_BASE_URL=http://localhost:3001
```

---

## Co działa / atrapa / odłożone

| Element | Status | Uwagi |
|---------|--------|--------|
| Monorepo pnpm (`api` / `worker` / `web` / `contracts`) | działa | |
| Compose A (`pnpm db:up`) + Compose B (`pnpm dev:stack:up`) | działa | nie równolegle na tych samych portach |
| Prisma schema + migracje | działa | model + ACL / client-link |
| Worker + pg-boss `meeting.process` | działa | mock źródła → redact → mock LLM → Zod → persist |
| Idempotencja `externalMeetingId` | działa | upsert in place; DX: ten sam `fixtureKey` nie duplikuje wiersza; testy |
| Fail-closed summary (Zod) | działa | niepoprawny wynik LLM → `failed`, bez zapisu „prawie OK” |
| Redakcja E+T+P+K + unit testy | działa | |
| `web` - auth UI, BFF, dashboard | działa | rejestracja / login, lista spotkań |
| Auth cookie (JWT) + ACL v1 + testy | działa | egzekwowane na list / get / SSE / recording |
| Demo Test + SSE (`POST /demo/run-meeting`) | działa | sesja wymagana; UI: przycisk **Test** |
| Wyszukiwarka w UI | atrapa | hardcodowane wyniki lokalnie; bez RAG |
| Prawdziwy Google Calendar / Fireflies / LLM | odłożone | mocki / zaślepki za portami; świadomie: DoD na przetworzeniu i ACL; FF / Notes = adaptery treści (etap 1+) |
| Job `calendar.reconcile` | odłożone | Calendar API = discovery / trigger do istniejącego `meeting.process` (`Event.id`), nie osobny pipeline |
| Login Google Workspace (IdP) | odłożone | dziś e-mail/hasło; SSO domenowe = etap 1+; osobne od OAuth Calendar |
| Q&A / RAG | odłożone | Świadomie po kanonie spotkań + ACL: asystent ze źródłami bez twardego ACL to ryzyko wycieku. Plan: etap 2+ (`docs/plan_wdrozenia_etapy.md`) |
| Retencja automatyczna + erase UI/API | odłożone | Okresy i reguła „kasuj treść, zostaw fakt callu” ustalone w `docs/bezpieczenstwo_i_rodo.md` (m.in. 90 dni / 12 mies.); w kodzie etapu 0 brak joba retencji i panelu erase — po stabilnym modelu + ACL. Etap 2+ |
| CI GitHub Actions + ochrona `main` | odłożone | Testy odpalane lokalnie skryptami root; automatyzacja na PR i branch protection - przed pracą zespołową, nie przed demem pipeline’u |

---

## Użycie AI przy zadaniu

Pracowałem w **Cursor** z własnymi regułami i skillami (m.in. architektura, TypeScript, workflow docs → SPEC → plan → implementacja). Model wspierał praktycznie każdy etap: szkice docs/SPEC, plany, kod Nest/Next, testy, README. **Każdy commit i decyzja produktowa są moje** - AI to przyspieszenie, nie źródło prawdy.

AI jest też dla mnie **źródłem rozwiązań przy blokadzie**: dyktuję warunki i założenia funkcjonalności, wskazuję brief oraz docs/SPEC, a model - z użyciem Internetu i MCP **Context7** (aktualna dokumentacja bibliotek) - przedstawia warianty. **Decyzja, co finalnie trafia do implementacji, zawsze należy do mnie.**

### Co model pomagał zrobić dobrze
- Szybkie scaffoldy zgodne z ustalonym stackiem (Nest modules, Prisma, BFF Next).
- Generowanie wariantów testów i checklist względem DoD.
- Redakcja dokumentacji i spójność nazewnictwa po moich decyzjach.
- Odblokowanie przy niejasnym API frameworka - propozycje oparte na briefie + Context7 - nie na danych,na których model został wytrenowany.

### Co musiałem poprawić (halucynacje / drift)
- **Auth / ACL (plan + implementacja):** model proponował niespójne granice sesji, cookie/JWT i reguł dostępu. Rozdzieliłem poprawki: najpierw kontrakt w docs/SPEC, potem kod + testy ACL (list / get / SSE / recording). Bez tego łatwo wjechać w „działa na happy-path”, ale przecieka treść.
- **Frontend (implementacja + późniejszy refaktor):** propozycje UI mieszały fetching, reguły i lokalny UI state oraz często szły w generyczny, „AI-owy” wygląd (układ, typografia, zbędne karty/ozdobniki). Wymusłem cienki BFF, sesję po stronie serwera, **scalenie rozproszonych stanów lokalnych** w czytelniejsze definicje w komponentach oraz **własne decyzje wizualne** względem propozycji modelu (hierarchia, uproszczenie layoutu, spójność z założeniami panelu - nie kopiowanie domyślnego UI z modelu).
- **Docs / SPEC:** część zmian koncepcji poszła **po** pierwszej implementacji (m.in. Calendar jako discovery vs Fireflies jako treść). Częściowo moja wina (iteracja produktu); AI czasem utrwalało starą wersję normy - weryfikowałem drift docs ↔ kod ↔ README ręcznie.

### Jak kontroluję AI na co dzień
1. **Norma przed kodem** - docs/SPEC/plan jako kontrakt; AI nie podejmuje kluczowych decyzji.
2. **Brief + Context7 przy blokadzie** - ja narzucam warunki; model proponuje; ja wybieram wariant pod architekturę i DoD.
3. **Weryfikacja granic** - auth, ACL, porty adapterów, walidacja Zod: czytam diff, uruchamiam testy (`pnpm test`, integration, e2e) i lokalny build zanim uznam zmianę za gotową.
4. **Selekcja względem wymagań** — wdrażam wyłącznie zmiany, które mają jasny kontrakt zachowania, spełniają DoD oraz przewidują kontrolowaną ścieżkę błędu.
5. **Świadome cięcie zakresu** - produkcyjne Calendar/FF/LLM i CI odłożone celowo; AI nie „dociągało” atrap produkcyjnych poza DoD.

Efekt: termin dotrzymany dzięki AI, ale **architektura, priorytety i poprawki po halucynacjach są moją odpowiedzialnością autorską**.

---
