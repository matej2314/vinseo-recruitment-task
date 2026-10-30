---
wersja: 2
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# SPEC — Dane (Prisma / PostgreSQL)

Norma modelu danych i persystencji. Kontekst: `docs/architektura.md`, `docs/architektura_katalogi_pliki.md`, `docs/bezpieczenstwo_i_rodo.md`. Sesja/refresh: `SPEC-AUTH_I_ACL`. Pipeline persist: `SPEC-PIPELINE`. Katalog zdarzeń audytu: `SPEC-OBSERVABILITY`.

## Cel / zakres

- Jedna baza PostgreSQL, jeden schemat Prisma, migracje w rootowym `prisma/`.
- Minimalny zestaw encji v1, UUID, JSON dla segmentów i summary/action items.
- Pola pod ACL v1 (organizator), matching klienta po domenie, erase treści ze zachowaniem faktu callu.
- Zakazy treści wrażliwej w `audit_log`.

**Poza zakresem / poza tą wersją:** seed obowiązkowy, soft-delete jako wymóg, osobne tabele segmentów/action items, read-model/CQRS, sharding, drugi ORM, HubSpot, egzekucja ACL przez `ProjectMembership`.

## Powiązanie ze stylem z docs

| Ustalenie | Wiązanie |
|-----------|----------|
| Jedna instalacja, jedna Postgres | Wspólny schemat dla `api` i `worker` |
| Prisma w rootcie | Brak `schema.prisma` per aplikacja |
| Infra / repo | Prisma Client poza controllerami (`SPEC-ARCHITEKTURA`) |
| `audit_log` ≠ event sourcing | Append kluczowych zdarzeń; bez payloadu transcriptu |
| ACL v1 | Organizator / uczestnik / admin — nie membership |

**Wyjątek względem stylu globalnego:** brak.

## Wymagania egzekwowalne

### Lokalizacja i migracje

D-1. Jedyny plik schematu i migracje: katalog **`prisma/`** w rootcie monorepo.

D-2. Migracje v1: **tylko do przodu** (apply w CI/deploy); brak wymogu seeda w tej wersji.

D-3. Jedyny ORM aplikacji: **Prisma**. Zakaz drugiego ORM / osobnej schemy per proces.

### Identyfikatory

D-4. Klucze główne domenowe — **UUID** (`String @id @default(uuid())` lub natywne `@db.Uuid` — jedna spójna konwencja w schemacie):

| Model (logiczny) | PK |
|------------------|-----|
| User | UUID |
| Client | UUID |
| Project | UUID |
| ProjectMembership | UUID |
| Meeting | UUID |
| MeetingParticipant | UUID |
| RefreshToken | UUID |
| AuditLog | UUID |

D-5. `externalMeetingId` (oraz spójnie `fixtureKey` na ścieżce demo): **string** biznesowy, **unikalny** — nie mylić z PK `Meeting.id`.

D-6. Identyfikatory wewnętrzne pg-boss: według biblioteki; poza modelem domenowym Prisma (tabele jobów mogą współdzielić DB).

### Minimalny zestaw modeli v1

D-7. Obowiązkowe byty logiczne:

| Byt | Rola |
|-----|------|
| **User** | Pracownik: e-mail (unikalny), hash hasła (bcrypt), rola (pracownik / admin) |
| **Client** | Klient agencji; **`emailDomain` unikalne** (matching bez HubSpot) |
| **Project** | Projekt powiązany z klientem — **pod przyszłą fazę**; nie źródło ACL v1 |
| **ProjectMembership** | User ↔ Project — **pod przyszłą fazę**; **zakaz** użycia w `access` v1 |
| **Meeting** | Spotkanie: metadane faktu + treść + statusy (pola poniżej) |
| **MeetingParticipant** | Relacja **User ↔ Meeting** (uczestnictwo wewnętrzne pod ACL) |
| **RefreshToken** | Hash refresh, `userId`, `familyId`, wygaśnięcie, used/revoked (`SPEC-AUTH_I_ACL`) |
| **AuditLog** | Zdarzenia audytu (pola szczegółowe katalogu → OBSERVABILITY) |

D-7a. **Meeting** — pola wymagane / normatywne:

| Pole | Norma |
|------|--------|
| `organizerId` | FK → User (organizator; ścieżka ACL v1) |
| `startedAt` / czas trwania (`durationSeconds` lub `endedAt`) | Fakt callu — **zostaje** przy erase |
| `title` | Fakt callu — **zostaje** przy erase |
| `processingStatus` | Fakt / stan pipeline — **zostaje** przy erase |
| `clientId` | Opcjonalne FK → Client — **zostaje** przy erase |
| `clientLinkStatus` | Enum: `internal` \| `matched` \| `unmatched` |
| `confidential` | Boolean, default false |
| `transcriptSegments` / `summary` | Treść — **null** po erase |
| `externalParticipants` (JSON) | Metadane zewnętrznych (e-mail poza domeną firmy) — **czyszczone** przy erase |

