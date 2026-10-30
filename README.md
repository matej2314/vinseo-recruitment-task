# Vinseo - Firmowy asystent spotkań

Zadanie rekrutacyjne: **Mid Fullstack Developer** (Vinseo).  
Cel produktu: po spotkaniu mieć transkrypcję (PL, mówcy), krótkie streszczenie, listę ustaleń i zadań oraz (w kolejnych etapach) pytania do historii spotkań ze wskazaniem źródła - przy kontroli dostępu i ograniczeniu wynoszenia danych klientów.

**Stan repo (Faza 2 - pipeline):** monorepo pnpm z `apps/api`, `apps/worker`, `apps/web` (stub), `packages/contracts`, Prisma + migracje, Compose A/B. Worker przetwarza `meeting.process` (mock źródła → redakcja → mock LLM + Zod → persist); enqueue DX: `POST /dev/meetings/enqueue`. Auth/ACL / `POST /demo/run-meeting` / pełne UI - kolejne fazy.

---

## Założenie produktowe

Budujemy **własny** system pamięci spotkań (model danych, uprawnienia, pipeline, API).  
**Nie** zastępujemy produktu firmowym Notebookiem zewnętrznego notetakera.

| Warstwa | Rola |
|---------|------|
| Google Workspace + Meet | Kalendarz / spotkania w organizacji (prod później; w kodzie: mock) |
| Fireflies / Notes by Gemini | Adapter pozyskania materiału (MVP: **mock** o stabilnym kontrakcie) |
| Nasza aplikacja | Normalizacja, redakcja, streszczenie/zadania, ACL, retencja, API + panel |

Szczegóły koncepcji, RODO, kosztów i etapów: katalog [`docs/`](./docs/README.md). Normy implementacji: [`spec/`](./spec/SPEC-README.md).

---

## Stack

| Obszar | Wybór |
|--------|--------|
| API | NestJS (`apps/api`) |
| Worker | Osobny proces Nest (`apps/worker`) |
| Frontend | Next.js (`apps/web`) - obecnie **stub**; BFF/dashboard w kolejnych fazach |
| DB | PostgreSQL + Prisma 7 (adapter `pg`) |
| Kolejka | pg-boss (ta sama baza; api enqueue, worker `work`) |
| Kontrakty typów | `packages/contracts` (bez Zod w paczce) |
| Walidacja HTTP / env | class-validator; Zod w `api` / `worker` (env, źródło, summary) |
| Testy | Jest (`@vinseo/api`, `@vinseo/worker`) |
| Lokalnie | Compose A: tylko Postgres; Compose B: pełny stack |

---

## Architektura (wysoki poziom)

```text
[Mock źródła / docelowo Workspace lub Fireflies]
                    │
                    ▼
              [pg-boss job]          ← Faza 2 (działa)
     fetch → normalize → redact → summarize(mock+Zod) → persist
                    │
                    ▼
              [PostgreSQL]
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
     [api - DX enqueue]  [worker]
          │
          ▼
   [web - BFF + panel]   ← Faza frontu / po stubie
```

- **API** enqueue DX bez sesji (`POST /dev/meetings/enqueue`); ACL/auth - Faza 3.  
- **Worker** konsumuje `meeting.process`.  
- Przed wywołaniem LlmClient: redakcja PII (E+T+P+K).

---

## Struktura repozytorium

```text
apps/
  api/                 # Nest - HTTP, health; (później auth, ACL, demo)
  worker/              # Nest - ApplicationContext; (później pipeline)
  web/                 # Next - stub strony startowej
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

## Uruchomienie (scaffold - po Fazie 1)

Wymagania: **Node ≥ 22**, **pnpm**, **Docker**.

**Nie** uruchamiaj ścieżki A i B jednocześnie na tych samych portach (5432 / 3000 / 3001). Najpierw `pnpm db:down` albo `pnpm dev:stack:down`.

### Ścieżka A - Postgres w Compose, appki na hoście

```bash
# 1. Zależności
pnpm install

# 2. Env
cp .env.example .env

# 3. Postgres (skrypty root - A-7)
pnpm db:up
# pnpm db:logs   # opcjonalnie
# pnpm db:down   # zatrzymanie

# 4. Prisma
pnpm db:generate
pnpm db:migrate:deploy
# (iteracyjnie przy zmianie schematu) pnpm db:migrate

