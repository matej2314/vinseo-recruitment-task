---
wersja: 9
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# Dokumentacja komunikacji (kontrakty I/O)

Normatywny kontrakt komunikacji Firmowego asystenta spotkań w v1. Opisuje **co** wolno wymieniać między procesami i z otoczeniem; *dlaczego* takie granice - w `architektura.md`.

Zmiana względem poprzedniej wersji docs: powierzchnia **SSE** statusu spotkania; UI po Test aktualizuje tabelę (bez osobnej strony detail); usunięta bramka **`DEMO_ENABLED`** (demo = auth + enqueue).

## Powierzchnie w zakresie v1

| Powierzchnia | Kierunek | Uczestnicy |
|--------------|----------|------------|
| HTTP API | synchroniczne request/response | `web` (BFF) ↔ `api` |
| BFF | synchroniczne request/response | przeglądarka ↔ `web` (`app/api/*`) ↔ `api` |
| SSE | strumień `text/event-stream` | przeglądarka ↔ BFF ↔ `api` |
| Kolejka pg-boss | asynchroniczne joby | `api` (enqueue) ↔ `worker` (consume) |
| Port źródła spotkań | wejście do pipeline | mock (v1) / docelowo adapter vendora → `worker` |

## Świadomie poza zakresem v1

- Publiczne API dla klientów zewnętrznych lub partnerów.
- Powiadomienia (e-mail, Slack itd.).
- Normatywny kontrakt produkcyjnego webhooka Fireflies / OAuth Google (w v1: mock za portem).
- Powierzchnia Q&A / RAG.
- gRPC, Kafka ani inny broker poza pg-boss.
- **HTTP / BFF do odczytu `audit_log`** - audyt zapisują api i worker; odczyt v1 tylko ops/DB (patrz `observability.md`).
- **Asystent Q&A (`POST /ask` lub równoważne)** - poza v1 kodu; kontrakt koncepcyjny w `llm_i_asystent.md` (UC2).

Przycisk **Test** na froncie **nie** jest osobną powierzchnią - to ścieżka demo po BFF + API + job + port źródła (sekcja poniżej).

---

## 1. HTTP API (`apps/api`)

Baza URL (dev): do ustalenia w env (np. `http://localhost:3001`).  
Walidacja wejścia: DTO + `class-validator` / `class-transformer`.  
Autoryzacja treści spotkań: wyłącznie tutaj (moduł `access`).

### 1.1 Auth

| Metoda | Ścieżka | Opis | Auth |
|--------|---------|------|------|
| `POST` | `/auth/register` | Rejestracja pracownika (e-mail + hasło) | nie |
| `POST` | `/auth/login` | Logowanie; ustawia cookie HttpOnly (access + refresh) | nie |
| `POST` | `/auth/logout` | Kończy sesję; czyści cookie | tak |
| `GET` | `/auth/me` | Bieżący użytkownik | tak |
| `POST` | `/auth/refresh` | Rotacja refresh / nowy access | refresh cookie |

**Hasła:** bcrypt przed zapisem; porównanie hasha przy loginie. Przy rejestracji / zmianie: minimum **12** znaków, ≥1 wielka litera, ≥1 cyfra, ≥1 znak specjalny.  
**Rejestracja v1:** otwarta (bez zaproszenia). `POST /auth/register` po sukcesie **od razu ustawia cookie** sesji (access + refresh) — jak login; UI redirect na dashboard.  
**Sesja:** krótki access JWT (**TTL 15 min**) + refresh (hash w PostgreSQL); oba cookie HttpOnly (Secure/SameSite per środowisko). Ciało odpowiedzi auth nie musi duplikować sekretów w JSON. Szczegóły: `spec/SPEC-AUTH_I_ACL.md`.

Przykład ciała logowania:

```json
{
  "email": "anna@company.example",
  "password": "********"
}
```

### 1.2 Spotkania

| Metoda | Ścieżka | Opis | Auth |
|--------|---------|------|------|
| `GET` | `/meetings` | Lista spotkań widocznych wg ACL; paginacja: `limit` ∈ {10,25,50,100}, **`page`** (1-based; nie cursor) | tak |
| `GET` | `/meetings/:id` | Szczegóły po ACL (API; UI v1 nie ma osobnej strony detail — tabela + SSE) | tak |
| `GET` | `/meetings/:id/events` | **SSE** statusów pipeline (`pending`→…→`completed`\|`failed`); ACL jak detail | tak |

**ACL v1 (przypomnienie kontraktowe):** **organizator** spotkania **lub** uczestnik wewnętrzny **lub** admin.  
`clientId` / membership projektu **nie** przyznają odczytu w v1.  
Brak uprawnień do istniejącego zasobu: odpowiedź jak **404** (bez wycieku istnienia) — także dla SSE.

