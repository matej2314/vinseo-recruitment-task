---
wersja: 2
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-29
---

# SPEC — Observability

Norma logów technicznych, audytu biznesowego, korelacji i health. Kontekst: `docs/observability.md` (katalog eventów zsynchronizowany z tym SPEC). Model `audit_log`: `SPEC-DANE`. Envelope / `requestId`: `SPEC-KOMUNIKACJA`. Zakaz treści LLM w logach: `SPEC-LLM`. DoD testów audytu: `SPEC-TESTY`.

## Cel / zakres

- pino (JSON) vs trwały `audit_log` — rozdzielone role.
- Correlation id między `api` a `worker`.
- Katalog obowiązkowych `eventType` v1.
- Health na `api` i `workerze`.

**Poza tą wersją:** OpenTelemetry, Sentry, Prometheus/Grafana, ELK/Loki, alerty paging, RUM, HTTP/UI odczytu `audit_log`, eventy `ask.*`, pinowany mechanizm cron retencji.

## Powiązanie ze stylem z docs

| Ustalenie | Wiązanie |
|-----------|----------|
| pino = diagnostyka procesu | stdout JSON; efemeryczne względem kontenera |
| `audit_log` = ślad biznesowy | Zapis z api i workera; odczyt tylko ops/DB |
| Correlation | `requestId` z api w payloadzie joba |
| Health obowiązkowy | Endpointy api + worker (worker niepubliczny) |

**Wyjątek względem stylu globalnego:** brak.

## Wymagania egzekwowalne

### Logger (pino)

O-1. `api` i `worker` logują strukturalnie (**pino**, JSON na stdout).

O-2. Poziom przez env **`LOG_LEVEL`** (np. `info` prod, `debug` lokalnie).

O-3. Redakcja w loggerze / wrapperze: **nigdy** `password`, raw sekretów cookie, pełnych access/refresh tokenów.

O-4. **Zakaz** logowania treści transcriptu i pełnego summary w v1. Dozwolone: id (`meetingId`, `externalMeetingId`, `jobId`), statusy, kody błędów, czasy kroków.

### Correlation

O-5. `api` generuje (lub bezpiecznie przyjmuje) **`requestId`** na request HTTP; loguje go; zwraca w envelope błędu gdy dotyczy (`SPEC-KOMUNIKACJA`).

O-6. Przy enqueue `meeting.process` `requestId` trafia do **payloadu joba**; worker loguje ten sam id przy krokach pipeline.

### Metryki lekkie

O-7. Bez Prometheus / `/metrics` w v1.

O-8. Liczniki **in-memory** w procesie (co najmniej worker: started/completed/failed) + zdarzenia w logach (`job.started` / `job.completed` / `job.failed` z id + krótkim kodem błędu). Restart zeruje liczniki — akceptowalne w v1.

### Audyt (`audit_log`)

O-9. Zapis wyłącznie przez **dedykowany serwis / writer** używany z warstwy aplikacji `api` i `worker` — nie ad hoc z controllera „przy okazji” i nie z `web`.

O-10. **Brak** endpointu HTTP / BFF do odczytu `audit_log` w v1.

O-11. Kształt rekordu (minimum): `id`, `createdAt`, `eventType`, `actorUserId?`, `requestId?`, `resourceType?` / `resourceId?`, `payload` JSON **bez** PII wrażliwych, transcriptu, pełnego summary, hasła.

O-12. Retencja: **90 dni** jako norma polityczna. Mechanizm czyszczenia (cron workera vs inny) — **niepinowany** w tym SPEC; wdrożenie operacyjne poza egzekwowaniem konkretnej libki.

### Katalog `eventType` (v1)

**Obowiązkowe:**

| `eventType` | Kiedy |
|-------------|--------|
| `auth.login.success` | Udane logowanie |
| `auth.login.failure` | Nieudane logowanie (bez zbędnego wycieku istnienia konta w komunikacie publicznym) |
| `auth.logout` | Wylogowanie |
| `meeting.access.denied` | Odczyt poza ACL (np. detail / SSE) |
| `job.enqueued` | Enqueue `meeting.process` (w tym demo) |
| `job.started` | Start joba w workerze |
| `job.completed` | Sukces joba |
| `job.failed` | Fail joba / quarantine |
| `summary.validation.failed` | Reject Zod UC1 |
| `demo.run` | `POST /demo/run-meeting` |

**Opcjonalne:** `meeting.access.granted` (np. przy detail — nie spamować na każdym GET listy).

**Poza tą wersją:** `ask.completed` / `ask.failed` i inne UC2.

Rozszerzanie katalogu = zmiana tego SPEC (+ docs) przed dodaniem eventów „na wszelki wypadek”.

### Health

O-13. **`api`:** `GET /health` (lub `/healthz`) — liveness; opcjonalnie szybki check Postgres (fail → 503). Bez auth albo ograniczenie sieciowe wg deploy. Bez pipeline i ciężkich zapytań.

O-14. **`worker`:** osobny lekki HTTP health na **porcie wewnętrznym** (nieeksponowany publicznie jak API). Sprawdza życie procesu; opcjonalnie DB / pg-boss.

## Norma: wzorce

### Wymagane

- Pino + redakcja sekretów.
- Writer `audit_log` współdzielony kontraktowo przez api i worker.
- `requestId` end-to-end przy demo/job.
- Health na obu procesach Nest.
- Obowiązkowy katalog eventów powyżej.

### Nie wolno

- `console.log` z body zawierającym hasła / transcript.
- Transcript / pełne summary / hasła w `audit_log` lub pino.
- Traktowania `audit_log` jako zamiennika pino (i odwrotnie).
- HTTP odczytu audytu w v1.
- OTel / Sentry / Prometheus jako wymogu v1.
- Publicznego health workera z bogatą diagnostyką na edge.

## Zatwierdzony stack (obszar)

| Element | Wybór |
|---------|--------|
| Logi techniczne | pino |
| Audyt | PostgreSQL `audit_log` przez Prisma |
| Health | Endpointy HTTP Nest (`api` + wewnętrzny `worker`) |
| Metryki v1 | In-memory + logi zdarzeń |

## Kryteria akceptacji

- [ ] Brak transcriptu/haseł w przykładowych logach i wpisach audytu na ścieżce demo.
- [ ] Demo/job: ten sam `requestId` w logach api i workera.
- [ ] Obowiązkowe `eventType` powstają na odpowiadających ścieżkach (auth, deny ACL, demo, job lifecycle, Zod fail).
- [ ] `GET /health` api odpowiada; worker ma wewnętrzny health.
- [ ] Brak trasy HTTP do listowania `audit_log`.

## Poza tą wersją

- Distributed tracing, APM, centralny log stack, Grafana.
- Alerty / SLO / on-call.
- Pinowany job retencji 90 dni (polityka pozostaje).
- Eventy asystenta Q&A.
- Odczyt audytu przez API/UI.
