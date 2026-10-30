---
wersja: 10
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# Słownik

Hasła po polsku, angielski odpowiednik w nawiasie, opis po polsku. Pojęcia produktowe i techniczne używane w dokumentacji Firmowego asystenta spotkań.

## Produkt i domena

| Hasło | Opis |
|-------|------|
| **Firmowy asystent spotkań** (Meeting Memory) | Wewnętrzny system pamięci ustaleń ze spotkań; własne źródło prawdy o spotkaniach, streszczeniach i uprawnieniach. |
| **Spotkanie** (meeting) | Rekord callu w systemie: metadane, powiązania z klientem/projektem, status przetwarzania, powiązane artefakty. |
| **Uczestnik** (participant) | Osoba obecna na spotkaniu (pracownik lub osoba zewnętrzna). Konto w systemie ma tylko pracownik. |
| **Pracownik** (employee / internal user) | Użytkownik z kontem (e-mail + hasło); jedyny typ konta w v1. |
| **Klient** (client) | Firma lub osoba, dla której agencja prowadzi działania; w systemie: rekord z domeną e-mail do matchingu; powiązanie spotkań przez opcjonalne `clientId`. |
| **Domena klienta** (`emailDomain`) | Domena z e-maili zewnętrznych uczestników używana do automatycznego matchingu (bez HubSpot). |
| **Status linku klienta** (`clientLinkStatus`) | `internal` \| `matched` \| `unmatched` - wynik próby powiązania spotkania z `Client`. |
| **Projekt** (project) | Jednostka pracy przy kliencie; w schemacie pod przyszłość; **nie** egzekwuje ACL v1. |
| **Zespół projektu** (project team) | Membership User↔Project - **kolejna faza** ACL (onboarding historii); Workspace nie ma grup klienckich. |
| **Organizator** (organizer) | Pracownik będący organizatorem wydarzenia; ścieżka ACL v1. |
| **Uczestnik zewnętrzny** | E-mail poza domeną firmy; tylko metadane (bez konta). |
| **Spotkanie poufne** (`confidential`) | Flaga ręczna (1:1, rekrutacja, zarząd itd.). |
| **Metadata-only** | Rekord spotkania bez transcriptu/summary (brak zgody / brak treści ze źródła). |
| **Erase treści** | Usunięcie transcriptu/summary (i nagrań u vendora); fakt callu (title, daty, duration, status, clientId) zostaje. |
| **Kampania** (campaign) | Działanie reklamowe / sprzedażowe (często na Allegro lub innym marketplace); bywa tematem ustaleń w transkrypcie (wtrącenia EN). |
| **Marketplace** | Platforma sprzedaży (np. Allegro), w kontekście której toczą się spotkania z klientami. |
| **Transkrypcja** (transcript) | Tekst rozmowy z podziałem na mówców; język PL z możliwymi wtrąceniami EN. |
| **Segment** (segment) | Fragment transkrypcji: mówca, tekst, znacznik czasu (`startMs`). |
| **Streszczenie** (summary) | Zwalidowany skrót spotkania (`shortSummary`, decyzje, zadania); kanon = wynik **UC1** (LLM/mock) + Zod. `summary.*` z Fireflies **ignorujemy**. |
| **UC1 summarizeMeeting** | Use case LLM: transcript → structured summary; wspólny LlmClient. |
| **UC2 answerQuestion** | Use case LLM (etap 2+): pytanie + retrieval w ACL → odpowiedź ze źródłami; ten sam LlmClient. |
| **LlmClient** | Port/adapter jednego providera LLM (mock w etapie 0); bez drugiej integracji „do chatu”. |
| **Grounded QA** | Odpowiedź asystenta wyłącznie na podstawie dostarczonych fragmentów z DB. |
| **Decyzja / ustalenie** (decision) | Zapisana w streszczeniu decyzja ze spotkania (lista `decisions`). |
| **Zadanie** (action item) | Pozycja „kto, co, do kiedy” (`assignee`, `description`, `dueDate`). |
| **Źródło prawdy** (source of truth) | Kanoniczny stan w naszej bazie (Postgres), nie Notebook zewnętrznego notetakera. |
| **Adapter źródła** (source adapter) | Implementacja portu pobierająca materiał (mock, docelowo Fireflies / inne) i mapująca na kontrakt portu. |
| **Port źródła** (meeting source port) | Ustalony kształt wejścia do pipeline (m.in. `externalId`, uczestnicy, segmenty) - niezależny od schemy vendora. |
| **Notetaker / Fireflies** | Zewnętrzna usługa capture/transkrypcji; w architekturze adapter wejścia, nie firmowy system docelowy. |
| **ACL** (access control) | Reguły kto może odczytać spotkanie i artefakty; egzekwowane na API. |
| **Widoczność spotkania (ACL v1)** | Organizator **lub** uczestnik wewnętrzny **lub** admin. Egzekucja na `api` (także wyszukiwanie / asystent później). |

## Przetwarzanie i jakość danych

