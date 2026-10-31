# Vinseo Recruitment Task - major plan (backend)

**Zakres tego pliku:** major plan prac nad **backendem** etapu 0 - procesy `api` i `worker`, wspólny fundament monorepo (w tym model danych i kontrakty typów) oraz artefakty oddania zależne od backendu (CI, Część A, root README).

**Powiązany major frontendu:** [`vinseo-recruitment-task-frontend_major-plan.md`](./vinseo-recruitment-task-frontend_major-plan.md). Oba pliki razem opisują postęp etapu 0; statusy prowadzi się **osobno** w każdym pliku.

**Frontend w tym pliku:** `apps/web` pojawia się jako **stub / miejsce w strukturze repo** (Faza 1) oraz jako zależność kontraktowa API (Faza 3). Pełne UI, BFF i zachowanie panelu wg `docs/frontend.md` / `SPEC-FRONTEND` to postęp majoru frontendu (Faza 1 frontu = odbiór fundamentu z tej Fazy 1 - bez powielania treści monorepo).

**Źródła:** `docs/` oraz `spec/SPEC-*.md` (spis: `docs/README.md`, `spec/SPEC-README.md`).  
**Etap produktowy:** szkielet / etap 0 - `docs/plan_wdrozenia_etapy.md`, `docs/dokumentacja_koncepcyjna.md`.

