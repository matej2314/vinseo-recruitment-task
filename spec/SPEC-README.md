---
wersja: 6
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-31
---

# SPEC - jak czytać

Zestaw **norm implementacji** Firmowego asystenta spotkań. Język: polski. Katalog: `spec/` w rootcie projektu.

## Docs vs SPEC

| Warstwa | Rola |
|---------|------|
| **`docs/`** | Wspólne rozumienie systemu: koncepcja, architektura, kontrakty I/O, przepływy, testy, deploy - *dlaczego / jak system jest pomyślany*. |
| **`spec/SPEC-*.md`** | Norma przy pisaniu kodu w obszarze: wzorce, wolno/nie wolno, stack, kryteria weryfikowalne - *co obowiązuje przy implementacji*. |

SPEC **uszczegóławia** docs; nie zastępuje dokumentacji koncepcyjnej i nie powinna jej redefiniować. Przy driftcie najpierw uzgodnij prawdę w docs, potem zaktualizuj SPEC.

## Źródła

- Dokumentacja startowa: `docs/` (spis: `docs/README.md`).
- Kontrakty I/O: szczególnie `docs/dokumentacja_komunikacji.md`.
- Ten zestaw powstał procesem `/create-project-spec` (wywiad + weryfikacja stacku).

## Mapa obszar → plik

| Plik | Obszar |
|------|--------|
| [SPEC-ARCHITEKTURA.md](./SPEC-ARCHITEKTURA.md) | Monolit, procesy `api`/`worker`/`web`, warstwy, `packages/`, config |
| [SPEC-KOMUNIKACJA.md](./SPEC-KOMUNIKACJA.md) | HTTP API, BFF, SSE, pg-boss, port źródła; on-demand nagranie (K-5b); **DEMO/Test:** UUID runu vs katalog fixture (K-5); lista z `summary`/`failureReason` (K-2a) |
| [SPEC-AUTH_I_ACL.md](./SPEC-AUTH_I_ACL.md) | Auth (JWT+refresh), ACL v1 (organizator/uczestnik/admin), paginacja; ACL też na recording; summary na liście po ACL |
| [SPEC-PIPELINE.md](./SPEC-PIPELINE.md) | Job `meeting.process`, redakcja E+T+P+K, metadata-only, client-link; idempotencja po `externalMeetingId` (P-6; DEMO ≠ fixture) |
| [SPEC-LLM.md](./SPEC-LLM.md) | Port LlmClient, UC1 mock, Zod; UC2 poza wersją |
| [SPEC-FRONTEND.md](./SPEC-FRONTEND.md) | Next.js, sidebar, tabela+Test+SSE+button nagrania demo (F-7a), podgląd wyniku z listy po reloadzie |
| [SPEC-DANE.md](./SPEC-DANE.md) | Prisma, organizer, client domain/link, JSON, `audit_log`; D-5: unikalność `externalMeetingId`; **D-7b:** zakaz ephemeral media URL na Meeting |
| [SPEC-OBSERVABILITY.md](./SPEC-OBSERVABILITY.md) | pino, health, katalog `eventType`, correlation |
| [SPEC-TESTY.md](./SPEC-TESTY.md) | Piramida Jest, DoD (SSE, recording mock T-11a, multi-user DEMO, katalog 10, projekcja listy), CI / ochrona `main` |

**Ślad (2026-10-30):** kontrakt DEMO/Test - tożsamość runu (UUID) vs materiał fixture (katalog 10, losowanie API), multi-tester; zaktualizowane: KOMUNIKACJA, PIPELINE, TESTY, FRONTEND, **DANE (D-5)**. DX i produkcja poza tą zmianą normy dema.

**Ślad (2026-10-30, lista):** projekcja `summary` / `failureReason` na `GET /meetings` (K-2a) + UI po reloadzie; zaktualizowane: KOMUNIKACJA, FRONTEND, AUTH_I_ACL, TESTY (+ docs komunikacji / frontend / data_flow / testy).

**Ślad (2026-10-31, on-demand nagranie):** FF jako źródło transcript + media; endpoint `{ url }`, mock v0, zakaz persist URL (D-7b), button demo, ACL jak detail; zaktualizowane: KOMUNIKACJA (K-5b), DANE, FRONTEND (F-7a), AUTH_I_ACL, TESTY (T-11a).

Ten plik (`SPEC-README.md`) jest spisem technicznym - nie normą obszarową.

## Kolejność czytania (praktyczna)

1. `SPEC-ARCHITEKTURA` → granice.
2. `SPEC-KOMUNIKACJA` + `SPEC-AUTH_I_ACL` → wejście HTTP/SSE/sesja.
3. `SPEC-PIPELINE` + `SPEC-LLM` + `SPEC-DANE` → przetwarzanie i zapis.
4. `SPEC-FRONTEND` → UI/BFF.
5. `SPEC-OBSERVABILITY` + `SPEC-TESTY` → sygnały i bramka jakości.

## Metadane

Każdy plik w `spec/` ma frontmatter: `wersja`, `data_utworzenia`, `data_modyfikacji`. Przy zmianie treści obszaru zwiększ `wersja` o 1 i ustaw `data_modyfikacji`.
