---
wersja: 6
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# Wdrożenie i środowiska

Środowiska, CI, operacje na VPS oraz checklista ręcznego deployu (v1). Automatyczny CD po merge - poza zakresem v1 (TODO na później).

## Środowiska

| Środowisko | Cel | Skład |
|------------|-----|--------|
| **local (A)** | Dev na hoście | `docker-compose.yml` → Postgres; `pnpm db:up`; procesy `api`/`worker`/`web` na hoście (`pnpm dev:*`) |
| **local (B)** | Dev w kontenerach | `docker-compose.dev.yml` → Postgres + `api`/`worker`/`web`; bind mount kodu + wolumeny `node_modules`; `pnpm dev:stack:up` (**obowiązkowe DX Fazy 1**) |
| **ci** | Testy na PR / dispatch | Compose z bazą testową (`db:up` lub równoważne); Jest; bez pełnego `compose.dev` jako bramki |
| **production** | VPS | Compose produkcyjny: `web`, `api`, `worker`, Postgres; reverse proxy **Nginx** + TLS (osobne od `compose.dev`) |

Zasady:

- Żadnych sekretów w git (`.env` lokalnie / na serwerze; w CI - GitHub Secrets gdy potrzebne).
- Demo (`POST /demo/run-meeting`) wymaga sesji pracownika; **brak** osobnej flagi `DEMO_ENABLED` w kontrakcie v1 (na prod ograniczać dostęp sieciowo / kontami, nie wyłącznikiem env).
- Health: publicznie głównie api (+ web); health workera - sieć wewnętrzna / localhost (patrz `observability.md`).
- **Nie** uruchamiać ścieżki A i B jednocześnie na tych samych portach (5432 / 3000 / 3001) — najpierw `pnpm db:down` albo `pnpm dev:stack:down`.

## Topologia produkcji (docelowa)

```text
Internet
   │
   ▼
Nginx (TLS Let's Encrypt)
   ├── HTTPS → web (Next)
   └── /api (lub osobny host) → api (Nest)
worker + Postgres - sieć Docker wewnętrzna
```