**Statusy (fazy / kroki):** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`  
**Milestone:** domyślnie **bez statusu**; po spełnieniu DoD → wyłącznie `OSIĄGNIĘTY`

**Kalendarz roboczy (orientacyjnie):** jedna faza ≈ jeden dzień roboczy w oknie oddania; kolejność faz jest obowiązująca niezależnie od dat.

---

## Faza 1 - Fundament monorepo i szkielet procesów

**Status:** `WYKONANY`

**Opis:** Pierwszy etap prac: dogranie **struktury całego repo** (backend, frontend jako stub, worker) oraz lokalnej gotowości do dalszych faz. Po Fazie 1 działa **ścieżka A** (`pnpm db:up` + `dev:*` na hoście) oraz **obowiązkowa ścieżka B** (`docker-compose.dev.yml` + `pnpm dev:stack:up` - Postgres i procesy w kontenerach z bind mountem), startowy model danych i kontrakty typów - zgodnie z `docs/architektura_katalogi_pliki.md`, `docs/deployment.md`, `SPEC-ARCHITEKTURA` (**A-7**, **A-8**), `SPEC-DANE`.

**DoD (faza):**

- Układ monorepo odzwierciedla docelowe drzewo z docs (procesy `api` / `worker` / `web`, wspólne kontrakty, wspólny model danych w rootcie; `docker-compose.yml` + `docker-compose.dev.yml` + `docker/dev/`).
- Ścieżka A: `db:up` / `db:down` / `db:logs` + `dev:*` na hoście.
- Ścieżka B (**obowiązkowa**): `dev:stack:up` / `down` / `logs` podnosi postgres + api + worker + web z bind mountem kodu.
- Smoke jakości w `api` przechodzi; README opisuje obie ścieżki bez domysłów spoza repo.
- Fundament wystarcza do startu Fazy 2 (pipeline) i Fazy 3 (auth/ACL) bez przebudowy układu repo.

### Krok 1.1 - Struktura całego repozytorium

**Status:** `WYKONANY`

**Opis:** Utworzenie / dogranie struktury całego monorepo: miejsca na `api`, `worker`, `web`, pakiet wspólnych kontraktów typów, schemat danych w rootcie oraz pliki Compose (A + B). Jeden root repozytorium. Workspaces i skrypty root (`dev:*`, `db:*`, `dev:stack:*`) zgodne z docs / `SPEC-ARCHITEKTURA`.

**DoD (krok):**

- Drzewo katalogów jest zgodne z `docs/architektura_katalogi_pliki.md` w zakresie etapu 0 (w tym `docker-compose.dev.yml`, `docker/dev/`).
- Współdzielone typy żyją wyłącznie w uzgodnionym pakiecie kontraktów; nie ma tam walidacji runtime ani logiki domenowej (zgodnie z `SPEC-ARCHITEKTURA`).
- Jest jeden root repo - aplikacje nie są osobnymi repozytoriami.
- Root `package.json` ma `dev:*`, `db:generate` / `db:migrate*` - skrypty `db:*` Compose i `dev:stack:*` domykają Krok 1.2.

#### Podkrok 1.1.1 - Miejsca procesów `api`, `worker`, `web`

Widoczne, rozróżnialne lokalizacje trzech procesów runtime z docs.

#### Podkrok 1.1.2 - Pakiet kontraktów i schemat danych w rootcie

Minimalne kształty typów pod późniejsze API/job oraz lokalizacja schematu / migracji wspólnej bazy.

### Krok 1.2 - Lokalne środowisko danych i kolejki

**Status:** `WYKONANY`

**Opis:** Lokalne podniesienie magazynu stanu (PostgreSQL) oraz (ścieżka B) pełnego stacku procesów - zgodnie z `docs/deployment.md` / `SPEC-ARCHITEKTURA` **A-7** i **A-8** (bez osobnego brokera w v1). Ścieżka A: `docker-compose.yml` + `db:*` + appki na hoście. Ścieżka B (**obowiązkowa**): `docker-compose.dev.yml` + `docker/dev/Dockerfile` + `dev:stack:*` (Postgres + api/worker/web, bind mount, wolumeny zależności).

**DoD (krok):**

- Ścieżka A: `pnpm db:up` / `db:down` / `db:logs` działa; baza pod testy/CI dostępna.
- Ścieżka B: `pnpm dev:stack:up` podnosi postgres + api + worker + web; `dev:stack:down` / `logs` istnieją.
- Kolejka jobów korzysta z tej samej bazy (założenie docs), bez równoległego magazynu „na start”.
- README / docs ostrzegają przed równoczesnym A+B na tych samych portach.

#### Podkrok 1.2.1 - Compose DB + skrypty root `db:*` (ścieżka A)

Rootowy `docker-compose.yml` (Postgres + DB testowa) oraz skrypty `db:up` / `db:down` / `db:logs` - wejście lokalne i pod testy integracyjne (`SPEC-TESTY` T-3).

#### Podkrok 1.2.2 - Compose dev stack + skrypty `dev:stack:*` (ścieżka B, obowiązkowa)

`docker-compose.dev.yml` + `docker/dev/Dockerfile` + skrypty `dev:stack:up` / `down` / `logs`. Kontenery app z bind mountem monorepo i wolumenami `node_modules`; `DATABASE_URL` → host `postgres`. Nie mylić z Compose produkcyjnym VPS.

### Krok 1.3 - Szkielety procesów Nest oraz stub frontu

**Status:** `WYKONANY`

**Opis:** Uruchamialny szkielet `api` (HTTP) i `worker` (osobny entry, bez publicznego HTTP dla przeglądarki) oraz minimalny stub `apps/web`. Start możliwy na hoście (`dev:*`) **oraz** w kontenerach ścieżki B. Pełne UI **nie** wchodzi w ten krok.

**DoD (krok):**

- `api` i `worker` startują lokalnie jako **dwa** procesy (host i/lub compose.dev).
- Stub `web` startuje (host i/lub compose.dev).
- Granice odpowiedzialności procesów są zachowane opisowo jak w `docs/architektura.md` (worker bez publicznego API przeglądarki).

### Krok 1.4 - Model danych startowy

**Status:** `WYKONANY`

**Opis:** Startowy model pod etap 0: użytkownicy, spotkania (**organizator**, `clientLinkStatus`, `confidential`, czas trwania), uczestnicy wewnętrzni + metadane zewnętrznych, transcript, summary, zadania, `Client.emailDomain`, refresh tokeny, `audit_log` - zgodnie z `SPEC-DANE`. `Project` / `ProjectMembership` mogą istnieć w schemacie **bez** roli ACL v1. Align po KROK 4: feature plan plik `_1` **KROK 8** (gdy startowy schemat powstał wcześniej). Gotowość pod pipeline (Faza 2) oraz auth/ACL v1 (Faza 3).

**DoD (krok):**

- Model pokrywa byty wymagane przez etap 0 w docs/SPEC-DANE (w tym organizer + status linku klienta).
- Nie ma oczywistej luki wymuszającej przebudowę schematu przed Fazą 2 lub 3 (np. brak miejsca na status przetwarzania, sesję refresh, organizatora lub audyt).

### Krok 1.5 - Smoke jakości i README po scaffoldzie

**Status:** `WYKONANY`

**Opis:** Minimalna bramka jakości w `api` (smoke) oraz root README z komendami uruchomienia po scaffoldzie. Sekcja uruchomienia opisuje **ścieżkę A** (`db:up` + `dev:*`) i **ścieżkę B** (`dev:stack:up`), spójnie z Krokiem 1.2 / A-7 / A-8.

**DoD (krok):**

- Smoke w `api` przechodzi.
- README pozwala podnieść scaffold ścieżką A i ścieżką B bez domysłów spoza repo.

---

## MILESTONE - Fundament monorepo gotowy

**Status:** `OSIĄGNIĘTY`

**Opis:** Bramka po Fazie 1. Duży skok: repo ma docelowy układ procesów, lokalną bazę (A), obowiązkowy stack compose.dev (B), startujące szkielety oraz model pod dalsze fazy. Wolno wchodzić w pipeline bez przebudowy monorepo.

**DoD (milestone):**

- Faza 1 ma status `WYKONANY` (lub wszystkie jej obowiązkowe DoD kroków są spełnione).
- Trzy lokalizacje procesów istnieją; działa `pnpm db:up` oraz `pnpm dev:stack:up`.
- Model danych startowy i kontrakty typów wystarczają na start Fazy 2.
- Prowadzący prace akceptuje przejście do Fazy 2.

---

## Faza 2 - Pipeline spotkania

**Status:** `WYKONANY`

**Opis:** Ścieżka od mockowego źródła do zwalidowanego, trwale zapisanego streszczenia: job w workerze, redakcja przed wywołaniem portu LLM, fail-closed, idempotencja, enqueue z `api`. Zgodnie z `docs/data_flow.md`, `SPEC-PIPELINE`, `SPEC-LLM`, `SPEC-KOMUNIKACJA` (kontrakt joba / źródła).

**DoD (faza):**

- Happy path kończy się statusem sukcesu z trwałym transcriptem, summary i zadaniami po walidacji kontraktu wyniku.
- Ponowne przetworzenie tego samego klucza nie tworzy drugiego spotkania.
- Niepoprawny wynik modelu nie staje się kanonicznym summary.
- Redakcja E+T+P+K jest przed wywołaniem portu LLM; demo lokalne jest opisane i działa.
- Enqueue pochodzi ze ścieżki `api` (nie „dla UI” z workera).

### Krok 2.1 - Port źródła i atrapa materiałów

**Status:** `WYKONANY`

**Opis:** Port pobrania spotkania + atrapa (fixture PL z wtrąceniami EN). Obiekt summary vendora **ignorowany** - kanon powstaje u nas (`docs/llm_i_asystent.md`, `SPEC-PIPELINE`).

**DoD (krok):**

- Da się pobrać materiał mockowy po kluczu zewnętrznym / fixture.
- Ścieżka nie opiera się na `summary.*` vendora jako źródle prawdy.

### Krok 2.2 - Orkiestracja joba `meeting.process`

**Status:** `WYKONANY`

**Opis:** Sekwencja: fetch → normalize → redact (E+T+P+K) → summarize (port LlmClient, mock UC1) → walidacja wyniku → persist. Statusy: `pending` → `processing` → `completed` | `failed`. Zakaz trwałego zapisu transcript/summary przed wywołaniem LlmClient (`SPEC-PIPELINE`).

**DoD (krok):**

- Happy path prowadzi do `completed` z kanonicznymi artefaktami po walidacji.
- Awaria / przerwanie przed akceptacją wyniku nie zostawia „pół-sukcesu” kanonicznego w DB.
- Statusy są obserwowalne dla późniejszego API / SSE (Faza 3).

#### Podkrok 2.2.1 - Redakcja E+T+P+K przed LLM

Czysta ścieżka redakcji wywołana przed każdym wywołaniem portu summarizera.

#### Podkrok 2.2.2 - Walidacja wyniku i persist po akceptacji

Fail-closed: niepoprawny kształt → retry wg normy, potem `failed` / quarantine; bez dirty summary jako sukcesu.

### Krok 2.3 - Idempotencja i enqueue z `api`

**Status:** `WYKONANY`

**Opis:** Klucz idempotencji (`externalMeetingId` / `fixtureKey`) - update in place. Enqueue joba z `api` (CLI/demo DX może istnieć jako dodatkowa ścieżka). Worker tylko konsumuje.

**DoD (krok):**

- Dwukrotne odpalenie tego samego klucza = jedno spotkanie.
- Enqueue jest osiągalny ze ścieżki `api` zgodnie z `SPEC-KOMUNIKACJA` / `SPEC-PIPELINE`.

### Krok 2.4 - Testy redakcji i demo przepuszczenia spotkania

**Status:** `WYKONANY`

**Opis:** Unit testy redakcji E+T+P+K oraz opisane w README demo przepuszczenia przykładowego spotkania na lokalnym Compose + fixture.

**DoD (krok):**

- Testy redakcji przechodzą.
- Demo opisane w README działa na lokalnym środowisku z Fazą 1.

---

## MILESTONE - Pipeline etapu 0 działa

**Status:** `OSIĄGNIĘTY`

**Opis:** Bramka po Fazie 2. Duży skok: asynchroniczna ścieżka mock → redakcja → mock LLM → walidacja → persist jest domknięta i idempotentna. Wolno budować warstwę sesji i odczytu pod UI.

**DoD (milestone):**

- Faza 2 ma status `WYKONANY`.
- Spełnione: happy path, idempotencja, fail-closed na wyniku, redakcja przed LLM, demo lokalne.
- Statusy przetwarzania są gotowe pod kontrakt odczytu / SSE w Fazie 3.
- Prowadzący prace akceptuje przejście do Fazy 3.

---

## Faza 3 - Auth, ACL i kontrakty API pod UI

**Status:** `WYKONANY`

**Opis:** Prawdziwa sesja pracownika, ACL na odczycie spotkań, demo enqueue oraz SSE statusów - wyłącznie po stronie `api`. Zgodnie z `SPEC-AUTH_I_ACL`, `SPEC-KOMUNIKACJA`, `SPEC-TESTY`. **Poza tym majorem:** implementacja UI, BFF, layoutu sidebara i zachowań przeglądarki (osobny major frontu).

**DoD (faza):**

- Sesja oparta o cookie HttpOnly (bez trzymania sekretów sesji w storage przeglądarki po stronie kontraktu API/BFF opisanego w docs).
- Lista i detail respektują ACL; brak uprawnień → brak wycieku istnienia zasobu (404).
- Zalogowany użytkownik może enqueue’ować demo; SSE / status pipeline jest dostępny przy tym samym ACL co detail.
- Testy krytyczne auth/ACL (tabela przypadków) przechodzą w zakresie opisanym w `SPEC-TESTY`.
- Powierzchnia HTTP potrzebna majorowi frontu jest domknięta opisowo (auth, meetings, demo, events).

### Krok 3.1 - Auth pracowników i sesja

**Status:** `WYKONANY`

**Opis:** Register / login / logout / me / refresh; hasła hashowane; access + refresh (hash refresh w DB); cookie HttpOnly. Rejestracja v1 otwarta; po register od razu sesja - `SPEC-AUTH_I_ACL`.

**DoD (krok):**

- Ścieżki auth zachowują się zgodnie z normą SPEC (w tym rotacja / unieważnienie refresh).
- Nie da się uznać sesji za „atrapę na zawsze”: model jest produkcyjnie sensowny dla etapu 0.

### Krok 3.2 - ACL i odczyt spotkań

**Status:** `WYKONANY`

**Opis:** Moduł / serwis `access`: **organizator** ∨ **uczestnik** ∨ **admin** (`SPEC-AUTH_I_ACL` ACL v1; bez membership). `GET /meetings` (paginacja limit ∈ {10,25,50,100} + page) oraz `GET /meetings/:id`. Deny → **404**.

**DoD (krok):**

- Nie da się pobrać cudzego spotkania zgadnięciem ID przy ważnej sesji obcego użytkownika (404).
- Membership projektu nie daje allow w testach ACL v1.
- Lista zwraca wyłącznie spotkania dozwolone regułami ACL.

### Krok 3.3 - Demo enqueue i SSE statusów

**Status:** `WYKONANY`

**Opis:** `POST /demo/run-meeting` - sesja wymagana; tylko enqueue (bez synchronicznego pipeline w requeście; bez wymogu flagi `DEMO_ENABLED` w kontrakcie). `GET /meetings/:id/events` - SSE statusów pipeline z ACL jak detail (`SPEC-KOMUNIKACJA`).

**DoD (krok):**

- Demo endpoint enqueue’uje job przy ważnej sesji.
- SSE / równoważny strumień statusów jest dostępny tylko przy uprawnieniu do spotkania.

### Krok 3.4 - Testy auth/ACL (i SSE w miarę czasu)

**Status:** `WYKONANY`

**Opis:** Testy tabeli ACL (`SPEC-TESTY`), auth cookie + deny→404, demo enqueue; SSE wg dostępnego czasu. Opcjonalnie zapis `audit_log` przy deny / fail joba (`SPEC-OBSERVABILITY`) - dogrywka tu lub w Fazie 5.

**DoD (krok):**

- Testy ACL (tabela przypadków) przechodzą.
- Krytyczna ścieżka auth + deny→404 jest pokryta testami.
- Luki świadomie odłożone (np. pełne SSE / audit) są nazwane, nie ukryte.

#### Podkrok 3.4.1 - (Opcjonalnie) zapis `audit_log` przy deny / fail

Trwały ślad kluczowych odmów i faili joba bez treści transcriptu - jeśli czas; inaczej jawnie w Fazie 5.

---

## MILESTONE - API sesji i ACL gotowe pod front

**Status:** `OSIĄGNIĘTY`

**Opis:** Bramka po Fazie 3. Duży skok: zaufana warstwa `api` oferuje sesję, ACL, demo i statusy pod spięcie z majorem frontu. UI nadal poza tym plikiem.

**DoD (milestone):**

- Faza 3 ma status `WYKONANY`.
- Auth cookie, ACL+404, demo enqueue oraz odczyt statusów (SSE lub równoważnie udokumentowany) działają.
- Kontrakty HTTP potrzebne `docs/frontend.md` / `SPEC-FRONTEND` są spełnione po stronie `api`.
- Prowadzący prace akceptuje przejście do Fazy 4 (oraz równoległy / kolejny major frontu nie blokuje CI i Części A).

---

## Faza 3.5 - Tożsamość DEMO/Test (multi-tester)

**Status:** `WYKONANY`

**Opis:** Zmiana kontraktu ścieżki **DEMO/Test** (`POST /demo/run-meeting`) pod multi-tester na jednej instancji - zgodnie z `SPEC-KOMUNIKACJA` K-5 / `SPEC-PIPELINE` P-6 (po legalizacji aux). Pipeline 1:1 jak produkcja; mocki wyłącznie na porcie źródła.

**Refaktor / zmiana kontraktu względem:** Faza 2 (pipeline / demo lokalne; `WYKONANY`) oraz Faza 3 / Krok 3.3 - Demo enqueue i SSE (`WYKONANY`); MILESTONE „API sesji i ACL gotowe pod front” (`OSIĄGNIĘTY`) - **bez przepisywania** treści źródeł. Cel: nowe `externalMeetingId` (UUID) na każde wywołanie Test, `organizerId` = użytkownik sesji, losowy `fixtureKey` z katalogu **10**; DX i ścieżka produkcyjna poza zakresem tej fazy.

**DoD (faza):**

- Katalog **10** fixture’ów za portem źródła; demo enqueue losuje `fixtureKey` i nadaje UUID runu + `organizerId` sesji.
- Multi-user Test → osobne wiersze `Meeting`; idempotencja pipeline nadal po `externalMeetingId` (nie po samym fixture na UI Test).
- Brak zmiany semantyki DX (`POST /dev/meetings/enqueue`) i produkcji (Fireflies / webhook).
- Testy pokrywają multi-tester / katalog 10 w zakresie `SPEC-TESTY`.
- Projekcja listy / SSE (Krok 3.5.4): `GET /meetings` i eventy terminalne niosą `summary` / `failureReason` pod tabelę UI v1.

### Krok 3.5.1 - Katalog 10 fixture’ów za portem źródła

**Status:** `WYKONANY`

**Opis:** Rozszerzenie / uzupełnienie materiałów mocka do **10** kluczy dostępnych przez port źródła (bez zmiany kontraktu obiektu źródłowego).

**DoD (krok):**

- Katalog obejmuje 10 kluczy; worker/api potrafią pobrać materiał po `fixtureKey`.

### Krok 3.5.2 - Demo enqueue: UUID runu, organizer sesji, losowy fixture

**Status:** `WYKONANY`

**Opis:** `POST /demo/run-meeting` zgodny z K-5: każde wywołanie → nowe `externalMeetingId` (UUID), `organizerId` = user sesji, serwer losuje `fixtureKey` z katalogu 10; payload joba `meeting.process` z UUID runu + wylosowanym `fixtureKey` (`fixtureKey` ≠ tożsamość wiersza).

**DoD (krok):**

- Dwóch użytkowników × Test → dwa spotkania; ponowny Test tego samego usera → nowy wiersz.
- DX `/dev/meetings/enqueue` bez zmian zachowania w tej fazie.

### Krok 3.5.3 - Testy multi-user DEMO i idempotencja po UUID

**Status:** `WYKONANY`

**Opis:** Integracja / API wg `SPEC-TESTY` (T-9/T-10): multi-tester, katalog 10, idempotencja po `externalMeetingId` runu - bez wymogu „jeden fixture = jeden wiersz globalnie” dla UI Test.

**DoD (krok):**

- Asercje multi-user i idempotencji po UUID runu przechodzą w zakresie DoD testów dema.

### Krok 3.5.4 - Projekcja wyniku na liście i SSE (`summary` / `failureReason`)

**Status:** `WYKONANY`

**Opis:** Uzupełnienie kontraktu odczytu pod tabelę UI v1 (brak trasy detail): element `GET /meetings` oraz eventy SSE przy statusach terminalnych niosą pola wyniku pipeline, żeby kolumna podsumowania / błędu przetrwała odświeżenie widoku — nie tylko live SSE.

**Refaktor względem:** Faza 3 / Krok 3.2 — Lista + detail + ACL (`WYKONANY`) oraz Faza 3 / Krok 3.3 — Demo enqueue i SSE (`WYKONANY`). Zmiana: wcześniejsza projekcja listy bez `summary` / `failureReason` (wynik tylko w detail / ephemeralnie w SSE) → lista i SSE zgodne z `SPEC-KOMUNIKACJA` K-2a / K-5a oraz `docs/dokumentacja_komunikacji.md` (wersja z projekcją wyniku na liście).

**Zakres backend (api + contracts):**

- `MeetingListItemDto` (+ re-export contracts): pola `summary`, `failureReason`.
- `ListMeetingsUseCase`: mapowanie `m.summary`, `m.failureReason` z Prisma.
- `MeetingEventsService` (SSE): przy `completed` — `title` + `summary`; przy `failed` — `failureReason`.
- Detail bez regresji (nadal rozszerza listę, np. `externalParticipants`).

**Poza tym krokiem:** zmiany wyłącznie w `apps/web` (mapowanie UI); katalog 10 / UUID dema (3.5.1–3.5.2); DX enqueue.

**DoD (krok):**

- `GET /meetings` zwraca w elemencie listy `summary` oraz `failureReason` zgodnie z K-2a.
- SSE przy `failed` może / niesie `failureReason`; przy `completed` — `summary` (spójnie z K-5a).
- Po `completed` / `failed` odświeżenie listy nie wymaga osobnego `GET /meetings/:id`, żeby UI miał treść kolumny wyniku (weryfikacja z frontem / kontraktem).
- Brak transcriptu w elemencie listy; ACL listy bez zmian (AC-4).

---

## MILESTONE - DEMO/Test multi-tester bez kolizji ACL

**Status:** `OSIĄGNIĘTY`

**Opis:** Bramka po Fazie 3.5. Kilku testerów na jednej instancji nie koliduje w ACL; UI Test nie współdzieli jednego globalnego wiersza dema.

**DoD (milestone):**

- Faza 3.5 ma status `WYKONANY`.
- Kontrakt K-5 (UUID runu, katalog 10, losowanie API, organizer sesji) jest spełniony po stronie `api` / źródła mock.
- DX i produkcja pozostają poza zakresem tej zmiany.

---

## Faza 3.6 - Szkielet on-demand linku nagrania (mock)

**Status:** `WYKONANY`

**Opis:** Port / use case resolve URL nagrania + endpoint HTTP JSON `{ url }` + mock atrapy (`https://example.com/...`); ACL jak detail; **zakaz** persist ephemeral media URL w DB. Szkielet pod późniejszą podmianę adaptera Fireflies (ten sam kontrakt HTTP) — bez prawdziwego klienta GraphQL FF w tej fazie.