| Hasło | Opis |
|-------|------|
| **Pipeline** | Sekwencja kroków: pobranie → normalizacja → redakcja → streszczenie → zapis. |
| **Job** (`meeting.process`) | Zadanie w kolejce pg-boss realizujące pipeline dla jednego zewnętrznego ID spotkania. |
| **Idempotencja** (idempotency) | Ponowne uruchomienie z tym samym kluczem tożsamości (`externalMeetingId`) nie tworzy duplikatu spotkania. |
| **Klucz idempotencji** (idempotency key) | `externalMeetingId` / ID transcriptu vendora. Na DEMO/Test: UUID **runu** nadany przez API - **nie** utożsamiany z `fixtureKey`. |
| **externalMeetingId** | Tożsamość kanonicznego spotkania / runu w systemie (prod: ID vendora; DEMO/Test: nowe UUID na każde wywołanie Test). |
| **Redakcja** (redaction) | Maskowanie / filtrowanie danych wrażliwych przed krokiem „na zewnątrz” (nawet przed mockiem summarizera). |
| **Summarizer** | Port generujący streszczenie i zadania; w v1 mock o kontrakcie jak przyszły LLM. |
| **Walidacja kontraktu** (schema validation) | Sprawdzenie kształtu wyniku (Zod **w aplikacji**); HTTP DTO: class-validator. |
| **Quarantine / failed** | Stan po niepoprawnym wyniku modelu lub błędzie kroku - bez zapisu „prawie OK” jako sukcesu. |
| **Fixture / mock** | Przygotowane dane testowe zastępujące prawdziwe nagrania i vendorów; w demie: katalog **10** kluczy za portem źródła. |
| **fixtureKey** | Identyfikator **materiału** mocka w katalogu - wskazuje treść źródła. Na ścieżce DEMO/Test **nie** jest kluczem wiersza `Meeting`; ten sam klucz może powtórzyć się u wielu użytkowników i runów. |
| **Demo / przycisk Test** | Ścieżka PoC: BFF → API → nowe `externalMeetingId` (UUID) + `organizerId` sesji + losowy `fixtureKey` → enqueue → **SSE** aktualizuje wiersz. Multi-tester: osobne wiersze; ponowny Test = kolejny wiersz. |
| **SSE** (Server-Sent Events) | Strumień `text/event-stream` statusów spotkania (`GET /meetings/:id/events`); ACL jak przy odczycie. |

## Aplikacja i infrastruktura

| Hasło | Opis |
|-------|------|
| **API** (`apps/api`) | NestJS: auth użytkowników, egzekucja ACL, HTTP dla BFF. |
| **Worker** (`apps/worker`) | Osobny proces Nest: konsumpcja jobów, pipeline, adaptery. |
| **Web** (`apps/web`) | Next.js (App Router): BFF w `app/api/*`, dashboard (tabela + sidebar), mock wyszukiwarki. |
| **BFF** (Backend for Frontend) | Cienka warstwa w `web` między UI a API; bez reguł ACL do treści. |
| **packages/contracts** | Wspólne typy / kształty kontraktów między api, worker i web; **bez Zod**. |
| **Prisma** | ORM i migracje; schemat w rootowym `prisma/`. |
| **PostgreSQL** | Jedyna baza stanu aplikacji, kolejek pg-boss i tabeli `audit_log`. |
| **Docker Compose - ścieżka A** | Rootowy `docker-compose.db.yml` tylko pod Postgres (bazy `vinseo` + `vinseo_test`). Wejście: `pnpm db:up` / `db:down` / `db:logs`. Procesy app na hoście (`dev:*`). |
| **Compose dev stack - ścieżka B** | `docker-compose.dev.yml` + `docker/dev/Dockerfile`: Postgres oraz `api`/`worker`/`web` w kontenerach; bind mount kodu; wolumeny na `node_modules`. Wejście: `pnpm dev:stack:up` / `down` / `logs`. Obowiązkowe DX Fazy 1; nie mylić z Compose produkcyjnym na VPS. |
| **pg-boss** | Kolejka jobów w Postgresie (bez osobnego Redisa w v1). |
| **Dziennik audytu** (`audit_log`) | Tabela w Postgresie na kluczowe zdarzenia biznesowe (auth, ACL, joby, demo, błędy walidacji summary); retencja 90 dni; odczyt v1 tylko ops/DB, bez HTTP. |
| **Logi techniczne** (pino) | Strukturalne logi procesu na stdout - diagnostyka; nie zamiennik `audit_log`. |
| **Cookie HttpOnly** | Przechowywanie sesji po stronie przeglądarki w sposób niedostępny dla JS strony. |
| **bcrypt** | Hashowanie haseł przed zapisem i weryfikacja przy logowaniu. |
| **Envelope błędu** | Wspólny JSON błędu API: `statusCode`, `message`, opcjonalnie `code`, `requestId`. |
| **Wyszukiwarka (mock UI)** | Podstrona w `web` ze statycznymi wynikami; bez LLM/search API w v1. |

## Integracje (słownik skrótowy)

| Hasło | Opis |
|-------|------|
| **Google Workspace** | Środowisko organizacji (Meet, Calendar, Drive); kontekst pracy firmy. |
| **GraphQL Fireflies** | Publiczne API Fireflies do pobrania transcriptu po ID. |
| **Webhook V2 Fireflies** | Powiadomienie o zdarzeniu (np. `meeting.transcribed`) bez pełnej treści transcriptu w body. |
| **Anti-corruption layer** | Świadome mapowanie schemy vendora na własny port - bez uzależnienia domeny od zewnętrznych nazw pól. |

## Mapowanie na inne dokumenty

- Koncepcja: `dokumentacja_koncepcyjna.md`
- Architektura: `architektura.md`
- Frontend: `frontend.md`
- LLM: `llm_i_asystent.md`
- Kontrakty I/O: `dokumentacja_komunikacji.md`
- Spis: `README.md`
