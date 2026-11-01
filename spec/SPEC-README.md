---
wersja: 9
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-11-01
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
| [SPEC-KOMUNIKACJA.md](./SPEC-KOMUNIKACJA.md) | HTTP API, BFF, SSE, pg-boss; port metadanych + treści; on-demand nagranie (K-5b); reprocess / Aktualizuj (K-5c, etap 1+); **DEMO/Test:** UUID runu vs katalog fixture (K-5); lista z `summary`/`failureReason` (K-2a) |
| [SPEC-AUTH_I_ACL.md](./SPEC-AUTH_I_ACL.md) | Auth (JWT+refresh), ACL v1 (organizator/uczestnik/admin), paginacja; ACL też na recording; OAuth Google ≠ login; zakaz grup Calendar |
| [SPEC-PIPELINE.md](./SPEC-PIPELINE.md) | Job `meeting.process`, redakcja E+T+P+K; gałęzie `fireflies` \| `gemini-notes` (P-2a); metadata-only; re-ingest upgrade-only (P-7a); zaślepka v0 |
| [SPEC-LLM.md](./SPEC-LLM.md) | Port LlmClient, UC1 mock, Zod; UC2 poza wersją |
| [SPEC-FRONTEND.md](./SPEC-FRONTEND.md) | Next.js, sidebar, tabela+Test+SSE+button nagrania demo (F-7a); Aktualizuj (F-7b, etap 1+); prod: brak buttonu nagrania bez zgody |
| [SPEC-DANE.md](./SPEC-DANE.md) | Prisma, organizer, client domain/link, JSON, `audit_log`; **D-7b** zakaz media URL; **D-7c** model zgody/`contentSource` (migracja etap 1+) |
| [SPEC-OBSERVABILITY.md](./SPEC-OBSERVABILITY.md) | pino, health, katalog `eventType`, correlation |
| [SPEC-TESTY.md](./SPEC-TESTY.md) | Piramida Jest, DoD (SSE, recording mock T-11a); T-11b gałąź zgody etap 1+; CI v0 bez Google |

**Ślad (2026-10-30):** kontrakt DEMO/Test - tożsamość runu (UUID) vs materiał fixture (katalog 10, losowanie API), multi-tester; zaktualizowane: KOMUNIKACJA, PIPELINE, TESTY, FRONTEND, **DANE (D-5)**. DX i produkcja poza tą zmianą normy dema.

**Ślad (2026-10-30, lista):** projekcja `summary` / `failureReason` na `GET /meetings` (K-2a) + UI po reloadzie; zaktualizowane: KOMUNIKACJA, FRONTEND, AUTH_I_ACL, TESTY (+ docs komunikacji / frontend / data_flow / testy).

**Ślad (2026-10-31, on-demand nagranie):** FF jako źródło transcript + media; endpoint `{ url }`, mock v0, zakaz persist URL (D-7b), button demo, ACL jak detail; zaktualizowane: KOMUNIKACJA (K-5b), DANE, FRONTEND (F-7a), AUTH_I_ACL, TESTY (T-11a).

**Ślad (2026-10-31, gałąź braku zgody / Gemini Notes):** Calendar = metadane; brak zgody → `gemini-notes` (+ UC1 gdy tekst); zgoda → FF; metadata-only tylko bez treści; zaślepka v0 vs etap 1+; zaktualizowane: PIPELINE (P-2a/P-4a), KOMUNIKACJA, DANE (D-7c), AUTH_I_ACL, FRONTEND (F-7a), TESTY (T-11b).

**Ślad (2026-10-31, sygnał `[record-ok]`):** opt-in nagrywania przez tag w `description` Calendar; brak tagu → Gemini Notes; helper w contracts; zaktualizowane: PIPELINE (P-2a), KOMUNIKACJA (K-12/K-12a), DANE (D-7c), TESTY (T-11b) + docs bezpieczeństwa / słownik / data_flow / komunikacja.

**Ślad (2026-11-01, Aktualizuj źródło / re-ingest):** recovery metadata-only przez ponowne `meeting.process` (upgrade-only; nagranie nadal on-demand); zaktualizowane: PIPELINE (P-7a), KOMUNIKACJA (K-5c), FRONTEND (F-7b) + docs `data_flow` §5a / słownik / frontend / komunikacja / plan etap 1 / anty-patterny / OUTPUT §6.

Ten plik (`SPEC-README.md`) jest spisem technicznym - nie normą obszarową.

## Kolejność czytania (praktyczna)

1. `SPEC-ARCHITEKTURA` → granice.
2. `SPEC-KOMUNIKACJA` + `SPEC-AUTH_I_ACL` → wejście HTTP/SSE/sesja.
3. `SPEC-PIPELINE` + `SPEC-LLM` + `SPEC-DANE` → przetwarzanie i zapis.
4. `SPEC-FRONTEND` → UI/BFF.
5. `SPEC-OBSERVABILITY` + `SPEC-TESTY` → sygnały i bramka jakości.

## Metadane

Każdy plik w `spec/` ma frontmatter: `wersja`, `data_utworzenia`, `data_modyfikacji`. Przy zmianie treści obszaru zwiększ `wersja` o 1 i ustaw `data_modyfikacji`.