**Rozszerzenie względem:** Faza 3 (auth/ACL/SSE; `WYKONANY`) oraz Faza 3.5 (DEMO/Test; `WYKONANY`) — **bez edycji** ich treści ani milestone’ów `OSIĄGNIĘTY`. Norma: `docs/dokumentacja_komunikacji.md` (1.2a), `SPEC-KOMUNIKACJA` K-5b, `SPEC-DANE` D-7b, `SPEC-AUTH_I_ACL` (recording), `SPEC-TESTY` T-11a.

**DoD (faza):**

- `GET /meetings/:id/recording` (sesja + ACL jak detail) zwraca `{ url }` z mocka; brak ACL → **404**.
- Brak kolumny / trwałego pola `audio_url` / `video_url` na `Meeting`.
- Testy T-11a (mock, bez sieci do FF) w zakresie DoD.
- Adnotacja w kodzie / kontrakcie: adapter FF później bez zmiany kształtu odpowiedzi HTTP.
- Major frontu (Faza 3.6) może spiąć BFF + button z tym endpointem.

### Krok 3.6.1 - Port resolve URL nagrania (mock)

**Status:** `WYKONANY`

**Opis:** Port / adapter on-demand: wejście `externalMeetingId` (tożsamość źródła) → świeży URL; w v0 implementacja mock zwraca atrapę `https://example.com/...`. Poza pipeline transcriptu (`meeting.process`).