- **Nginx** terminuje HTTPS (certyfikaty Let's Encrypt).
- `api` / `worker` / `web` / `postgres` w Docker Compose na VPS.
- Worker **nie** jest eksponowany publicznie jak API aplikacji.

## Zmienne środowiskowe (obowiązkowe / ważne)

Konkretne nazwy mogą dostać prefiksy per app; logicznie wymagane:

| Zmienna (logiczna) | Opis | local | prod |
|--------------------|------|-------|------|
| `DATABASE_URL` | Połączenie Postgres (Prisma, pg-boss) | tak | tak |
| `DATABASE_URL` (test) / osobna URL testowa | Baza `*_test` w Compose | przy testach | - |
| `NODE_ENV` | `development` / `production` | tak | `production` |
| `LOG_LEVEL` | Poziom pino | `debug`/`info` | `info` |
| Sekrety JWT / cookie (np. `JWT_SECRET`, sekret refresh) | Podpis access JWT + rotacja refresh (HttpOnly) | tak | silne losowe |
| `COOKIE_SECURE` / analog | Secure flag cookies | false lokalnie | **true** (HTTPS) |
| Porty `API_PORT`, `WEB_PORT`, `WORKER_HEALTH_PORT` | Zgodnie z Compose / Nginx | tak | tak |
| Klucze vendorów (Fireflies, **LLM** - jeden provider na UC1+UC2) | Poza v1 kodu (atrapy); na prod gdy integracja | - | secrets, tylko api/worker; nigdy web |

Frontend: wyłącznie zmienne `NEXT_PUBLIC_*` **bez** sekretów (URL API publicznego jeśli potrzebny).

## CI (GitHub Actions) - v1

| Trigger | Zachowanie |
|---------|------------|
| **pull_request** | Install → (Compose DB test) → migracje test → **Jest** (required) |
| **workflow_dispatch** | Ręczne odpalenie testów z **wyborem brancha** |
| Push na **`main`** | Zablokowany direct push (branch protection); tylko PR |

**Reguła zespołu:** merge do `main` tylko przy **zielonych** wymaganych checkach (zgodnie z `testy.md`).

CD automatyczne (SSH + `compose up` po merge) - **poza v1**; poniżej checklista ręczna.

## Deploy na VPS - checklista (TODO operacyjne)

Wykonać ręcznie po review / merge (doprecyzować komendy przy pierwszym setupie serwera):

1. [ ] SSH na VPS; katalog aplikacji zaktualizowany (`git pull` wybranego taga/commita z `main` lub artefakt).
2. [ ] Sekrety w `.env` produkcyjnym uzupełnione (silne sekrety JWT/refresh, `DATABASE_URL`, …).
3. [ ] Build obrazów / `docker compose build` (web, api, worker).
4. [ ] **Migracje Prisma** na bazę prod (`prisma migrate deploy`) - **przed** lub jako osobny krok przed startem api/worker.
5. [ ] `docker compose up -d` (postgres, api, worker, web).
6. [ ] Nginx: proxy + odnowienie / weryfikacja certyfikatu Let's Encrypt.
7. [ ] Smoke: `GET /health` (api), health workera lokalnie, login + odczyt listy (konto testowe nieszkodliwe).
8. [ ] Smoke opcjonalnie: demo / SSE tylko na koncie testowym (demo nie jest wyłączane flagą env).
9. [ ] Logi pino widoczne (`docker compose logs`); opcjonalnie próbka `audit_log` w DB.

Automatyzacja tej listy w Actions - TODO poza v1.

## Backup

- **Codzienny dump Postgres** (pg_dump) obejmujący cały schemat aplikacji, w tym **`audit_log`**.
- Przechowywanie kopii na VPS + wzmianka o offsite (drugi dysk / object storage) - do skonfigurowania na serwerze.
- Retencja dumpów: osobna od retencji wierszy `audit_log` (90 dni w tabeli - job czyszczący; dumpy mogą żyć dłużej według polityki ops).

## Retencja `audit_log`

- **90 dni** w bazie (zgodnie z `observability.md`).
- Job okresowy (worker / cron na VPS) usuwa starsze wiersze.
- Dump backup nie zwalnia z czyszczenia tabeli produkcyjnej.

## Migracje i rollback (zasady)

- Tylko forward `migrate deploy` na prod w v1; ryzykowne migracje destrukcyjne - unikać lub z backupem tuż przed.
- Rollback aplikacji: poprzedni obraz / commit + świadomość stanu migracji (nie „migrate down” ad hoc bez planu).

## Lokalny start (skrót)

Szczegóły komend - root `README` projektu. Dwie ścieżki DX (skrypty root `package.json`):

### Ścieżka A — baza w Compose, appki na hoście

1. `pnpm db:up` — `docker-compose.yml` (Postgres + DB testowa). Zatrzymanie: `pnpm db:down`; logi: `pnpm db:logs`.
2. Migracje: `pnpm db:generate` + `pnpm db:migrate` (dev).
3. Procesy: `pnpm dev:api`, `pnpm dev:worker`, `pnpm dev:web`.
4. Demo: zalogowany pracownik → Test / `POST /demo/run-meeting` (+ SSE).

### Ścieżka B — pełny stack w kontenerach (**obowiązkowa implementacja Fazy 1**)

1. `cp .env.example .env` (jeśli brak).
2. `pnpm dev:stack:up` — `docker-compose.dev.yml`: Postgres + `api` + `worker` + `web`; kod z bind mountu; zależności w wolumenach Docker; obraz bazowy `docker/dev/Dockerfile`.
3. Logi: `pnpm dev:stack:logs`; stop: `pnpm dev:stack:down`.
4. W kontenerach `DATABASE_URL` wskazuje host `postgres` (nadpisanie w compose); migracje odpala serwis `api` przy starcie (`db:migrate:deploy`).

`compose.dev` **nie** zastępuje obrazów produkcyjnych z checklisty VPS — to wyłącznie DX z hot-reload.

## Świadomie poza v1

- Automatyczny CD po merge.
- Blue/green / canary.
- Managed Kubernetes.
- Centralny secret manager (Vault) - opcjonalnie później; v1: plik env + GitHub Secrets do CI.

## Mapowanie na inne dokumenty

- Health, pino, `audit_log`: `observability.md`
- Testy i reguła merge: `testy.md`
- Procesy i Compose: `architektura.md`, `architektura_katalogi_pliki.md`
- Frontend / web na VPS: `frontend.md`
- LLM / klucze: `llm_i_asystent.md`
- Koszty VPS: `koszty_i_warianty.md`