# 5. Procesy (osobne terminale)
pnpm dev:api      # http://localhost:3001/health → {"status":"ok"}
pnpm dev:worker   # log: Worker application context started
pnpm dev:web      # stub Next (domyślnie :3000)
```

### Ścieżka B - pełny stack w kontenerach (obowiązkowe DX)

```bash
pnpm install          # na hoście opcjonalne; kontenery i tak instalują w wolumenach
cp .env.example .env  # DATABASE_URL z localhost jest OK - compose nadpisuje hostem `postgres`

pnpm dev:stack:up     # docker-compose.dev.yml: postgres + deps + api + worker + web
# pnpm dev:stack:logs
# pnpm dev:stack:down
```

Serwis one-shot **`deps`** robi `pnpm install`, `db:generate` i **`db:migrate:deploy`** (w tym migrację `align_acl_v1_client_link`), zanim wystartują `api` / `worker` / `web`. Kod z hosta jest bind-mountowany; `node_modules` w wolumenach Docker.

### Demo pipeline (po Fazie 2)

```bash
docker compose up -d
pnpm install
cp .env.example .env
pnpm db:generate && pnpm db:migrate:deploy

# terminal A
pnpm dev:worker

# terminal B
pnpm dev:api

# enqueue fixture (DX, bez logowania)
curl -s -X POST http://localhost:3001/dev/meetings/enqueue \
  -H 'content-type: application/json' \
  -d '{"fixtureKey":"demo-client-budget-pl"}'
```

Sprawdź w DB / Prisma Studio: jedno spotkanie, `processingStatus=completed`, `summary` z `actionItems`, segmenty **bez** surowych PII z fixture (placeholdery redakcji).

Ponowne `curl` z tym samym `fixtureKey` nie tworzy drugiego wiersza `Meeting`.

`POST /demo/run-meeting` + UI Test + SSE (z sesją) - **Faza 3**. W `production` trasa DX `/dev/meetings/enqueue` nie jest rejestrowana.

### Smoke testów

```bash
pnpm test                 # api + worker (unit; bez Postgres)
pnpm test:integration     # worker pipeline na vinseo_test (wymaga pnpm db:up + migracji)
# DATABASE_URL="$DATABASE_URL_TEST" pnpm db:migrate:deploy
pnpm --filter @vinseo/api test:e2e
```

---

## Co działa / atrapa / poza zakresem

| Element | Status | Uwagi |
|---------|--------|--------|
| Monorepo pnpm (`api` / `worker` / `web` / `contracts`) | działa | |
| Compose A (`pnpm db:up`) + Compose B (`pnpm dev:stack:up`) | działa | nie równolegle na tych samych portach |
| Prisma schema + migracje | działa | model pod etap 0 + align ACL/client-link |
| `GET /health` na api | działa | smoke Jest e2e |
| Worker + pg-boss `meeting.process` | działa | mock źródła → redact → mock LLM → Zod → persist |
| Enqueue DX `POST /dev/meetings/enqueue` | działa | bez sesji; wyłączone w `production` |
| Redakcja E+T+P+K + unit testy | działa | |
| Stub `web` | działa | bez BFF / dashboardu |
| Auth cookie + ACL v1 + testy | nie | Faza 3 |
| Demo Test + SSE (`/demo/run-meeting`) | nie | Faza 3 + front |
| Prawdziwy Google / Fireflies / LLM | poza etapem 0 | mocki za portami |
| Q&A / RAG, HubSpot, erase UI | poza etapem 0 | opis w `docs/` |
| CI GitHub Actions + ochrona `main` | TODO | przed oddaniem |

---

## CI/CD (zamierzone)

- **Pull request** → install → Postgres test → migracje → **Jest**.
- **workflow_dispatch** → ręczne testy z wyborem brancha.
- Branch **`main`**: tylko PR (branch protection).

Automatyczny CD na VPS - poza v1; checklista w [`docs/deployment.md`](./docs/deployment.md).

---

## Dokumentacja decyzyjna (Część A)

Materiał merytoryczny jest w [`docs/`](./docs/README.md) (m.in. koncepcja, bezpieczeństwo/RODO, koszty, plan etapów, architektura). Przed oddaniem: skondensowany dokument ≤5 stron w repo lub PDF (TODO oddania).

---

## Użycie AI przy zadaniu

> TODO (wymagane na oddanie): jak korzystano z AI (np. Cursor), co model zaproponował, **co trzeba było poprawić** i za co odpowiadasz jako autor kodu.

---

## Licencja / oddanie

Repozytorium zadania rekrutacyjnego. Oddanie: link do repo (publiczne lub prywatne z dostępem dla wskazanego użytkownika) + dokument Części A w repo lub PDF.