**DoD (krok):**

- Mock resolve działa bez sieci zewnętrznej; kontrakt portu gotowy pod podmianę FF.

### Krok 3.6.2 - Endpoint HTTP + ACL + zakaz persist

**Status:** `WYKONANY`

**Opis:** `GET /meetings/:id/recording` w `api`: sesja wymagana; ACL jak detail (brak → 404); odpowiedź JSON `{ url }` (nie 302); **bez** zapisu URL do Postgres.

**DoD (krok):**

- Trasa zgodna z K-5b; D-7b respektowane (brak kolumny media URL).

### Krok 3.6.3 - Testy recording (T-11a)

**Status:** `WYKONANY`

**Opis:** Integracja API: bez ACL → 404; z ACL → `{ url }` mock; brak asercji na prawdziwe FF; brak oczekiwania kolumny URL w DB.

**DoD (krok):**

- Scenariusze T-11a przechodzą w zakresie DoD testów.

---

## MILESTONE - Szkielet on-demand nagrania (API)

**Status:** `OSIĄGNIĘTY`

**Opis:** Bramka po Fazie 3.6. Duży skok: `api` oferuje kontrakt on-demand linku (mock) pod BFF/UI; persist ephemeral URL wykluczony.

**DoD (milestone):**

- Faza 3.6 ma status `WYKONANY`.
- Endpoint recording + mock + testy ACL/mock spełnione.
- Prowadzący prace akceptuje przejście do Fazy 4 (oraz Faza 3.6 majoru frontu).

