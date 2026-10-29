---
wersja: 2
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-29
---

# SPEC — Architektura (monolit, procesy, warstwy)

Norma implementacji stylu globalnego Firmowego asystenta spotkań. Koncepcja i uzasadnienie: `docs/architektura.md`, drzewo monorepo: `docs/architektura_katalogi_pliki.md`. Ten plik **nie** redefiniuje docs — egzekwuje *jak wolno pisać kod*.

## Cel / zakres

- Granice procesów `api` / `worker` / `web` i kierunek zależności warstw.
- Wymagane wzorce (use case, porty, cienkie controllery, DI).
- Reguły `packages/` i pnpm workspaces.
- Zwalidowana konfiguracja na starcie procesów Nest.
- Zakazy stylów i sprzężeń sprzecznych z monolitem v1.

**Poza tym SPEC:** kontrakty HTTP/BFF/SSE/jobów (`SPEC-KOMUNIKACJA`), auth JWT+refresh / ACL (`SPEC-AUTH_I_ACL`), kroki pipeline (`SPEC-PIPELINE`), LLM (`SPEC-LLM`), UI (`SPEC-FRONTEND`), schema Prisma (`SPEC-DANE`), sygnały (`SPEC-OBSERVABILITY`), piramida testów (`SPEC-TESTY`).

## Powiązanie ze stylem z docs

| Ustalenie z docs | Jak wiąże ten SPEC |
|------------------|--------------------|
| Modularny monolit, zależności do wewnątrz | Warstwy i zakazy importów poniżej |
| Hexagonal na granicach I/O | Porty obowiązkowe dla źródła spotkań i LlmClient |
| Trzy procesy, jedna Postgres | Osobne entry `api` / `worker` / `web`; bez mikroserwisów |
| Sesja access JWT + refresh (cookie HttpOnly) | Norma szczegółowa → `SPEC-AUTH_I_ACL`; transport → `SPEC-KOMUNIKACJA` |
| Style wewnętrzne BC (pipeline, ACL, redakcja, web+SSE…) | Dopuszczalne w swoich SPEC; **bez** wyjątku od stylu globalnego |
| `packages/` = typy kontraktów, bez Zod | Zakaz Zod w całym `packages/` |

**Wyjątek względem stylu globalnego:** brak.

## Wymagania egzekwowalne

A-1. Kod aplikacji należy do jednego z procesów: `apps/api` (Nest HTTP), `apps/worker` (Nest bez publicznego HTTP dla przeglądarki), `apps/web` (Next.js + BFF). Współdzielone między procesami wyłącznie definicje typów/kontraktów w `packages/` (v1: `packages/contracts`) oraz wspólna baza / Prisma w rootcie.

A-2. Kierunek zależności w `api` i `worker`:

```text
HTTP (tylko api) / entry joba (worker)
  → use case (warstwa aplikacji)
  → porty (interfejsy)
  ← infrastruktura (Prisma, pg-boss, adaptery mock/prod)
```

Reguły biznesowe (ACL, statusy, idempotencja, redakcja) żyją w warstwie aplikacji (serwisy / use case’y), **nie** w controllerach, Route Handlerach BFF ani komponentach React.

A-3. **Bez osobnej warstwy klas domenowych** (encje DDD, domain events „wszędzie”). Wystarczają use case’y / serwisy aplikacji + porty. Bogaty DDD jest poza zakresem v1 (`docs/architektura.md`).

A-4. Procesy **nie importują** kodu źródłowego nawzajem: zabronione `apps/api` ↔ `apps/worker` oraz ciągnienie logiki Nest z api do workera (i odwrotnie). Komunikacja: HTTP (web→api), pg-boss, wspólna DB, typy z `packages/`.

A-5. `apps/web` nie zawiera egzekucji ACL do treści spotkań ani orkiestracji pipeline / enqueue pg-boss poza wywołaniem HTTP API przez BFF.

A-6. Konfiguracja `api` i `worker`: na starcie procesu **fail-closed** — brak lub niepoprawne wymagane zmienne środowiskowe → proces **nie** startuje. Zakaz odczytu `process.env` ad hoc w use case’ach, redakcji, ACL i adapterach (poza warstwą config).

## Norma: wzorce i struktura

### Wymagane

| Wzorzec | Sens w projekcie |
|---------|------------------|
| Cienkie controllery Nest | Mapowanie HTTP ↔ DTO / wynik use case; bez Prisma i bez reguł ACL w metodzie controllera |
| Guards / pipes Nest | Auth sesji, `ValidationPipe` + DTO |
| Use case / serwis aplikacji per operacja | Np. lista spotkań, detail, enqueue demo — jedna odpowiedzialność na operację biznesową |
| Repozytorium **lub** serwis aplikacji nad Prisma | Dostęp do DB za abstrakcją aplikacji; **nie** `prisma.*` w controllerze |
| Ports & adapters | Port źródła spotkań, port `LlmClient`, dostęp do kolejki — implementacje w infrastrukturze / `adapters` |
| Moduły Nest + jawne `exports` | Moduły wg odpowiedzialności (`auth`, `access`, `meetings`, `pipeline`, `jobs`…); eksport tylko kontraktu potrzebnego sąsiadom |

