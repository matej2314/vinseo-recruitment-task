# Vinseo — Firmowy asystent spotkań

Zadanie rekrutacyjne: **Mid Fullstack Developer** (Vinseo).  
Cel produktu: po spotkaniu mieć transkrypcję (PL, mówcy), krótkie streszczenie, listę ustaleń i zadań oraz (w kolejnych etapach) pytania do historii spotkań ze wskazaniem źródła — przy kontroli dostępu i ograniczeniu wynoszenia danych klientów.

**Stan repo (Faza 1 — fundament):** monorepo pnpm z `apps/api`, `apps/worker`, `apps/web` (stub), `packages/contracts`, Prisma + migracje, Compose ścieżka A (`db:*`) i B (`dev:stack:*`). Pipeline, auth/ACL HTTP, pełne UI — kolejne fazy.

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
| Frontend | Next.js (`apps/web`) — obecnie **stub**; BFF/dashboard w kolejnych fazach |
| DB | PostgreSQL + Prisma 7 (adapter `pg`) |
| Kolejka | pg-boss (ta sama baza; konsumpcja w Fazie 2) |
| Kontrakty typów | `packages/contracts` (bez Zod w paczce) |
| Walidacja HTTP / env | class-validator; Zod w appkach (env, później summary) |
| Testy | Jest (`@vinseo/api`) |
| Lokalnie | Compose A: tylko Postgres; Compose B: pełny stack |

---

## Architektura (wysoki poziom)

```text
[Mock źródła / docelowo Workspace lub Fireflies]
                    │
                    ▼
              [pg-boss job]          ← Faza 2
     fetch → normalize → redact → summarize(mock+Zod) → persist
                    │
                    ▼
              [PostgreSQL]
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
     [api - ACL]         [worker]
          │
          ▼
   [web - BFF + panel]   ← Faza frontu / po stubie
```

- **API** egzekwuje dostęp (ACL v1: organizator ∨ uczestnik ∨ admin — Faza 3).  
- **Worker** przetwarza kolejkę (Faza 2).  
- Przed wywołaniem LlmClient: redakcja PII (Faza 2).

---

## Struktura repozytorium

```text
apps/
  api/                 # Nest — HTTP, health; (później auth, ACL, demo)
  worker/              # Nest — ApplicationContext; (później pipeline)
  web/                 # Next — stub strony startowej
packages/
  contracts/           # wspólne typy (m.in. statusy, client-link, job payload)
prisma/
  schema.prisma
  migrations/          # init_etap0 + align_acl_v1_client_link
docs/                  # dokumentacja produktowa / architektoniczna
spec/                  # normy implementacji
docker-compose.yml     # ścieżka A — Postgres (+ baza testowa)
docker-compose.dev.yml # ścieżka B — Postgres + api + worker + web
docker/dev/            # Dockerfile stacku B
```

---

## Uruchomienie (scaffold — po Fazie 1)

Wymagania: **Node ≥ 22**, **pnpm**, **Docker**.

**Nie** uruchamiaj ścieżki A i B jednocześnie na tych samych portach (5432 / 3000 / 3001). Najpierw `pnpm db:down` albo `pnpm dev:stack:down`.

### Ścieżka A — Postgres w Compose, appki na hoście

```bash
# 1. Zależności
pnpm install

# 2. Env
cp .env.example .env

# 3. Postgres (skrypty root — A-7)
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

### Ścieżka B — pełny stack w kontenerach (obowiązkowe DX)

```bash
pnpm install          # na hoście opcjonalne; kontenery i tak instalują w wolumenach
cp .env.example .env  # DATABASE_URL z localhost jest OK — compose nadpisuje hostem `postgres`

pnpm dev:stack:up     # docker-compose.dev.yml: postgres + deps + api + worker + web
# pnpm dev:stack:logs
# pnpm dev:stack:down
```

Serwis one-shot **`deps`** robi `pnpm install`, `db:generate` i **`db:migrate:deploy`** (w tym migrację `align_acl_v1_client_link`), zanim wystartują `api` / `worker` / `web`. Kod z hosta jest bind-mountowany; `node_modules` w wolumenach Docker.

### Smoke testów API

```bash
pnpm --filter @vinseo/api test
pnpm --filter @vinseo/api test:e2e
```

(E2E health oczekuje działającego procesu / konfiguracji jak w `apps/api/test`.)

### Demo (jeszcze nie w Fazie 1)

`POST /demo/run-meeting` + UI Test + SSE — **Faza 3** (backend) / major frontu. Po Fazie 1 nie ma jeszcze enqueue pipeline.

---

## Co działa / atrapa / poza zakresem

| Element | Status | Uwagi |
|---------|--------|--------|
| Monorepo pnpm (`api` / `worker` / `web` / `contracts`) | działa | |
| Compose A (`pnpm db:up`) + Compose B (`pnpm dev:stack:up`) | działa | nie równolegle na tych samych portach |
| Prisma schema + migracje | działa | model pod etap 0 + align ACL/client-link (deploy przy A ręcznie / przy B w `deps`) |
| `GET /health` na api | działa | smoke Jest e2e |
| Szkielet worker (Nest context) | działa | bez konsumpcji jobów |
| Stub `web` | działa | bez BFF / dashboardu |
| Pipeline + pg-boss + mock źródła / LLM | atrapa / nie | Faza 2 |
| Redakcja + testy | nie | Faza 2 |
| Auth cookie + ACL v1 + testy | nie | Faza 3 |
| Demo Test + SSE | nie | Faza 3 + front |
| Prawdziwy Google / Fireflies / LLM | poza etapem 0 | mocki za portami |
| Q&A / RAG, HubSpot, erase UI | poza etapem 0 | opis w `docs/` |
| CI GitHub Actions + ochrona `main` | TODO | przed oddaniem |

---

## CI/CD (zamierzone)

- **Pull request** → install → Postgres test → migracje → **Jest**.
- **workflow_dispatch** → ręczne testy z wyborem brancha.
- Branch **`main`**: tylko PR (branch protection).

Automatyczny CD na VPS — poza v1; checklista w [`docs/deployment.md`](./docs/deployment.md).

---

## Dokumentacja decyzyjna (Część A)

Materiał merytoryczny jest w [`docs/`](./docs/README.md) (m.in. koncepcja, bezpieczeństwo/RODO, koszty, plan etapów, architektura). Przed oddaniem: skondensowany dokument ≤5 stron w repo lub PDF (TODO oddania).

---

## Użycie AI przy zadaniu

> TODO (wymagane na oddanie): jak korzystano z AI (np. Cursor), co model zaproponował, **co trzeba było poprawić** i za co odpowiadasz jako autor kodu.

---

## Licencja / oddanie

Repozytorium zadania rekrutacyjnego. Oddanie: link do repo (publiczne lub prywatne z dostępem dla wskazanego użytkownika) + dokument Części A w repo lub PDF.
