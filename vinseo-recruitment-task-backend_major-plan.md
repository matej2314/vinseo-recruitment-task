# Vinseo Recruitment Task — major plan (backend)

**Zakres tego pliku:** major plan prac nad **backendem** etapu 0 — procesy `api` i `worker`, wspólny fundament monorepo (w tym model danych i kontrakty typów) oraz artefakty oddania zależne od backendu (CI, Część A, root README).

**Powiązany major frontendu:** [`vinseo-recruitment-task-frontend_major-plan.md`](./vinseo-recruitment-task-frontend_major-plan.md). Oba pliki razem opisują postęp etapu 0; statusy prowadzi się **osobno** w każdym pliku.

**Frontend w tym pliku:** `apps/web` pojawia się jako **stub / miejsce w strukturze repo** (Faza 1) oraz jako zależność kontraktowa API (Faza 3). Pełne UI, BFF i zachowanie panelu wg `docs/frontend.md` / `SPEC-FRONTEND` to postęp majoru frontendu (Faza 1 frontu = odbiór fundamentu z tej Fazy 1 — bez powielania treści monorepo).

**Źródła:** `docs/` oraz `spec/SPEC-*.md` (spis: `docs/README.md`, `spec/SPEC-README.md`).  
**Etap produktowy:** szkielet / etap 0 — `docs/plan_wdrozenia_etapy.md`, `docs/dokumentacja_koncepcyjna.md`.

