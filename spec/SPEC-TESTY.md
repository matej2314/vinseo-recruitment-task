---
wersja: 5
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# SPEC — Testy

Norma strategii testów v1 i DoD przed merge. Kontekst: `docs/testy.md` (SSE, redakcja E+T+P+K, demo bez `DEMO_ENABLED`). Reguły chronione testami: `SPEC-AUTH_I_ACL`, `SPEC-PIPELINE`, `SPEC-LLM`, `SPEC-KOMUNIKACJA` (SSE), `SPEC-OBSERVABILITY`. UI smoke: `SPEC-FRONTEND`. CI/env: `docs/deployment.md`.

## Cel / zakres

- Piramida: unit → integracja (Postgres testowy) → bez Playwright jako must-have.
- Obowiązkowe przypadki (ACL, redakcja, Zod, pipeline, API, SSE, audyt).
- CI: PR + ochrona `main`.

**Poza tą wersją:** E2E Playwright, prawdziwy Fireflies/LLM, load 300 h/mies., testy UC2 jako bloker DoD.

## Powiązanie ze stylem z docs

| Ustalenie | Wiązanie |
|-----------|----------|
| Testowalność granic | ACL/redakcja/Zod bez HTTP; pipeline z mockami portów + DB |
| Fail-closed / idempotencja | Asertywne testy integracyjne |
| UI v1 | Smoke build/typecheck; nie E2E |
| Styl globalny | Testy współlokalizowane w apps; bez wyjątku „tylko e2e” |

**Wyjątek względem stylu globalnego:** brak.

## Wymagania egzekwowalne

### Narzędzia i izolacja

T-1. Runner: **Jest** we workspaces (`apps/api`, `apps/worker`; web: smoke / lekkie unit jeśli są).

T-2. HTTP API: **supertest** + `@nestjs/testing`.

T-3. Integracja: osobna baza PostgreSQL testowa (Compose / override, np. `vinseo_test`); lokalnie typowo **`pnpm db:up`** (ścieżka A, A-7). Pełny stack B (`dev:stack:up` / A-8) **nie** jest wymagany do DoD ani CI v1. Migracje Prisma na `DATABASE_URL_TEST` przed suite; **zakaz** współdzielenia bazy z dev bez izolacji.

T-4. Wyłącznie fixture / mock — bez prawdziwych nagrań i danych klientów.

T-5. Nazewnictwo plików/testów opisuje **zachowanie**, nie detal implementacji.

### Unit — obowiązkowe

T-6. **ACL (`access`)** — tabela przypadków (rozszerzalna):

| Użytkownik | Spotkanie | Oczekiwane |
|------------|-----------|------------|
| Organizator | to spotkanie | allow |
| Uczestnik wewnętrzny | to spotkanie | allow |
| Membership projektu, nie organizer/uczestnik | spotkanie z project/client | **deny → 404** (poza ACL v1) |
| Obcy pracownik | cudze spotkanie | deny → API **404** |
| Admin | dowolne (w tym confidential) | allow |

T-7. **Redakcja** — klasy **E+T+P+K** maskowane przed LlmClient; idempotencja na już zredagowanym tekście (`SPEC-PIPELINE`).

T-8. **Zod summary (UC1)** — poprawny mock → sukces; brak pól / zły kształt → reject; niezależność od `summary.*` Fireflies (fixture = transcript only).

### Integracja — obowiązkowe

T-9. **Pipeline:** dwukrotne przetworzenie tego samego `externalMeetingId` / fixture → **jedno** spotkanie; śmieciowy mock summary → `failed` bez kanonu; happy path → `completed` + zapisane zadania.

T-10. **API (supertest):**
- login ustawia cookie; `GET /auth/me` działa;
- `GET /meetings/:id` bez ACL → **404**;
- `POST /demo/run-meeting` (z sesją) enqueue’uje job / tworzy spotkanie — **bez** asercji na `DEMO_ENABLED`.

T-11. **SSE:** przy uprawnionym użytkowniku strumień / zdarzenia statusu dla `meetingId` (co najmniej dojście do terminalnego statusu na ścieżce testowej lub emisja statusu); bez ACL → **404**. (Implementacja klienta testowego: supertest/stream lub równoważne wobec Nest `@Sse`.)

T-12. **Audyt:** po deny ACL → `meeting.access.denied` bez treści spotkania; po fail Zod/job → odpowiedni `eventType`; writer nie utrwala raw transcriptu.

### Frontend

T-13. Smoke: **`next build`** i/lub typecheck web w CI (gdy włączone w pipeline). Brak Playwright jako required check v1.

### CI

T-14. Na każdym **PR**: Jest (unit + integracja z Postgres testowym) — ten sam zestaw co lokalnie w rozsądnym zakresie.

T-15. Dostępny **workflow_dispatch** (diagnostyka brancha).

T-16. Merge do **`main`** tylko przy zielonych wymaganych checkach (branch protection). Direct push na `main` zablokowany.

## Norma: wzorce

### Wymagane

- Piramida unit → integracja.
- Izolowana DB testowa + Prisma migrate.
- DoD T-6…T-13 jako bramka jakości v1.
- Testy w `apps/*/test` lub współlokalizowane; root `pnpm test` (lub równoważny).

### Nie wolno

- Opierać DoD wyłącznie na ręcznym kliknięciu Test w UI.
- Must-have Playwright / prawdziwy FF / prawdziwy LLM w v1.
- Współdzielonej bazy dev+test bez izolacji.
- Coverage % bez asercji ACL/redakcji/Zod/idempotencji.
- Blokować merge testami UC2 (poza tą wersją).

## Zatwierdzony stack (obszar)

| Element | Wybór |
|---------|--------|
| Runner | Jest |
| API HTTP | supertest + `@nestjs/testing` |
| DB test | PostgreSQL (Compose via `pnpm db:up` / ścieżka A) + Prisma; stack B nie jest bramką CI |
| CI | GitHub Actions (PR + `workflow_dispatch`) |
| Web | smoke build / typecheck |

## Kryteria akceptacji

- [ ] `pnpm test` (lub CI) odpala unit ACL, redakcji, Zod.
- [ ] Integracja pipeline: idempotencja + fail Zod + happy path.
- [ ] Integracja API: cookie auth, 404 ACL, demo enqueue bez `DEMO_ENABLED`.
- [ ] Integracja SSE: happy path statusów lub emisji + 404 bez ACL.
- [ ] Audyt: deny + fail summary/job; brak transcriptu w payloadzie.
- [ ] PR czerwony przy failu wymaganych testów; `main` chroniony.

## Poza tą wersją

- Playwright E2E, load testy, kontrakty prawdziwego Fireflies/LLM.
- Testy UC2 jako must-have DoD.
- Pełne pokrycie każdego `eventType` opcjonalnego (`meeting.access.granted`).
