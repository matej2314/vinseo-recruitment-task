---
wersja: 5
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-29
---

# Observability

Jak obserwujemy Firmowego asystenta spotkań w v1: sygnały, narzędzia, health, audyt biznesowy, świadome ograniczenia. Środowiska i deploy: `deployment.md`. Kontrakty HTTP: `dokumentacja_komunikacji.md`.

## Zakres filarów v1

| Filar | W v1 | Poza v1 |
|-------|------|---------|
| **Logi techniczne** | Strukturalne JSON (**pino**) na stdout, poziomy przez env | ELK / Loki / centralny stack logów |
| **Audyt biznesowy** | Tabela **`audit_log`** w PostgreSQL - kluczowe zdarzenia domenowe | Publiczne HTTP API do odczytu logów; SIEM |
| **Correlation** | `requestId` / correlation id - **generowane w API**, przekazywane do workera w payloadzie joba (i do `audit_log`) | Pełny distributed tracing |
| **Metryki** | Proste **liczniki w pamięci** + **logi zdarzeń** jobów (completed/failed) | Prometheus `/metrics`, Grafana |
| **Tracing** | Brak OTel/Jaeger; korelacja przez id w logach / audycie | OpenTelemetry |
| **Błędy APM** | Log + status joba `failed` + wpis w `audit_log` gdzie dotyczy | Sentry / vendor APM |
| **Alerty / SLO** | Brak pagera; podgląd logów / `audit_log` / statusów | Formalne SLO, PagerDuty |
| **Health** | **Obowiązkowe** endpointy na **api** i **workerze** | Service mesh probes zaawansowane |
| **RUM / frontend** | Poza zakresem | Sentry browser itd. |

**Rozróżnienie:** pino = diagnostyka procesu (efemeryczna w logach kontenera). `audit_log` = trwały ślad **kluczowej logiki biznesowej** w bazie (retencja poniżej). Nie zastępują się nawzajem.

## Instrumentacja

### Gdzie powstają sygnały

| Proces | Co loguje / ekspozycja |
|--------|-------------------------|
| **api** | Start requestu (method, path, `requestId`), wynik auth (bez hasła), decyzje ACL na poziomie „allow/deny” **bez** treści spotkania, enqueue joba (`jobId`, `externalMeetingId`, `requestId`), błędy HTTP |
| **worker** | Start/koniec kroku pipeline, wynik Zod (ok/fail), status końcowy joba; ten sam `requestId` / `correlationId` z payloadu jeśli przekazany |
| **web / BFF** | Minimalnie; błędy proxy; bez logowania ciał transcriptu |

### Correlation id

1. API **generuje** (lub przyjmuje z nagłówka przychodzącego, jeśli bezpiecznie uzgodnione) identyfikator korelacji na request HTTP.
2. Id wraca w envelope błędu jako `requestId` (gdy dotyczy) i jest logowane.
3. Przy enqueue `meeting.process` id trafia do **payloadu joba**, żeby logi workera dało się spiąć z requestem demo / przyszłego webhooka.

### Logger: pino

- JSON na stdout (przyjazne pod VPS / Docker logs).
- Poziom: `LOG_LEVEL` (np. `info` prod, `debug` lokalnie).
- Redakcja w transporterze / wrapperze: nigdy nie logować pól `password`, raw cookie sekretnych, pełnych tokenów.

### Treść transcriptu i PII

- **Nie logujemy** treści transcriptu ani pełnego summary w logach v1.
- Dozwolone: identyfikatory (`meetingId`, `externalMeetingId`, `jobId`), statusy, kody błędów, czasy trwania kroków.
- Debug z fragmentami zredagowanymi - tylko jeśli kiedyś włączone świadomie; domyślnie wyłączone.

### Metryki lekkie

Bez endpointu Prometheus w v1:

- Liczniki w pamięci procesu workera (i ewentualnie api): np. `jobs_completed`, `jobs_failed`, `jobs_started` - okresowo logowane (np. co N minut lub na zakończenie joba jako event).
- Zdarzenia w logach: `job.started`, `job.completed`, `job.failed` z polami id + powód błędu (krótki kod, nie stack z danymi klienta).

Restart procesu zeruje liczniki w pamięci - akceptowalne w v1; trwała historia techniczna = logi stdout; trwała historia biznesowa = `audit_log`.

## Audyt biznesowy: tabela `audit_log`

### Cel

Trwały zapis zdarzeń związanych z **kluczową funkcjonalnością** (auth, ACL, pipeline, demo, walidacja summary) - do analizy, oddania i późniejszego ops. To **nie** jest dump requestów HTTP ani magazyn transcriptów.