---

## Faza 3.7 - Zaślepka portów gałęzi braku zgody (Calendar + Gemini Notes)

**Status:** `WYKONANY`

**Opis:** Szkielet portów/adapterów pod gałąź braku zgody RODO: port **metadanych** (Google Calendar) oddzielony od portu **treści**; adapter treści `gemini-notes` obok istniejącego mock / przyszłego `fireflies`. W **obecnej wersji** implementacja = **zaślepka** (np. `NotImplemented` / opis w komentarzu / brak wywołań Google); happy-path pipeline nadal przez istniejący mock źródła; **bez** OAuth, **bez** prawdziwego Calendar/Docs/Drive API. W **kolejnej wersji** (etap 1+ / poza DoD tej fazy jako „done prod”): ta sama powierzchnia portów zyskuje działającą logikę (wybór `fireflies` \| `gemini-notes` wg zgody; UC1 gdy tekst; metadata-only gdy brak treści).

**Rozszerzenie względem:** Faza 2 / port źródła (`WYKONANY`) oraz Faza 3 / 3.5 (`WYKONANY`) — **bez edycji** ich treści. Spójność z Fazą 3.6 (on-demand FF; `WYKONANY`) — **bez** nadpisywania 3.6; gałąź bez zgody **nie** używa mechanizmu nagrania FF. Norma po legalizacji: `docs/bezpieczenstwo_i_rodo.md`, `docs/architektura.md`, `docs/architektura_katalogi_pliki.md`, `SPEC-PIPELINE` (P-2a/P-2b), `SPEC-KOMUNIKACJA` (port metadane vs treść), `SPEC-DANE` D-7c, `SPEC-TESTY` T-11b.