Uczestnicy zewnętrzni (bez konta): JSON / metadane na spotkaniu — **bez** osobnego modelu „ExternalParticipant” w v1.

Zmiana względem D-7 v1: `ProjectMembership` nie jest „podstawą ACL zespołu”; ACL = organizator + `MeetingParticipant` + admin (`SPEC-AUTH_I_ACL`).

### JSON: segmenty i summary

D-8. **Segmenty transcriptu:** kolumna **JSON** na rekordzie spotkania (lub jednym powiązanym rekordzie 1:1 ze spotkaniem) — tablica obiektów zgodnych z portem źródła (`speaker`, `text`, `startMs`, …). **Zakaz** osobnej tabeli segmentów w v1.

D-9. **Summary kanoniczne:** przechowywane jako JSON (na `Meeting` lub 1:1) zawierające co najmniej kształt po Zod: `shortSummary`, `decisions`, **`actionItems` jako JSON** (tablica obiektów `assignee` / `description` / `dueDate`). **Zakaz** osobnej tabeli action items w v1.

D-10. Zapis summary jako sukcesu wyłącznie po walidacji Zod (`SPEC-PIPELINE` / `SPEC-LLM`). Niepoprawny payload nie staje się kanonem.

### Audit log (dane)

D-11. Tabela `audit_log` w tym samym schemacie Postgres.

D-12. **Zakaz** umieszczania pełnej treści transcriptu, pełnego promptu LLM ani pełnego summary jako pola audytu. Dozwolone: `eventType`, id zasobu, `userId` (gdy dotyczy), `requestId` / correlation, timestamp, ewentualnie krótki kod wyniku — katalog typów → `SPEC-OBSERVABILITY`.

D-12a. Przy erase treści spotkania: powiązane rekordy audytu **anonimizowane** (norma produktowa; endpoint erase poza must-have etapu 0).

### Dostęp z kodu

D-13. Wywołania Prisma Client wyłącznie z warstwy infrastruktury / repozytoriów / serwisów aplikacji — **nie** z controllerów HTTP ani z czystej redakcji (`SPEC-PIPELINE`).

## Norma: wzorce

### Wymagane

- Jeden `schema.prisma` + migracje forward.
- UUID dla PK z D-4.
- `Meeting.organizerId` + `MeetingParticipant` jako mosty pod ACL v1.
- `Client.emailDomain` + `Meeting.clientLinkStatus`.
- JSON dla segmentów, summary (w tym action items) i zewnętrznych uczestników.
- `RefreshToken` z hashem (nie plaintext tokena).

### Nie wolno

- Drugiej bazy / schemy Prisma per `api`|`worker`|`web`.
- Innego ORM w v1.
- Osobnych tabel segmentów / action items w v1.
- Soft-delete jako wymogu v1 (erase treści = nullowanie pól treściowych, nie obowiązkowy soft-delete całego wiersza).
- Treści transcriptu / pełnego summary w `audit_log`.
- Obowiązkowego seeda jako bramki uruchomienia v1 (fixture demo może żyć w plikach aplikacji / mocku, nie w wymaganym `prisma/seed`).
- Używania `ProjectMembership` w polityce `access` w tej wersji.

## Zatwierdzony stack (obszar)

| Element | Wybór |
|---------|--------|
| DB | PostgreSQL |
| ORM / migracje | Prisma |
| Typy złożone | Prisma `Json` (PostgreSQL JSON/JSONB) |
| Id domenowe | UUID |

## Kryteria akceptacji

- [ ] `prisma/schema.prisma` pokrywa byty z D-7 / D-7a; migracja aplikuje się na czystą Postgres (oraz upgrade z poprzedniej migracji etapu 0).
- [ ] `externalMeetingId` unikalne; ponowne demo nie tworzy drugiego `Meeting` (idempotencja + D-5).
- [ ] Segmenty i action items są w JSON; brak migracji tworzących tabele segment/action_item w v1.
- [ ] `RefreshToken` przechowuje hash; plaintext refresh nie leży w kolumnie.
- [ ] Wiersze `audit_log` w review/testach nie zawierają pełnego transcriptu.
- [ ] Controllery nie importują Prisma Client bezpośrednio.
- [ ] Jest `organizerId`, `clientLinkStatus`, `emailDomain` na Client, flaga `confidential`.

## Poza zakresem / poza tą wersją

- Seed Prisma, pełna archiwizacja spotkań.
- Normalizacja segmentów / action items do osobnych tabel.
- HTTP erase + job retencji prod (polityka w docs).
- Pełny katalog `eventType` — `SPEC-OBSERVABILITY`.
- Indeksy pod przyszły RAG / full-text.
- Membership jako ACL.
