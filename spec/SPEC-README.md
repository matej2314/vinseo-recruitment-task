---
wersja: 2
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# SPEC — jak czytać

Zestaw **norm implementacji** Firmowego asystenta spotkań. Język: polski. Katalog: `spec/` w rootcie projektu.

## Docs vs SPEC

| Warstwa | Rola |
|---------|------|
| **`docs/`** | Wspólne rozumienie systemu: koncepcja, architektura, kontrakty I/O, przepływy, testy, deploy — *dlaczego / jak system jest pomyślany*. |
| **`spec/SPEC-*.md`** | Norma przy pisaniu kodu w obszarze: wzorce, wolno/nie wolno, stack, kryteria weryfikowalne — *co obowiązuje przy implementacji*. |

SPEC **uszczegóławia** docs; nie zastępuje dokumentacji koncepcyjnej i nie powinna jej redefiniować. Przy driftcie najpierw uzgodnij prawdę w docs, potem zaktualizuj SPEC.

## Źródła

- Dokumentacja startowa: `docs/` (spis: `docs/README.md`).
- Kontrakty I/O: szczególnie `docs/dokumentacja_komunikacji.md`.
- Ten zestaw powstał procesem `/create-project-spec` (wywiad + weryfikacja stacku).

## Mapa obszar → plik

| Plik | Obszar |
|------|--------|
| [SPEC-ARCHITEKTURA.md](./SPEC-ARCHITEKTURA.md) | Monolit, procesy `api`/`worker`/`web`, warstwy, `packages/`, config |
| [SPEC-KOMUNIKACJA.md](./SPEC-KOMUNIKACJA.md) | HTTP API, BFF, SSE, pg-boss, port źródła |
| [SPEC-AUTH_I_ACL.md](./SPEC-AUTH_I_ACL.md) | Auth (JWT+refresh), ACL v1 (organizator/uczestnik/admin), paginacja |
| [SPEC-PIPELINE.md](./SPEC-PIPELINE.md) | Job `meeting.process`, redakcja E+T+P+K, metadata-only, client-link |
| [SPEC-LLM.md](./SPEC-LLM.md) | Port LlmClient, UC1 mock, Zod; UC2 poza wersją |
| [SPEC-FRONTEND.md](./SPEC-FRONTEND.md) | Next.js, sidebar, tabela+Test+SSE, mock wyszukiwarki |
| [SPEC-DANE.md](./SPEC-DANE.md) | Prisma, organizer, client domain/link, JSON, `audit_log` |
| [SPEC-OBSERVABILITY.md](./SPEC-OBSERVABILITY.md) | pino, health, katalog `eventType`, correlation |
| [SPEC-TESTY.md](./SPEC-TESTY.md) | Piramida Jest, DoD (w tym SSE), CI / ochrona `main` |

Ten plik (`SPEC-README.md`) jest spisem technicznym — nie normą obszarową.

## Kolejność czytania (praktyczna)

1. `SPEC-ARCHITEKTURA` → granice.
2. `SPEC-KOMUNIKACJA` + `SPEC-AUTH_I_ACL` → wejście HTTP/SSE/sesja.
3. `SPEC-PIPELINE` + `SPEC-LLM` + `SPEC-DANE` → przetwarzanie i zapis.
4. `SPEC-FRONTEND` → UI/BFF.
5. `SPEC-OBSERVABILITY` + `SPEC-TESTY` → sygnały i bramka jakości.

## Metadane

Każdy plik w `spec/` ma frontmatter: `wersja`, `data_utworzenia`, `data_modyfikacji`. Przy zmianie treści obszaru zwiększ `wersja` o 1 i ustaw `data_modyfikacji`.