Element listy (kształt logiczny; typy współdzielone w `packages/contracts`):

```json
{
  "id": "uuid",
  "title": "Sync budżet - klient X",
  "startedAt": "2026-10-01T10:00:00.000Z",
  "durationSeconds": 2700,
  "organizerId": "uuid",
  "clientId": "uuid",
  "clientLinkStatus": "matched",
  "confidential": false,
  "processingStatus": "completed"
}
```

Detail może rozszerzać o `summary`, `actionItems`, skrót uczestników (wewnętrzni + zewnętrzni jako info) — zawsze po przejściu ACL. Po erase treści: te same metadane faktu, bez transcriptu/summary.

### 1.3 Demo - uruchomienie pipeline (przycisk Test)

| Metoda | Ścieżka | Opis | Auth |
|--------|---------|------|------|
| `POST` | `/demo/run-meeting` | Enqueue tego samego pipeline co ścieżka produkcyjna; źródło = mock/fixture | tak |

- Wymaga zalogowanego pracownika.
- **Bez** bramki `DEMO_ENABLED` — endpoint dostępny przy ważnej sesji (flaga usunięta z kontraktu v1).
- Nie omija workera: tylko **enqueue** joba `meeting.process`.
- Idempotencja: ten sam `externalMeetingId` / `fixtureKey` nie tworzy drugiego spotkania.

**Request (przykład):**

```json
{
  "fixtureKey": "demo-client-budget-pl"
}
```

**Response (przykład):**

```json
{
  "meetingId": "uuid",
  "jobId": "string-or-uuid",
  "status": "pending"
}
```

UI po sukcesie **zostaje** na widoku tabeli, otwiera SSE `GET /meetings/:id/events` (przez BFF) i aktualizuje wiersz — bez osobnej nawigacji na detail (`frontend.md`).

### 1.3a SSE — status spotkania

Implementacja po stronie Nest: dekorator `@Sse`, handler zwraca `Observable<MessageEvent>` (`text/event-stream`).

| Metoda | Ścieżka | Opis | Auth |
|--------|---------|------|------|
| `GET` | `/meetings/:id/events` | Strumień zmian `processingStatus` (+ opcjonalnie dane do wiersza tabeli przy `completed`) | tak |

- Eventy co najmniej przy zmianie statusu: `pending` \| `processing` \| `completed` \| `failed`.
- Po statusie terminalnym serwer zamyka strumień (lub przestaje emitować istotne eventy); klient zamyka `EventSource`.
- Brak ACL / brak spotkania → **404** (bez wycieku istnienia).

### 1.4 Envelope błędów