**DoD (faza):**

- W `apps/worker/src/adapters/` istnieją powierzchnie portu metadanych (Calendar) oraz adaptera treści `gemini-notes` jako **zaślepka** (nie fat-adapter z FF/Calendar).
- Happy-path `meeting.process` nadal działa na istniejącym mocku treści; zaślepka **nie** jest wymagana na ścieżce demo v0.
- Brak OAuth Google / prawdziwych wywołań Calendar / Gemini Notes w tej fazie.
- Adnotacja w kodzie / kontrakcie: podmiana na działającą logikę w etapie 1+ na tych samych portach (wybór źródła wg zgody).
- Lekkie testy rejestracji portu / stub (opcjonalnie: stub rzuca lub nie jest wołany na happy-path) — **bez** sieci do Google (`SPEC-TESTY` T-11b v0).
- Faza 3.6 i wcześniejsze `WYKONANY` / milestone’y `OSIĄGNIĘTY` nietknięte.

### Krok 3.7.1 - Port metadanych (Calendar) — zaślepka

**Status:** `WYKONANY`

**Opis:** Port / adapter metadanych faktu callu (tytuł, czas, uczestnicy indywidualni) — powierzchnia pod przyszły Google Calendar API. W tej fazie: zaślepka (`NotImplemented` / brak wywołań sieciowych). **Zakaz** ekspansji grup Workspace; **zakaz** traktowania Calendar jako magazynu audio. Kod w `apps/worker/src/adapters/` — **nie** wołać z BFF/`api` (K-7).

