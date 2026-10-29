---
wersja: 1
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-29
---

# SPEC — Dane (Prisma / PostgreSQL)

Norma modelu danych i persystencji. Kontekst: `docs/architektura.md`, `docs/architektura_katalogi_pliki.md`. Sesja/refresh: `SPEC-AUTH_I_ACL`. Pipeline persist: `SPEC-PIPELINE`. Katalog zdarzeń audytu: `SPEC-OBSERVABILITY`.

## Cel / zakres

- Jedna baza PostgreSQL, jeden schemat Prisma, migracje w rootowym `prisma/`.
- Minimalny zestaw encji v1, UUID, JSON dla segmentów i summary/action items.
- Zakazy treści wrażliwej w `audit_log`.

**Poza zakresem / poza tą wersją:** seed obowiązkowy, soft-delete, osobne tabele segmentów/action items, read-model/CQRS, sharding, drugi ORM.

## Powiązanie ze stylem z docs

| Ustalenie | Wiązanie |
|-----------|----------|
| Jedna instalacja, jedna Postgres | Wspólny schemat dla `api` i `worker` |
| Prisma w rootcie | Brak `schema.prisma` per aplikacja |
| Infra / repo | Prisma Client poza controllerami (`SPEC-ARCHITEKTURA`) |
| `audit_log` ≠ event sourcing | Append kluczowych zdarzeń; bez payloadu transcriptu |

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
| **Client** | Klient agencji |
| **Project** | Projekt powiązany z klientem |
| **ProjectMembership** | User ↔ Project (podstawa ACL zespołu) |
| **Meeting** | Spotkanie: metadane, `externalMeetingId`, `clientId`/`projectId`, `processingStatus`, powiązania |
| **MeetingParticipant** | Relacja **User ↔ Meeting** (uczestnictwo wewnętrzne pod ACL) |
| **RefreshToken** | Hash refresh, `userId`, `familyId`, wygaśnięcie, used/revoked (`SPEC-AUTH_I_ACL`) |
| **AuditLog** | Zdarzenia audytu (pola szczegółowe katalogu → OBSERVABILITY) |

Uczestnicy zewnętrzni (bez konta) mogą być reprezentowani w metadanych / JSON źródła — **bez** wymogu osobnego modelu „ExternalParticipant” w v1, o ile ACL opiera się na `MeetingParticipant` + membership + admin.

### JSON: segmenty i summary

D-8. **Segmenty transcriptu:** kolumna **JSON** na rekordzie spotkania (lub jednym powiązanym rekordzie 1:1 ze spotkaniem) — tablica obiektów zgodnych z portem źródła (`speaker`, `text`, `startMs`, …). **Zakaz** osobnej tabeli segmentów w v1.

D-9. **Summary kanoniczne:** przechowywane jako JSON (na `Meeting` lub 1:1) zawierające co najmniej kształt po Zod: `shortSummary`, `decisions`, **`actionItems` jako JSON** (tablica obiektów `assignee` / `description` / `dueDate`). **Zakaz** osobnej tabeli action items w v1.

D-10. Zapis summary jako sukcesu wyłącznie po walidacji Zod (`SPEC-PIPELINE` / `SPEC-LLM`). Niepoprawny payload nie staje się kanonem.

### Audit log (dane)

D-11. Tabela `audit_log` w tym samym schemacie Postgres.

D-12. **Zakaz** umieszczania pełnej treści transcriptu, pełnego promptu LLM ani pełnego summary jako pola audytu. Dozwolone: `eventType`, id zasobu, `userId` (gdy dotyczy), `requestId` / correlation, timestamp, ewentualnie krótki kod wyniku — katalog typów → `SPEC-OBSERVABILITY`.

### Dostęp z kodu

D-13. Wywołania Prisma Client wyłącznie z warstwy infrastruktury / repozytoriów / serwisów aplikacji — **nie** z controllerów HTTP ani z czystej redakcji (`SPEC-PIPELINE`).

## Norma: wzorce

### Wymagane

- Jeden `schema.prisma` + migracje forward.
- UUID dla PK z D-4.
- `MeetingParticipant` jako most User–Meeting.
- JSON dla segmentów i summary (w tym action items).
- `RefreshToken` z hashem (nie plaintext tokena).

### Nie wolno

- Drugiej bazy / schemy Prisma per `api`|`worker`|`web`.
- Innego ORM w v1.
- Osobnych tabel segmentów / action items w v1.
- Soft-delete jako wymogu v1.
- Treści transcriptu / pełnego summary w `audit_log`.
- Obowiązkowego seeda jako bramki uruchomienia v1 (fixture demo może żyć w plikach aplikacji / mocku, nie w wymaganym `prisma/seed`).

## Zatwierdzony stack (obszar)

| Element | Wybór |
|---------|--------|
| DB | PostgreSQL |
| ORM / migracje | Prisma |
| Typy złożone | Prisma `Json` (PostgreSQL JSON/JSONB) |
| Id domenowe | UUID |

## Kryteria akceptacji

- [ ] `prisma/schema.prisma` pokrywa byty z D-7; migracja aplikuje się na czystą Postgres.
- [ ] `externalMeetingId` unikalne; ponowne demo nie tworzy drugiego `Meeting` (idempotencja + D-5).
- [ ] Segmenty i action items są w JSON; brak migracji tworzących tabele segment/action_item w v1.
- [ ] `RefreshToken` przechowuje hash; plaintext refresh nie leży w kolumnie.
- [ ] Wiersze `audit_log` w review/testach nie zawierają pełnego transcriptu.
- [ ] Controllery nie importują Prisma Client bezpośrednio.

## Poza zakresem / poza tą wersją

- Seed Prisma, soft-delete, archiwizacja spotkań.
- Normalizacja segmentów / action items do osobnych tabel.
- Pełny katalog `eventType` i retencja operacyjna — `SPEC-OBSERVABILITY`.
- Indeksy pod przyszły RAG / full-text.