Wspólny kształt odpowiedzi błędu:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "requestId": "optional-correlation-id"
}
```

| Kod HTTP | Kiedy |
|----------|--------|
| 400 | Walidacja DTO |
| 401 | Brak / nieważna sesja |
| 403 | Zalogowany, ale operacja zabroniona (gdy świadomie nie używamy 404) |
| 404 | Brak zasobu **lub** brak ACL do spotkania (także SSE) |
| 409 | Konflikt idempotencji / stanu (gdy świadomie rozróżniamy) |
| 500 | Błąd nieobsłużony |

---

## 2. BFF (`apps/web`, App Router `app/api/*`)

Krótka warstwa między przeglądarką a `api`.

**Wolno:**

- Przyjmować żądania z UI (w tym przycisk **Test** i **SSE**).
- Przekazywać / ustawiać cookie HttpOnly w przepływie auth zgodnie z konfiguracją Next.
- Proxy’ować do HTTP API / SSE i mapować statusy/błędy na odpowiedź dla UI.
- Agregować proste odpowiedzi (np. pod tabelę) **bez** zmiany reguł dostępu.

**Nie wolno:**

- Egzekwować ACL do treści spotkań (to `api` / `access`).
- Enqueue’ować jobów pg-boss bezpośrednio.
- Wołać adapterów źródła / summarizera z pominięciem `api` + `worker`.

### Mapowanie demo

| UI / BFF | API |
|----------|-----|
| `POST /api/demo/run-meeting` (BFF) | `POST /demo/run-meeting` |
| `GET /api/meetings`, `GET /api/meetings/:id` | odpowiadające trasy API |
| `GET /api/meetings/:id/events` | `GET /meetings/:id/events` (SSE) |
| trasy auth pod `/api/auth/*` | `/auth/*` (w tym `refresh`) |

Dokładne ścieżki BFF mogą dodać prefiks `/api`; semantyka ciał i kodów jak w sekcji HTTP API — **z wyjątkiem rejestracji** (poniżej).

### Auth BFF — wyjątek `passwordConfirm` przy rejestracji

Zmiana względem dotychczasowej reguły „semantyka ciał BFF jak HTTP API”: **wyłącznie** dla `POST /api/auth/register`. Login BFF (`POST /api/auth/login`) pozostaje bez `passwordConfirm` — ciało jak API (`email`, `password`).

**Ciało BFF** `POST /api/auth/register` (przykład):

```json
{
  "email": "anna@company.example",
  "password": "********",
  "passwordConfirm": "********"
}
```

| Krok BFF | Zachowanie |
|----------|------------|
| Match | BFF sprawdza `password === passwordConfirm` **przed** proxy |
| Fail (mismatch) | HTTP **400** + envelope walidacji (jak sekcja 1.4); **bez** wołania Nest `POST /auth/register` |
| OK | Proxy do API wyłącznie `{ email, password }` — `passwordConfirm` **nie** trafia do Nest |

Kontrakt Nest `POST /auth/register` bez zmian: e-mail + hasło (sekcja 1.1).

---

## 3. Kolejka pg-boss

| Pole | Wartość |
|------|---------|
| Nazwa joba | `meeting.process` |
| Enqueue | głównie `api` (w tym demo); worker tylko konsumuje |
| Idempotencja | klucz oparty o `externalMeetingId` (i spójnie `fixtureKey` w ścieżce mock) |

**Payload:**

```json
{
  "externalMeetingId": "fireflies-or-mock-id",
  "source": "mock",
  "fixtureKey": "demo-client-budget-pl",
  "requestId": "correlation-id-from-api"
}
```

`source: "mock"` w v1; docelowo inne wartości adaptera bez zmiany nazwy joba (ew. wersjonowanie payloadu w contracts).  
**`requestId`:** correlation id z requestu HTTP `api` przy enqueue (wymagane na ścieżce demo / request-driven); worker loguje ten sam id (`observability.md`).

**Statusy przetwarzania** (na spotkaniu / jobie widoczne dla API):

`pending` → `processing` → `completed` | `failed`

Ponowne enqueue z tym samym kluczem idempotencji: brak duplikatu spotkania; kontynuacja / bezpieczny retry zgodnie z implementacją workera.

---

## 4. Port źródła spotkań

Wejście do pipeline (w v1 dostarcza **mock** / fixture; ten sam kształt pod przyszły adapter vendora).

**Minimalny kontrakt obiektu źródłowego:**

```json
{
  "externalId": "string",
  "title": "string",
  "startedAt": "ISO-8601",
  "participants": [
    {
      "email": "string",
      "displayName": "string",
      "internal": true
    }
  ],
  "segments": [
    {
      "speaker": "string",
      "text": "string",
      "startMs": 0
    }
  ]
}
```

- Język treści: PL z możliwymi wtrąceniami EN.
- **Walidacja runtime (Zod) kontraktu źródła:** w **`apps/api` oraz `apps/worker`** (np. api przy ścieżkach ładujących/akceptujących fixture lub kształt źródła przed enqueue; worker przed normalize / pipeline). Typy kształtu w `packages/contracts`; **zakaz Zod w `packages/`**.

Po redakcji worker wywołuje **UC1 summarizeMeeting** (LlmClient mock/prod) - **nie** pola `summary` z Fireflies. Wynik (kontrakt logiczny, Zod w aplikacji):

```json
{
  "shortSummary": "string",
  "decisions": ["string"],
  "actionItems": [
    {
      "assignee": "string",
      "description": "string",
      "dueDate": "YYYY-MM-DD|null"
    }
  ]
}
```

Niepoprawny wynik → status `failed` / quarantine; **nie** zapis jako udane streszczenie. Szczegóły use case’ów: `llm_i_asystent.md`.

---

## Ścieżka demo (przycisk Test) - end-to-end

```text
Widok domyślny (tabela) → "Test"
  → BFF POST /api/demo/run-meeting  (cookie)
  → API  POST /demo/run-meeting     (sesja)
  → enqueue meeting.process         (fixture → mock source)
  → UI: EventSource → BFF GET /api/meetings/:id/events → API SSE (ACL)
  → worker: fetch mock → normalize → redact → summarize(mock) → Zod → persist
  → SSE: statusy → UI aktualizuje wiersz tabeli (bez zmiany trasy / bez strony detail)
```

To jest kanoniczny PoC mechanizmu na froncie - bez omijania granic procesów.

---

## Mapowanie Fireflies (docelowe)

Port źródła w v1 jest **celowo uproszczony** (anti-corruption layer). Nie kopiujemy 1:1 schematu GraphQL Fireflies. Poniższa tabela i przepływ obowiązują przy podmianie mocka na prawdziwy adapter. Źródło prawdy o polach FF: dokumentacja Fireflies (Transcript, Sentence, Summary, Webhooks V2).

### Zasada

| Warstwa | Rola |
|---------|------|
| Fireflies GraphQL + Webhooks V2 | Zewnętrzny kształt danych i powiadomień |
| Adapter w `apps/worker` | Pobiera / normalizuje / mapuje na **port źródła** z tej dokumentacji |
| Wasz summarizer + Zod w aplikacji | Własne streszczenie i action items - **nie** polegamy na `summary.action_items` z Fireflies jako kontrakcie domenowym |

Auth do Fireflies: API Key (Bearer) do GraphQL. W v1 nadal atrapa; na produkcji sekret tylko po stronie serwera (nigdy w `web`).

### Przepływ produkcyjny (docelowy)

```text
Fireflies Webhooks V2  POST  (event: meeting.transcribed)
  → weryfikacja X-Hub-Signature (HMAC-SHA256), jeśli skonfigurowany sekret
  → enqueue meeting.process { externalMeetingId: meeting_id, source: "fireflies" }
  → worker: GraphQL transcript(id) → mapowanie na port źródła
  → normalize → redact → summarize (Wasz) → Zod → persist
```

- Preferowany trigger do pipeline transcriptu: **`meeting.transcribed`** (surowy transcript gotowy).
- Event **`meeting.summarized`** dotyczy AI summary **po stronie Fireflies** - u nas nie jest wymagany do zbudowania własnego streszczenia; można go ignorować albo użyć tylko operacyjnie.
- Payload webhooka **nie** zawiera pełnego transcriptu - tylko m.in. `event`, `meeting_id`, `timestamp` (oraz opcjonalnie `client_reference_id`, `reprocessed_at` przy resendach). Treść = osobne zapytanie GraphQL.
- Resendy z `reprocessed_at`: traktować jak ponowne przetworzenie z tym samym `externalMeetingId` (idempotencja / nadpisanie), nie jak nowe spotkanie.

Ta powierzchnia webhooka jest **poza normatywnym zakresem v1** (mock), ale mapowanie poniżej jest ustalone na przyszłą podmianę adaptera.

### Tabela mapowania: Fireflies → port źródła

| Port (nasz) | Fireflies | Uwagi |
|-------------|-----------|--------|
| `externalId` | `Transcript.id` / webhook `meeting_id` | Tożsame ID w API FF |
| `title` | `title` | 1:1 |
| `startedAt` | `dateString` (preferowane) lub `date` (ms epoch → ISO) | Zawsze znormalizować do ISO-8601 w porcie |
| `participants[].email` | `participants[]` (e-maile) lub `meeting_attendees[].email` | Złożyć listę bez duplikatów |
| `participants[].displayName` | `meeting_attendees[].displayName` / `name` | Przy samym e-mailu w `participants` - displayName może być e-mailem lub puste do uzupełnienia |
| `participants[].internal` | **brak pola** | Wyliczenie domenowe: np. e-mail w domenie firmy albo overlap z `workspace_users` / `fireflies_users` |
| `segments[]` | `sentences[]` | Inna nazwa kolekcji - celowe |
| `segments[].speaker` | `speaker_name` (opcjonalnie znać `speaker_id`) | W porcie v1 wystarczy nazwa; `speaker_id` można dodać później bez łamania FF |
| `segments[].text` | `text` (ew. `raw_text` jeśli bez edycji użytkownika) | Ustalić w adapterze jedną preferencję |
| `segments[].startMs` | `start_time` (+ ewentualnie `end_time`) | FF: string / wartość czasowa - **znormalizować do liczby ms** w porcie |

Pola Fireflies świadomie **poza** portem v1 (do wykorzystania później, jeśli potrzeba): m.in. `organizer_email`, `calendar_id` / `cal_id`, `duration`, `meeting_link`, `privacy`, `audio_url` / `video_url`, `analytics`, `speakers[]`.

### Summary: Fireflies vs nasz kontrakt

| Nasze (Zod w aplikacji) | Fireflies `summary` | Decyzja |
|-------------------------|---------------------|---------|
| Cały obiekt summary / action items | `summary.*` (m.in. `short_summary`, `action_items` jako string) | **Ignorujemy całkowicie** - nie zapisujemy z FF, nie używamy w prompcie. Kanon = **UC1 LLM** na bazie transcriptu |

Z FF do portu źródła mapujemy transcript (i metadane spotkania), nie notes/summary vendora.

### Świadomie nieporównywalne z Fireflies

Wasze HTTP API (`/auth`, `/meetings`, `/demo/...`), BFF, cookie HttpOnly i ACL **nie mają** odpowiednika w API Fireflies i nie powinny być do niego dopasowywane.

## Mapowanie na inne dokumenty

- Warstwy i procesy: `architektura.md`
- Drzewo `apps/` / `packages/contracts`: `architektura_katalogi_pliki.md`
- Frontend (widoki, BFF od strony UI): `frontend.md`
- LLM UC1/UC2: `llm_i_asystent.md`
- Przepływ danych (diagramy): `data_flow.md`
- Pojęcia: `dictionary.md`
