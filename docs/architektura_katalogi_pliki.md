---
wersja: 11
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-11-01
---

# Architektura katalogów i plików

Docelowe (i obowiązujące) drzewo monorepo Firmowego asystenta spotkań. Układ odzwierciedla modularny monolit z `architektura.md`: osobne procesy `api` / `worker` / `web`, wspólne kontrakty typów, jedna baza i Prisma w rootcie.

## Drzewo

```text
/
├── apps/
│   ├── api/                          # NestJS - HTTP, auth użytkowników, ACL
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/               # zwalidowana konfiguracja procesu
│   │   │   ├── auth/                 # etap 0: e-mail/hasło, bcrypt; etap 1+: + IdP Google; sesja / cookies
│   │   │   ├── users/
│   │   │   ├── meetings/             # odczyt/zapis spotkań (cienkie controllery)
│   │   │   ├── access/               # reguły ACL (osobny moduł)
│   │   │   ├── audit/                # zapis do audit_log (serwis; bez HTTP odczytu w v1)
│   │   │   └── ...
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── worker/                       # NestJS - osobny entry, bez publicznego HTTP
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   ├── jobs/                 # rejestracja / nazwy jobów pg-boss
│   │   │   ├── pipeline/             # orkiestracja kroków spotkania
│   │   │   ├── audit/                # ten sam kontrakt zapisu audit_log co api
│   │   │   └── adapters/             # mock źródła (FF transcript), llm/ (LlmClient mock|prod)
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                          # Next.js - App Router
│       ├── app/
│       │   ├── api/                  # BFF (Route Handlers)
│       │   ├── (dashboard)/...       # /meetings (tabela+Test), /search (mock)
│       │   ├── page.tsx              # auth (login/register)
│       │   └── layout.tsx / ...
│       ├── components/               # meetings-dashboard, meeting-result-cell, auth, shadcn
│       ├── lib/                      # routes, meeting-summary, BFF helpers
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── contracts/                    # wspólne definicje kontraktów (typy TS)
│       ├── src/                      # DTO / event shapes uzgodnione między appami
│       ├── package.json
│       └── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/                             # dokumentacja startowa projektu
├── spec/                             # artefakty Spec-Driven Development (osobno od docs)
├── .github/
│   └── workflows/                    # PR tests, workflow_dispatch, ...
├── docker-compose.db.yml             # ścieżka A: tylko Postgres (`vinseo` + `vinseo_test`); kolejka = pg-boss w DB
├── docker-compose.dev.yml            # ścieżka B: Postgres + api/worker/web (bind mount)
├── docker/
│   ├── postgres/                     # init DB testowej
│   └── dev/
│       └── Dockerfile                # obraz bazowy Node+pnpm pod compose.dev (nie prod)
├── package.json                      # workspaces / skrypty root (`db:*`, `dev:*`, `dev:stack:*`)
├── pnpm-workspace.yaml
└── README.md
```

Rootowe skrypty: ścieżka A - `pnpm db:up` / `db:down` / `db:logs` + `dev:api` / `dev:worker` / `dev:web`. Ścieżka B - `pnpm dev:stack:up` / `dev:stack:down` / `dev:stack:logs`. Migracje: `pnpm db:generate` / `db:migrate` / `db:migrate:deploy`. Szczegóły: `deployment.md`, root `README.md`.

## Zasady rozmieszczenia

| Lokalizacja | Co tu należy | Czego tu nie kłaść |
|-------------|--------------|---------------------|
| `apps/api` | Controllers, auth, egzekucja ACL, use case'y odczytu/zapisu dla UI, zapis `audit_log` | Długi pipeline transcript→summary w requestcie HTTP; publiczne API odczytu audytu w v1 |
| `apps/worker` | Joby, kroki pipeline, implementacja redakcji, adaptery I/O (mocki), zapis `audit_log` | Publiczne endpointy dla przeglądarki; decyzje „czy user widzi X” przy renderze UI |
| `apps/web` | App Router, BFF w `app/api/*`, dashboard (sidebar: tabela+Test / mock wyszukiwarka), cookie HttpOnly wg auth | Reguły ACL do treści spotkań; Zod „źródło prawdy” dla całego monorepo |
| `packages/contracts` | Współdzielone **typy** i kształty kontraktów między api / worker / web | Zod, bcrypt, Prisma Client, logika redakcji, reguły ACL |
| `prisma/` | Jedyny schemat i migracje dla całej instalacji (w tym model `audit_log`) | Osobne schema per aplikacja; treść transcriptu w tabeli audytu |
| `docker-compose.db.yml` + skrypty `db:*` | Ścieżka A / CI: lokalny Postgres (`vinseo` + `vinseo_test`); `pnpm db:up` | Sekretów w compose; zastępowania `compose.dev` |
| `docker-compose.dev.yml` + `docker/dev/` + `dev:stack:*` | Ścieżka B (obowiązkowa): Postgres + procesy app w kontenerach, bind mount kodu, wolumeny zależności | Obrazów produkcyjnych VPS; równoległego `db:up` na tych samych portach |
| `docs/` | Dokumentacja koncepcyjna i architektoniczna | Normy egzekwowalne SPEC (to `spec/`) |
| `spec/` | Artefakty SDD / SPEC uzgodnione w procesie projektu | Zastępowanie treści z `docs/` |

## Odzwierciedlenie stylu architektury

- **Modularny monolit, trzy procesy** → `apps/api`, `apps/worker`, `apps/web`.
- **Porty / adaptery na I/O** → `apps/worker/src/adapters/` (port **metadanych** Calendar + port **treści** `mock` / `fireflies` / `gemini-notes` + **llm**); w obecnej wersji zaślepki Calendar/`gemini-notes` (Faza 3.7); UC2 ask później w `apps/api` na tym samym kontrakcie LlmClient; typy w `packages/contracts`. **Zakaz** fat-adaptera łączącego Calendar+FF+Notes w jednym pliku „wszystko Google”.
- **ACL jako osobna odpowiedzialność** → `apps/api/src/access/`, nie schowane wyłącznie w controllerze meetings.
- **Pipeline jako orkiestracja** → `apps/worker/src/pipeline/` + `jobs/`.
- **Jedna baza** → rootowe `prisma/` + Postgres w Compose (`pnpm db:up` albo usługa w `compose.dev`); worker i api korzystają z tego samego schematu.
- **Bez Zod w paczce kontraktów** → walidacja Zod tylko wewnątrz konkretnej aplikacji, która egzekwuje kontrakt na swojej granicy.

## Konwencje nazewnictwa (katalogi)

- Moduły Nest: nazwy domenowe (`meetings`, `access`, `auth`), nie `utils` / `common` / `helpers` jako dumping ground.
- Adaptery: nazwa portu + implementacja (metadane Calendar vs treść mock / fireflies / gemini-notes) w `adapters/`.
- Testy współlokalizowane lub w `test/` danej aplikacji - zgodnie z konwencją Nest/Jest w danym app.

## Mapowanie na inne dokumenty

- Decyzje warstw i procesów: `architektura.md`
- Zakres produktu: `dokumentacja_koncepcyjna.md`
- Normatywne kontrakty I/O (HTTP, joby, BFF): `dokumentacja_komunikacji.md`
- UI / trasy web: `frontend.md`
- LLM use case’y: `llm_i_asystent.md`