### Zapis i odczyt

| Kierunek | v1 |
|----------|-----|
| **Zapis** | Z `api` i `worker` przez dedykowany serwis / writer (nie z controllera „przy okazji”) |
| **Odczyt** | Wyłącznie **operacyjnie** (SQL, Prisma Studio, dostęp ops do DB na VPS). **Brak** endpointu HTTP / BFF do `audit_log` w v1 |

### Retencja

- **90 dni** - rekordy starsze usuwane jobem okresowym lub polityką czyszczenia (szczegół implementacji w deploy / worker cron).
- Backup VPS obejmuje także `audit_log` (patrz `deployment.md` gdy powstanie).

### Kształt rekordu (logiczny)

Pola minimum: `id`, `createdAt`, `eventType`, `actorUserId` (nullable), `requestId` / correlation id (nullable), `resourceType` / `resourceId` (nullable), `payload` (JSON metadanych - **bez** PII wrażliwych i **bez** treści transcriptu / pełnego summary / hasła).

### Katalog zdarzeń v1

**Obowiązkowe:**

| `eventType` | Kiedy |
|-------------|--------|
| `auth.login.success` / `auth.login.failure` | Logowanie (failure bez zbędnego wycieku istnienia konta) |
| `auth.logout` | Wylogowanie |
| `meeting.access.denied` | Próba odczytu poza ACL (detail / SSE) |
| `job.enqueued` | Enqueue `meeting.process` (w tym demo) |
| `job.started` / `job.completed` / `job.failed` | Lifecycle joba w workerze |
| `summary.validation.failed` | Zod reject (UC1) |
| `demo.run` | Przycisk Test / `POST /demo/run-meeting` |

**Opcjonalne:** `meeting.access.granted` (np. detail — nie spamować na każdym GET listy).

**Poza v1 kodu:** `ask.completed` / `ask.failed` (UC2).

Rozszerzanie katalogu — przez zmianę docs + `spec/SPEC-OBSERVABILITY.md` + kod; unikać eventów „na wszelki wypadek”.

## Health (obowiązkowe)

### API

- `GET /health` (lub `/healthz`) - liveness: proces żyje; opcjonalnie szybki check połączenia z Postgres (jeśli fail → 503).
- Bez auth (lub osobna sieć / localhost na VPS - decyzja w deploy).
- Nie wykonuje pipeline ani ciężkich zapytań.

### Worker

- Odpowiednik health **obowiązkowy**: osobny lekki listener HTTP tylko pod health **albo** ustalony mechanizm readiness (np. plik/flag + sidecar) - w docs przyjmujemy **osobny endpoint HTTP health na workerze** (port wewnętrzny, nieeksponowany publicznie jak API).
- Sprawdza: proces żyje; opcjonalnie: połączenie z DB / pg-boss.
- Publiczny reverse proxy na VPS wystawia publicznie głównie api (+ web); health workera - sieć wewnętrzna / localhost monitoringu.

## Alerty v1

- Brak automatycznych alertów pagingowych.
- Operacyjnie: przegląd logów pino i wierszy `audit_log` przy `job.failed`; health checks przy deployu.
- Później (poza v1): alert na wzrost `jobs_failed`, niedostępność `/health`; ewentualnie HTTP odczytu audytu dla admina.

## Świadomie poza v1

- OpenTelemetry, Jaeger/Zipkin.
- Sentry.
- Prometheus + Grafana.
- Centralny ELK/Loki.
- Formalne SLI/SLO i on-call.
- Logowanie audio / pełnych notatek z Meet/Fireflies.
- **HTTP API / UI do przeglądania `audit_log`** (odczyt tylko DB/ops).
- Zapis pełnej treści transcriptu lub summary w `audit_log`.

## Anty-patterny observability

- `console.log` z całym body requestu (hasła, transcript).
- Zapis transcriptu / hasła / pełnego summary do `audit_log`.
- Traktowanie `audit_log` jako zamiennika pino (lub odwrotnie).
- Brak wspólnego id między api a workerem przy debugowaniu demo Test.
- Publiczne wystawienie health workera z danymi diagnostycznymi.
- Udawanie „pełnego APM” w README bez realnej instrumentacji.

## Mapowanie na inne dokumenty

- Deploy i środowiska: `deployment.md`
- Testy nie zastępują telemetrii prod: `testy.md`
- Przepływ jobów: `data_flow.md`
- Architektura / audit w modelu: `architektura.md`
- RODO (zakaz treści w logach): `bezpieczenstwo_i_rodo.md`
- LLM use case’y: `llm_i_asystent.md`