**Statusy (fazy / kroki):** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`  
**Milestone:** domyślnie **bez statusu**; po spełnieniu DoD → wyłącznie `OSIĄGNIĘTY`

**Kalendarz roboczy (orientacyjnie):** jedna faza ≈ jeden dzień roboczy w oknie oddania; kolejność faz jest obowiązująca niezależnie od dat.

---

## Faza 1 — Fundament monorepo i szkielet procesów

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Pierwszy etap prac: dogranie **struktury całego repo** (backend, frontend jako stub, worker) oraz lokalnej gotowości do dalszych faz. Po Fazie 1 da się podnieść środowisko danych, uruchomić szkielety procesów oraz mieć startowy model danych i minimalne kontrakty typów pod pipeline i auth — zgodnie z `docs/architektura_katalogi_pliki.md`, `docs/architektura.md`, `SPEC-ARCHITEKTURA`, `SPEC-DANE`.

**DoD (faza):**

- Układ monorepo odzwierciedla docelowe drzewo z docs (procesy `api` / `worker` / `web`, wspólne kontrakty, wspólny model danych w rootcie).
- Środowisko lokalne z bazą działa; `api` i `worker` startują jako osobne procesy; stub `web` startuje w minimalnym zakresie.
- Smoke jakości w `api` przechodzi; README opisuje komendy po scaffoldzie.
- Fundament wystarcza do startu Fazy 2 (pipeline) i Fazy 3 (auth/ACL) bez przebudowy układu repo.

### Krok 1.1 — Struktura całego repozytorium

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Utworzenie / dogranie struktury całego monorepo: miejsca na `api`, `worker`, `web`, pakiet wspólnych kontraktów typów oraz schemat danych w rootcie. Jeden root repozytorium (bez zagnieżdżonych historii gita pod aplikacjami). Workspaces i wspólne skrypty startowe root zgodne z docs.

**DoD (krok):**

- Drzewo katalogów jest zgodne z `docs/architektura_katalogi_pliki.md` w zakresie etapu 0.
- Współdzielone typy żyją wyłącznie w uzgodnionym pakiecie kontraktów; nie ma tam walidacji runtime ani logiki domenowej (zgodnie z `SPEC-ARCHITEKTURA`).
- Jest jeden root repo — aplikacje nie są osobnymi repozytoriami.

#### Podkrok 1.1.1 — Miejsca procesów `api`, `worker`, `web`

Widoczne, rozróżnialne lokalizacje trzech procesów runtime z docs.

#### Podkrok 1.1.2 — Pakiet kontraktów i schemat danych w rootcie

Minimalne kształty typów pod późniejsze API/job oraz lokalizacja schematu / migracji wspólnej bazy.

### Krok 1.2 — Lokalne środowisko danych i kolejki

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Lokalne podniesienie magazynu stanu (PostgreSQL) tak, by ta sama instalacja mogła obsługiwać dane domenowe i kolejkę jobów — zgodnie z `docs/architektura.md` / `docs/deployment.md` (bez osobnego brokera w v1).

**DoD (krok):**

- Baza lokalna wstaje w sposób powtarzalny opisany w README.
- Kolejka jobów korzysta z tej samej bazy (założenie docs), bez wprowadzania równoległego magazynu „na start”.

### Krok 1.3 — Szkielety procesów Nest oraz stub frontu

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Uruchamialny szkielet `api` (HTTP) i `worker` (osobny entry, bez publicznego HTTP dla przeglądarki) oraz minimalny stub `apps/web` (App Router / trasy-placeholdery pod późniejszy major frontu). Pełne UI **nie** wchodzi w ten krok.

**DoD (krok):**

- `api` i `worker` startują lokalnie jako **dwa** procesy.
- Stub `web` startuje (nawet z pustym / minimalnym UI).
- Granice odpowiedzialności procesów są zachowane opisowo jak w `docs/architektura.md` (worker bez publicznego API przeglądarki).

### Krok 1.4 — Model danych startowy

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Startowy model pod etap 0: użytkownicy, spotkania, uczestnicy, transcript, summary, zadania, membership / uprawnienia, refresh tokeny, `audit_log` — zgodnie z `SPEC-DANE` i opisem w docs. Gotowość pod pipeline (Faza 2) oraz auth/ACL (Faza 3).

**DoD (krok):**

- Model pokrywa byty wymagane przez etap 0 w docs/SPEC-DANE.
- Nie ma oczywistej luki wymuszającej przebudowę schematu przed Fazą 2 lub 3 (np. brak miejsca na status przetwarzania, sesję refresh lub audyt).

### Krok 1.5 — Smoke jakości i README po scaffoldzie

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Minimalna bramka jakości w `api` (smoke) oraz root README z komendami uruchomienia po scaffoldzie — nawet jeśli część ścieżek domenowych jeszcze nie działa w 100%.

**DoD (krok):**

- Smoke w `api` przechodzi.
- README pozwala obcej osobie podnieść scaffold (baza + procesy) bez domysłów spoza repo.

---

## MILESTONE — Fundament monorepo gotowy

**Opis:** Bramka po Fazie 1. Duży skok: repo ma docelowy układ procesów, lokalną bazę, startujące szkielety oraz model pod dalsze fazy. Wolno wchodzić w pipeline bez przebudowy monorepo.

**DoD (milestone):**

- Faza 1 ma status `WYKONANY` (lub wszystkie jej obowiązkowe DoD kroków są spełnione).
- Trzy lokalizacje procesów istnieją; `api` i `worker` działają lokalnie; stub `web` istnieje.
- Model danych startowy i kontrakty typów wystarczają na start Fazy 2.
- Prowadzący prace akceptuje przejście do Fazy 2.

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Faza 2 — Pipeline spotkania

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Ścieżka od mockowego źródła do zwalidowanego, trwale zapisanego streszczenia: job w workerze, redakcja przed wywołaniem portu LLM, fail-closed, idempotencja, enqueue z `api`. Zgodnie z `docs/data_flow.md`, `SPEC-PIPELINE`, `SPEC-LLM`, `SPEC-KOMUNIKACJA` (kontrakt joba / źródła).

**DoD (faza):**

- Happy path kończy się statusem sukcesu z trwałym transcriptem, summary i zadaniami po walidacji kontraktu wyniku.
- Ponowne przetworzenie tego samego klucza nie tworzy drugiego spotkania.
- Niepoprawny wynik modelu nie staje się kanonicznym summary.
- Redakcja E+T+P+K jest przed wywołaniem portu LLM; demo lokalne jest opisane i działa.
- Enqueue pochodzi ze ścieżki `api` (nie „dla UI” z workera).

### Krok 2.1 — Port źródła i atrapa materiałów

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Port pobrania spotkania + atrapa (fixture PL z wtrąceniami EN). Obiekt summary vendora **ignorowany** — kanon powstaje u nas (`docs/llm_i_asystent.md`, `SPEC-PIPELINE`).

**DoD (krok):**

- Da się pobrać materiał mockowy po kluczu zewnętrznym / fixture.
- Ścieżka nie opiera się na `summary.*` vendora jako źródle prawdy.

### Krok 2.2 — Orkiestracja joba `meeting.process`

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Sekwencja: fetch → normalize → redact (E+T+P+K) → summarize (port LlmClient, mock UC1) → walidacja wyniku → persist. Statusy: `pending` → `processing` → `completed` | `failed`. Zakaz trwałego zapisu transcript/summary przed wywołaniem LlmClient (`SPEC-PIPELINE`).

**DoD (krok):**

- Happy path prowadzi do `completed` z kanonicznymi artefaktami po walidacji.
- Awaria / przerwanie przed akceptacją wyniku nie zostawia „pół-sukcesu” kanonicznego w DB.
- Statusy są obserwowalne dla późniejszego API / SSE (Faza 3).

#### Podkrok 2.2.1 — Redakcja E+T+P+K przed LLM

Czysta ścieżka redakcji wywołana przed każdym wywołaniem portu summarizera.

#### Podkrok 2.2.2 — Walidacja wyniku i persist po akceptacji

Fail-closed: niepoprawny kształt → retry wg normy, potem `failed` / quarantine; bez dirty summary jako sukcesu.

### Krok 2.3 — Idempotencja i enqueue z `api`

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Klucz idempotencji (`externalMeetingId` / `fixtureKey`) — update in place. Enqueue joba z `api` (CLI/demo DX może istnieć jako dodatkowa ścieżka). Worker tylko konsumuje.

**DoD (krok):**

- Dwukrotne odpalenie tego samego klucza = jedno spotkanie.
- Enqueue jest osiągalny ze ścieżki `api` zgodnie z `SPEC-KOMUNIKACJA` / `SPEC-PIPELINE`.

### Krok 2.4 — Testy redakcji i demo przepuszczenia spotkania

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Unit testy redakcji E+T+P+K oraz opisane w README demo przepuszczenia przykładowego spotkania na lokalnym Compose + fixture.

**DoD (krok):**

- Testy redakcji przechodzą.
- Demo opisane w README działa na lokalnym środowisku z Fazą 1.

---

## MILESTONE — Pipeline etapu 0 działa

**Opis:** Bramka po Fazie 2. Duży skok: asynchroniczna ścieżka mock → redakcja → mock LLM → walidacja → persist jest domknięta i idempotentna. Wolno budować warstwę sesji i odczytu pod UI.

**DoD (milestone):**

- Faza 2 ma status `WYKONANY`.
- Spełnione: happy path, idempotencja, fail-closed na wyniku, redakcja przed LLM, demo lokalne.
- Statusy przetwarzania są gotowe pod kontrakt odczytu / SSE w Fazie 3.
- Prowadzący prace akceptuje przejście do Fazy 3.

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Faza 3 — Auth, ACL i kontrakty API pod UI

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Prawdziwa sesja pracownika, ACL na odczycie spotkań, demo enqueue oraz SSE statusów — wyłącznie po stronie `api`. Zgodnie z `SPEC-AUTH_I_ACL`, `SPEC-KOMUNIKACJA`, `SPEC-TESTY`. **Poza tym majorem:** implementacja UI, BFF, layoutu sidebara i zachowań przeglądarki (osobny major frontu).

**DoD (faza):**

- Sesja oparta o cookie HttpOnly (bez trzymania sekretów sesji w storage przeglądarki po stronie kontraktu API/BFF opisanego w docs).
- Lista i detail respektują ACL; brak uprawnień → brak wycieku istnienia zasobu (404).
- Zalogowany użytkownik może enqueue’ować demo; SSE / status pipeline jest dostępny przy tym samym ACL co detail.
- Testy krytyczne auth/ACL (tabela przypadków) przechodzą w zakresie opisanym w `SPEC-TESTY`.
- Powierzchnia HTTP potrzebna majorowi frontu jest domknięta opisowo (auth, meetings, demo, events).

### Krok 3.1 — Auth pracowników i sesja

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Register / login / logout / me / refresh; hasła hashowane; access + refresh (hash refresh w DB); cookie HttpOnly. Rejestracja v1 otwarta; po register od razu sesja — `SPEC-AUTH_I_ACL`.

**DoD (krok):**

- Ścieżki auth zachowują się zgodnie z normą SPEC (w tym rotacja / unieważnienie refresh).
- Nie da się uznać sesji za „atrapę na zawsze”: model jest produkcyjnie sensowny dla etapu 0.

### Krok 3.2 — ACL i odczyt spotkań

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Moduł / serwis `access`: uczestnik **lub** membership projektu/klienta **lub** admin. `GET /meetings` (paginacja limit ∈ {10,25,50,100} + page) oraz `GET /meetings/:id`. Deny → **404**.

**DoD (krok):**

- Nie da się pobrać cudzego spotkania zgadnięciem ID przy ważnej sesji obcego użytkownika (404).
- Lista zwraca wyłącznie spotkania dozwolone regułami ACL.

### Krok 3.3 — Demo enqueue i SSE statusów

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** `POST /demo/run-meeting` — sesja wymagana; tylko enqueue (bez synchronicznego pipeline w requeście; bez wymogu flagi `DEMO_ENABLED` w kontrakcie). `GET /meetings/:id/events` — SSE statusów pipeline z ACL jak detail (`SPEC-KOMUNIKACJA`).

**DoD (krok):**

- Demo endpoint enqueue’uje job przy ważnej sesji.
- SSE / równoważny strumień statusów jest dostępny tylko przy uprawnieniu do spotkania.

### Krok 3.4 — Testy auth/ACL (i SSE w miarę czasu)

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Testy tabeli ACL (`SPEC-TESTY`), auth cookie + deny→404, demo enqueue; SSE wg dostępnego czasu. Opcjonalnie zapis `audit_log` przy deny / fail joba (`SPEC-OBSERVABILITY`) — dogrywka tu lub w Fazie 5.

**DoD (krok):**

- Testy ACL (tabela przypadków) przechodzą.
- Krytyczna ścieżka auth + deny→404 jest pokryta testami.
- Luki świadomie odłożone (np. pełne SSE / audit) są nazwane, nie ukryte.

#### Podkrok 3.4.1 — (Opcjonalnie) zapis `audit_log` przy deny / fail

Trwały ślad kluczowych odmów i faili joba bez treści transcriptu — jeśli czas; inaczej jawnie w Fazie 5.

---

## MILESTONE — API sesji i ACL gotowe pod front

**Opis:** Bramka po Fazie 3. Duży skok: zaufana warstwa `api` oferuje sesję, ACL, demo i statusy pod spięcie z majorem frontu. UI nadal poza tym plikiem.

**DoD (milestone):**

- Faza 3 ma status `WYKONANY`.
- Auth cookie, ACL+404, demo enqueue oraz odczyt statusów (SSE lub równoważnie udokumentowany) działają.
- Kontrakty HTTP potrzebne `docs/frontend.md` / `SPEC-FRONTEND` są spełnione po stronie `api`.
- Prowadzący prace akceptuje przejście do Fazy 4 (oraz równoległy / kolejny major frontu nie blokuje CI i Części A).

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Faza 4 — Część A + CI

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Dokument decyzyjny Części A (≤5 stron) **skondensowany z istniejących `docs/`** oraz bramka CI zgodna z `docs/deployment.md` / `SPEC-TESTY` (testy na PR, ręczny dispatch, opis ochrony `main`).

**DoD (faza):**

- Część A jest w repo (Markdown lub PDF), ≤5 stron, spójna z `docs/` (architektura, koszty, RODO, plan etapów, przepływy).
- CI odpala testy na pull request; istnieje ścieżka ręcznego uruchomienia.
- README opisuje ochronę gałęzi głównej (ustawienie po stronie hostingu gita).

### Krok 4.1 — Dokument Części A

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Odpowiedzi na punkty briefu językiem dla decydenta; diagram przepływu i failure modes (skrót z `data_flow.md`); koszty ≥2 wariantów (~300 h/mies.) z `koszty_i_warianty.md`; środowiska (fixtures, brak prawdziwych nagrań, mocki); plan wdrożenia + metryki; ryzyka i pytania do firmy.

**DoD (krok):**

- Dokument A ≤5 stron, bez sprzeczności z `docs/`.
- Zawiera warianty kosztów i skrót etapów wdrożenia.

### Krok 4.2 — CI i ochrona gałęzi głównej

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Automatyczne testy na PR (w rozsądnym zakresie z bazą testową); workflow uruchamiany ręcznie; opis blokady bezpośrednich pushy na `main` w README + checklista ustawień.

**DoD (krok):**

- PR uruchamia testy.
- Istnieje manualny dispatch.
- README zawiera opis ochrony `main`.

---

## MILESTONE — Dokument A i bramka CI

**Opis:** Bramka po Fazie 4. Duży skok: oddanie ma warstwę decyzyjną (Część A) oraz automatyczną bramkę jakości na PR.

**DoD (milestone):**

- Faza 4 ma status `WYKONANY`.
- Część A w repo; CI na PR; opis ochrony `main` w README.
- Prowadzący prace akceptuje przejście do Fazy 5.

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Faza 5 — Domknięcie oddania (backend / etap 0)

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Czytelne oddanie backendowej części etapu 0: kompletny root README, domknięcie testów krytycznych, smoke na czystym clone, świadome cięcia zakresu. Kryteria „etap 0 działa” z `docs/plan_wdrozenia_etapy.md` w części backendowej; pełny panel UI weryfikowany w majorze frontu.

**DoD (faza):**

- Must-have backendu etapu 0: model, pipeline, redakcja+testy, ACL+testy, auth sesji, uruchomienie lokalne + demo — spełnione.
- Root README bez TODO-placeholderów wymaganych na oddanie; wskazuje Część A i opisuje atrapy / użycie AI.
- Smoke end-to-end (Compose + procesy + demo) działa komendami opisanymi w README.
- Świadomy zakres (brak prawdziwego Google/Fireflies/LLM; UC2 poza v1; UI = osobny major) jest zapisany w README.

### Krok 5.1 — Root README oddania

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Uruchomienie całości, co działa / atrapa / czego nie ma i dlaczego, użycie AI, wskazanie Części A — zgodnie z `docs/plan_wdrozenia_etapy.md` (wymagania oddania w root README, nie w `docs/README.md`).

**DoD (krok):**

- Sekcje oddania są kompletne i zgodne z faktycznym stanem repo.
- Brak wymaganych placeholderów „do uzupełnienia” w sekcjach oddania.

### Krok 5.2 — Domknięcie testów krytycznych i porządki

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Dopięcie luk testowych (ACL, redakcja, walidacja wyniku, idempotencja, auth cookie; SSE/audit jeśli luka); usunięcie martwego kodu i tajemnic z repo.

**DoD (krok):**

- Krytyczne scenariusze backendu z `SPEC-TESTY` / docs mają zielone testy albo jawną, świadomą listę odpuszczonych pozycji w README.
- Brak oczywistych sekretów i dead code blokującego czytelność oddania.

### Krok 5.3 — Smoke end-to-end i świadomy zakres

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Sprawdzenie „jedna lub kilka komend” na czystym clone; przeczytanie Części A jak decydent; lista odpuszczonych rzeczy w README (i ewentualnie w A). Koordynacja z majorem frontu: UI (login, tabela, Test, SSE, mock search) **nie** jest DoD tego kroku — tylko wzmianka / checklista zależności.

**DoD (krok):**

- Czysty clone + instrukcja README prowadzi do działającego dema backendowego.
- Lista cięć / atrap jest jawna.
- Zależność od majoru frontu (dla pełnego kryterium UI etapu 0) jest nazwana, bez udawania że UI domknięto tutaj.

---

## MILESTONE — Backend etapu 0 gotowy do oddania

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

- Pełna implementacja `apps/web` (BFF, sidebar, tabela+Test+SSE w UI, mock wyszukiwarki) — **osobny major frontu**.
- Prawdziwy Google Workspace / Fireflies / LLM; UC2 / RAG; Playwright jako must-have; HTTP odczytu `audit_log`; konta klientów zewnętrznych — poza etapem 0 (`docs/dokumentacja_koncepcyjna.md`, `docs/plan_wdrozenia_etapy.md`).
- Etapy wdrożenia firmowego 1–3 — poza tym planem prac kodu oddania.

## Mapowanie obszarów SPEC → fazy (ślad)

| Obszar SPEC | Fazy (ten major) |
|-------------|------------------|
| `SPEC-ARCHITEKTURA`, `SPEC-DANE` | 1 |
| `SPEC-PIPELINE`, `SPEC-LLM`, częściowo `SPEC-KOMUNIKACJA` (job / źródło) | 2 |
| `SPEC-AUTH_I_ACL`, `SPEC-KOMUNIKACJA` (HTTP/SSE/demo), `SPEC-TESTY`, opcjonalnie `SPEC-OBSERVABILITY` | 3 |
| `SPEC-TESTY` / `docs/deployment.md` (CI), docs pod Część A | 4 |
| Domknięcie vs `SPEC-TESTY` + kryteria etapu 0 | 5 |
| `SPEC-FRONTEND` | poza tym plikiem (major frontu); Faza 1 tylko stub struktury |