**DoD (krok):**

- Powierzchnia portu metadanych istnieje jako zaślepka; oddzielona od portu treści i od K-5b (recording).

### Krok 3.7.2 - Adapter treści `gemini-notes` — zaślepka

**Status:** `WYKONANY`

**Opis:** Adapter treści `gemini-notes` na kontrakcie portu źródła treści (obok mock / przyszłego `fireflies`). Zaślepka bez prawdziwego Meet/Notes API. **Zakaz** fat-adaptera łączącego Calendar+FF+Notes. Happy-path pozostaje na mocku, dopóki egzekucja zgody nie podpięta.

**DoD (krok):**

- Adapter `gemini-notes` zarejestrowany / opisany jako stub; nie łamie happy-path mock; nie serwuje audio FF.

### Krok 3.7.3 - Adnotacja etap 1+ i testy stub (T-11b v0)

**Status:** `WYKONANY`

**Opis:** Komentarz / README adaptera: etap 1+ = wybór `fireflies` \| `gemini-notes` wg zgody; UC1 gdy tekst; metadata-only gdy brak treści; pola zgody/`contentSource` w schemacie przy prod (D-7c). Opcjonalne lekkie testy: stub nie jest wołany na happy-path albo rzuca oczekiwanie — **bez** Google w CI.

**DoD (krok):**

- Adnotacja etap 0 vs 1+ w kodzie/adapters; CI v0 bez prawdziwego Google.

---

## MILESTONE - Zaślepka portów gałęzi braku zgody

**Status:** `OSIĄGNIĘTY`

**Opis:** Bramka po Fazie 3.7. Duży skok: worker ma powierzchnię portów Calendar + `gemini-notes` jako zaślepka pod etap 1+; happy-path mock i Faza 3.6 (on-demand) bez regresji.

**DoD (milestone):**

- Faza 3.7 ma status `WYKONANY`.
- Porty/zaślepki w `apps/worker/src/adapters/` spełniają DoD fazy (bez OAuth / sieci Google).
- Prowadzący prace akceptuje przejście do Fazy 4.

---

## Faza 4 - Część A + CI

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Dokument decyzyjny Części A (≤5 stron) **skondensowany z istniejących `docs/`** oraz bramka CI zgodna z `docs/deployment.md` / `SPEC-TESTY` (testy na PR, ręczny dispatch, opis ochrony `main`).

**DoD (faza):**

- Część A jest w repo (Markdown lub PDF), ≤5 stron, spójna z `docs/` (architektura, koszty, RODO, plan etapów, przepływy).
- CI odpala testy na pull request; istnieje ścieżka ręcznego uruchomienia.
- README opisuje ochronę gałęzi głównej (ustawienie po stronie hostingu gita).

### Krok 4.1 - Dokument Części A

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Odpowiedzi na punkty briefu językiem dla decydenta; diagram przepływu i failure modes (skrót z `data_flow.md`); koszty ≥2 wariantów (~300 h/mies.) z `koszty_i_warianty.md`; środowiska (fixtures, brak prawdziwych nagrań, mocki); plan wdrożenia + metryki; ryzyka i pytania do firmy.

**DoD (krok):**

- Dokument A ≤5 stron, bez sprzeczności z `docs/`.
- Zawiera warianty kosztów i skrót etapów wdrożenia.

### Krok 4.2 - CI i ochrona gałęzi głównej

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Automatyczne testy na PR (w rozsądnym zakresie z bazą testową); workflow uruchamiany ręcznie; opis blokady bezpośrednich pushy na `main` w README + checklista ustawień.

**DoD (krok):**

- PR uruchamia testy.
- Istnieje manualny dispatch.
- README zawiera opis ochrony `main`.

---

## MILESTONE - Dokument A i bramka CI

**Opis:** Bramka po Fazie 4. Duży skok: oddanie ma warstwę decyzyjną (Część A) oraz automatyczną bramkę jakości na PR.

**DoD (milestone):**

- Faza 4 ma status `WYKONANY`.
- Część A w repo; CI na PR; opis ochrony `main` w README.
- Prowadzący prace akceptuje przejście do Fazy 5.

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Faza 5 - Domknięcie oddania (backend / etap 0)

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Czytelne oddanie backendowej części etapu 0: kompletny root README, domknięcie testów krytycznych, smoke na czystym clone, świadome cięcia zakresu. Kryteria „etap 0 działa” z `docs/plan_wdrozenia_etapy.md` w części backendowej; pełny panel UI weryfikowany w majorze frontu.

**DoD (faza):**

- Must-have backendu etapu 0: model, pipeline, redakcja+testy, ACL+testy, auth sesji, uruchomienie lokalne + demo - spełnione.
- Root README bez TODO-placeholderów wymaganych na oddanie; wskazuje Część A i opisuje atrapy / użycie AI.
- Smoke end-to-end (Compose + procesy + demo) działa komendami opisanymi w README.
- Świadomy zakres (brak prawdziwego Google/Fireflies/LLM; UC2 poza v1; UI = osobny major) jest zapisany w README.