### Wolno

- Współdzielić typy i kształty DTO / payloadów jobów w `packages/contracts` (TypeScript).
- Trzymać Prisma Client / moduł Prisma jako infrastrukturę używaną przez serwisy aplikacji w `api` i `worker` (osobne procesy, ten sam schemat).
- Używać mockowych adapterów za tymi samymi portami co przyszłe implementacje prod.

### Nie wolno

- Importować `apps/api` z `apps/worker` (i odwrotnie).
- Umieszczać Zod (schematy, parse) w **którymkolwiek** pakiecie pod `packages/`.
- Umieszczać logiki ACL lub pipeline w `apps/web` (w tym BFF jako źródło prawdy uprawnień).
- Trzymać logikę biznesową / ACL wyłącznie w React lub wyłącznie w BFF.
- Synchronicznie przetwarzać cały transcript→summary w handlerze HTTP `api`.
- Stosować event sourcing, pełny CQRS „na sztywno”, mikroserwisy per domena / osobne bazy per usługa w v1.
- Tworzyć „God Module” / fat controller łączący auth, ACL, pipeline, Prisma i HTTP w jednym miejscu (`docs/anty_patterny.md`).
- Czytać `process.env` głęboko w logice aplikacji zamiast zwalidowanego configu.

## Zatwierdzony stack (obszar architektury)

| Element | Wybór |
|---------|--------|
| Język | TypeScript |
| Monorepo | **pnpm workspaces** |
| API / worker | NestJS (osobne procesy / entry) |
| Web | Next.js (App Router) + BFF |
| DB | PostgreSQL |
| ORM / migracje | Prisma (schemat w rootcie `prisma/`) |
| Kolejka | pg-boss (w Postgresie; bez Redis jako brokera v1) |
| Kontrakty współdzielone | `packages/contracts` — typy TS |
| Walidacja HTTP | `class-validator` + `class-transformer` (DTO Nest) |
| Walidacja wyniku AI / summary oraz env | **Zod w aplikacjach** (`api` / `worker`; ewentualnie `web` tylko lokalnie, nie w `packages/`) |
| Config procesów Nest | `@nestjs/config` + walidacja przy starcie (**Zod** jako `validationSchema` / Standard Schema **lub** `validate` z class-validator) — zgodnie z dokumentacją Nest Configuration |
| Testy (narzędzie) | Jest (szczegóły piramidy: `SPEC-TESTY`) |

Weryfikacja config: dokumentacja NestJS Configuration — `ConfigModule.forRoot` z `validationSchema` (Zod) albo funkcją `validate`; przy błędzie walidacji aplikacja nie bootstrapuje.

## Konfiguracja — reguły

C-1. `api` i `worker` rejestrują globalny / root `ConfigModule` z walidacją env przed obsługą ruchu / jobów.

C-2. Preferowany mechanizm v1: Zod przez `validationSchema` w `@nestjs/config` (oficjalnie wspierane jako Standard Schema). Dopuszczalna ścieżka alternatywna: custom `validate` + class-validator — jedna spójna ścieżka per proces, bez mieszania ad hoc w głębokich warstwach.

C-3. Wartości konfiguracyjne injectowane do serwisów / adapterów z warstwy config (np. `ConfigService` lub typowany obiekt config), nie surowy `process.env` w use case.

## Kryteria akceptacji (review / weryfikacja)

- [ ] Brak zależności źródłowych `apps/api` ↔ `apps/worker`.
- [ ] Controllery HTTP nie wywołują Prisma bezpośrednio ani nie zawierają reguł ACL.
- [ ] Operacje biznesowe odczytu/zapisu / demo idą przez use case / serwis aplikacji.
- [ ] Porty I/O (źródło, LlmClient) mają interfejs + adapter; use case nie zależy od konkretnego vendora.
- [ ] W `packages/` nie ma Zod ani logiki runtime walidacji AI/HTTP.
- [ ] `apps/web` nie egzekwuje ACL treści ani nie enqueue’uje jobów poza BFF→API.
- [ ] Start `api` i `worker` z brakującym wymaganym env kończy się błędem bootstrapu.
- [ ] Układ katalogów zgodny z intencją `docs/architektura_katalogi_pliki.md` (moduły per odpowiedzialność).

## Poza zakresem

- Szczegóły ścieżek HTTP, payloadów joba i portu źródła.
- Reguły ACL (uczestnik / membership / admin) i auth cookie.
- Orkiestracja kroków `meeting.process` i redakcja PII.
- Implementacja UC1/UC2 LLM.
- Widoki Next / shadcn.
- Pola schematu Prisma i retencja `audit_log`.
- Katalog zdarzeń audytu i format logów pino.
- Dobór przypadków testowych (poza ogólną zgodnością z warstwami).