### Krok 5.1 - Root README oddania

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Uruchomienie całości, co działa / atrapa / czego nie ma i dlaczego, użycie AI, wskazanie Części A - zgodnie z `docs/plan_wdrozenia_etapy.md` (wymagania oddania w root README, nie w `docs/README.md`).

**DoD (krok):**

- Sekcje oddania są kompletne i zgodne z faktycznym stanem repo.
- Brak wymaganych placeholderów „do uzupełnienia” w sekcjach oddania.

### Krok 5.2 - Domknięcie testów krytycznych i porządki

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Dopięcie luk testowych (ACL, redakcja, walidacja wyniku, idempotencja, auth cookie; SSE/audit jeśli luka); usunięcie martwego kodu i tajemnic z repo.

**Jawna lista odroczeń z Fazy 3** (do domknięcia tu albo świadomie w README oddania):

- Pełny happy-path SSE (emisja statusów `pending` → terminalny) - w Fazie 3 pokryty deny→404, bez e2e emisji eventów.
- Pełny katalog audytu auth/demo/job (`auth.*`, `demo.run`, `job.enqueued` itd. wg O-11) - w Fazie 3 domknięty `meeting.access.denied`; reszta poza deny.

**DoD (krok):**

- Krytyczne scenariusze backendu z `SPEC-TESTY` / docs mają zielone testy albo jawną, świadomą listę odpuszczonych pozycji w README.
- Brak oczywistych sekretów i dead code blokującego czytelność oddania.
- Pozycje z listy odroczeń Fazy 3 są albo domknięte testami, albo nazwane w README oddania.

### Krok 5.3 - Smoke end-to-end i świadomy zakres

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Sprawdzenie „jedna lub kilka komend” na czystym clone; przeczytanie Części A jak decydent; lista odpuszczonych rzeczy w README (i ewentualnie w A). Koordynacja z majorem frontu: UI (login, tabela, Test, SSE, mock search) **nie** jest DoD tego kroku - tylko wzmianka / checklista zależności.

**DoD (krok):**

- Czysty clone + instrukcja README prowadzi do działającego dema backendowego.
- Lista cięć / atrap jest jawna.
- Zależność od majoru frontu (dla pełnego kryterium UI etapu 0) jest nazwana, bez udawania że UI domknięto tutaj.

---

## MILESTONE - Backend etapu 0 gotowy do oddania

**Opis:** Bramka zamykająca ten major. Duży skok: backendowa część etapu 0 jest oddawalna; dokument A i CI stoją; README jest kompletne. Pełne kryterium UI etapu 0 domyka osobny major frontu.

**DoD (milestone):**

- Faza 5 ma status `WYKONANY`.
- Must-have backendu etapu 0 z `docs/plan_wdrozenia_etapy.md` jest spełnione.
- README oddania kompletne; Część A wskazana; CI i ochrona `main` opisane.
- Świadomy zakres (w tym podział backend / frontend major) jest zapisany.
- Prowadzący prace uznaje backend za gotowy do oddania (niezależnie od statusu majoru frontu, o ile README to precyzuje).

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Poza zakresem tego major planu

- Pełna implementacja `apps/web` (BFF, sidebar, tabela+Test+SSE w UI, mock wyszukiwarki) - **osobny major frontu**.
- Prawdziwy Google Workspace / Fireflies / LLM; UC2 / RAG; Playwright jako must-have; HTTP odczytu `audit_log`; konta klientów zewnętrznych; HubSpot; erase admin UI/API; ACL przez membership zespołu klienta - poza etapem 0 (`docs/dokumentacja_koncepcyjna.md`, `docs/plan_wdrozenia_etapy.md`).
- Etapy wdrożenia firmowego 1–3 - poza tym planem prac kodu oddania.

## Mapowanie obszarów SPEC → fazy (ślad)

| Obszar SPEC | Fazy (ten major) |
|-------------|------------------|
| `SPEC-ARCHITEKTURA` (A-7 ścieżka A, A-8 ścieżka B `dev:stack`), `SPEC-DANE` | 1 |
| `SPEC-PIPELINE`, `SPEC-LLM`, częściowo `SPEC-KOMUNIKACJA` (job / źródło) | 2 |
| `SPEC-AUTH_I_ACL`, `SPEC-KOMUNIKACJA` (HTTP/SSE/demo), `SPEC-TESTY`, opcjonalnie `SPEC-OBSERVABILITY` | 3 |
| `SPEC-KOMUNIKACJA` K-5 / `SPEC-PIPELINE` P-6 / `SPEC-TESTY` (DEMO/Test multi-tester, katalog 10) | 3.5 |
| `SPEC-KOMUNIKACJA` K-5b / `SPEC-DANE` D-7b / `SPEC-AUTH_I_ACL` / `SPEC-TESTY` T-11a (on-demand nagranie mock) | 3.6 |
| `SPEC-TESTY` / `docs/deployment.md` (CI), docs pod Część A | 4 |
| Domknięcie vs `SPEC-TESTY` + kryteria etapu 0 | 5 |
| `SPEC-FRONTEND` | poza tym plikiem (major frontu); Faza 1 tylko stub struktury |
