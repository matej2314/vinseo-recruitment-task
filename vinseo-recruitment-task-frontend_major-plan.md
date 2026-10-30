# Vinseo Recruitment Task - major plan (frontend)

**Zakres tego pliku:** major plan prac nad **frontendem** etapu 0 - warstwa `apps/web` (UI v1 + cienki BFF) zgodnie z `docs/frontend.md` i `SPEC-FRONTEND`.

**Powiązany major backendu:** [`vinseo-recruitment-task-backend_major-plan.md`](./vinseo-recruitment-task-backend_major-plan.md). Oba pliki razem opisują postęp etapu 0; statusy prowadzi się **osobno** w każdym pliku.

**Fundament i szkielety procesów:** utworzenie struktury całego monorepo, środowisk danych, szkieletów `api` / `worker` oraz **stubu** `web` jest opisane w **Fazie 1** majoru backendu. **Ten major nie powiela** tej treści - Faza 1 poniżej to odbiór gotowości stubu i start rozbudowy UI.

**Źródła:** `docs/` oraz `spec/SPEC-*.md` (szczególnie `docs/frontend.md`, `SPEC-FRONTEND`, `SPEC-KOMUNIKACJA`, `SPEC-AUTH_I_ACL`, `SPEC-TESTY`).  
**Etap produktowy:** szkielet / etap 0 - `docs/plan_wdrozenia_etapy.md`.

**Statusy (fazy / kroki):** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`  
**Milestone:** domyślnie **bez statusu**; po spełnieniu DoD → wyłącznie `OSIĄGNIĘTY`

**Kalendarz roboczy (orientacyjnie):** jedna faza ≈ jeden dzień roboczy; synchronizacja z numeracją faz majoru backendu (ten sam dzień kalendarza).

---

## Faza 1 - Odbiór fundamentu i stubu `web`

**Status:** `WYKONANY`

**Opis:** Potwierdzenie, że po **Fazie 1 majoru backendu** stub `apps/web` i układ monorepo pozwalają bezpiecznie rozbudować UI v1 - bez ponownego tworzenia struktury repo, workspaces ani szkieletów `api`/`worker`. Mapowanie widoków i granic BFF względem `api` według docs/SPEC.

**DoD (faza):**

- MILESTONE „Fundament monorepo gotowy” (lub równoważny stan Fazy 1) majoru backendu jest osiągnięty / Faza 1 backendu domknięta w zakresie stubu `web`.
- Stub `web` startuje lokalnie; trasy-placeholdery pod auth / dashboard / BFF są rozpoznawalne.
- Zespół frontu ma jasną mapę widoków v1 i zakazów (brak ACL w UI, brak detail page) zgodną z `docs/frontend.md` / `SPEC-FRONTEND`.
- Nie ma potrzeby przebudowy monorepo, żeby wejść w Fazę 2 tego planu.

### Krok 1.1 - Potwierdzenie gotowości stubu po fundamencie backendu

**Status:** `WYKONANY`

**Opis:** Sprawdzenie, że lokalizacja i minimalny start `apps/web` z Fazy 1 majoru backendu są wystarczające jako baza pod UI v1. Ewentualne drobne doprecyzowanie placeholderów tras **w obrębie istniejącego stubu** - bez powielania prac monorepo.

**DoD (krok):**

- Stub `web` jest uruchamialny w tym samym układzie repo co opisano w majorze backendu.
- Brak blokady „najpierw trzeba przebudować drzewo monorepo”.

### Krok 1.2 - Mapa widoków v1 i granic BFF

**Status:** `WYKONANY`

**Opis:** Ustalenie (opisowo, względem docs/SPEC): `/` auth, layout ze sidebarem (domyślny vs wyszukiwarka), brak trasy detail UI, rola BFF jako proxy (cookie, bez ACL, bez bezpośredniego enqueue kolejki).

**DoD (krok):**

- Mapa widoków i granic jest zgodna z `docs/frontend.md` / `SPEC-FRONTEND` / `SPEC-KOMUNIKACJA`.
- Świadomie poza v1 UI (pełny panel, admin erase / ręczne przypisanie klienta, Q&A, Playwright must-have itd.) jest nazwane.

### Krok 1.3 - Gotowość warstwy web do rozbudowy

**Status:** `WYKONANY`

**Opis:** Warstwa web w stubie jest gotowa na dodanie layoutu roboczego i handlerów BFF w kolejnych fazach (zależności UI w obrębie istniejącej aplikacji web - bez ruszania fundamentu opisanego w majorze backendu).

**DoD (krok):**

- Da się kontynuować prace UI w `apps/web` bez otwierania na nowo Fazy 1 backendu.
- Wspólne kontrakty typów z pakietu monorepo (jeśli potrzebne pod BFF) są dostępne jako efekt fundamentu backendu.

---

## MILESTONE - Stub web zaakceptowany pod UI v1

**Status:** `OSIĄGNIĘTY`

**Opis:** Bramka po Fazie 1. Duży skok: front startuje od **odbioru** fundamentu backendu, nie od budowy monorepo. Wolno rysować szkielet powierzchni UI/BFF.

**DoD (milestone):**

- Faza 1 ma status `WYKONANY`.
- Stub `web` i mapa widoków v1 są zaakceptowane.
- Powiązanie z Fazą 1 majoru backendu jest spełnione (fundament nie jest tu powielany).
- Prowadzący prace akceptuje przejście do Fazy 2.

---

## Faza 2 - Szkielet powierzchni UI i BFF

**Status:** `WYKONANY`

**Opis:** Przygotowanie szkieletu widoków i cienkiego BFF **pod** późniejsze spięcie z gotowym API (Faza 3 backendu / Faza 3 tego planu). Równolegle do pipeline’u w majorze backendu - bez implementacji pełnej ścieżki Test+SSE na żywym jobie, jeśli API jeszcze nie jest gotowe. Zgodnie z kierunkiem `docs/frontend.md` (layout roboczy, bez brandingu produktowego).

**DoD (faza):**

- Istnieją placeholdery: auth, layout ze sidebarem, widok domyślny, wyszukiwarka.
- Szkielet BFF obejmuje miejsca na proxy auth / meetings / demo / SSE - bez egzekucji ACL i bez omijania `api`.
- Bazowy layout roboczy jest czytelny i gotowy do podpięcia danych w Fazie 3.
- Faza 3 nie zaczyna się od pustego stubu tras.

### Krok 2.1 - Placeholdery auth, sidebar i widoków

**Status:** `WYKONANY`

**Opis:** Szkielet `/` (przełączanie login/register), layout po „zalogowaniu” (nawet atrapowo) z sidebarem: widok domyślny (miejsce na tabelę + Test) oraz podstrona wyszukiwarki.

**DoD (krok):**

- Nawigacja między placeholderami sidebar działa.
- Brak osobnej trasy detail UI jako głównej ścieżki produktu v1.

### Krok 2.2 - Szkielet BFF (proxy)

**Status:** `WYKONANY`

**Opis:** Placeholdery Route Handlers pod auth, meetings, demo i SSE. BFF ma pozostać cienkim proxy: cookie HttpOnly, **bez** reguł ACL, **bez** bezpośredniego sterowania kolejką / pipeline.

**DoD (krok):**

- Mapa handlerów BFF odpowiada kontraktom z `SPEC-KOMUNIKACJA` / `docs/dokumentacja_komunikacji.md` na poziomie powierzchni.
- Zakazy BFF (ACL, enqueue poza wywołaniem `api`) są respektowane w opisie i szkielecie.

### Krok 2.3 - Bazowy layout roboczy

**Status:** `WYKONANY`

**Opis:** Prosty, czytelny układ roboczy (bez brandingu produktowego) pod formularz auth, tabelę i mock wyszukiwarki - zgodnie z docs (komponenty UI jako środki, nie cel sam w sobie).

**DoD (krok):**

- Layout nie blokuje kolejnego podpięcia interakcji (formularz, select limitu, Test, strumień statusów).
- Nie wprowadza wymagań spoza v1 (dark mode, PWA, pełny design system).

---

## MILESTONE - Szkielet UI/BFF gotowy do spięcia z API

**Status:** `OSIĄGNIĘTY`

**Opis:** Bramka po Fazie 2. Duży skok: powierzchnia frontu istnieje; brakuje żywego spięcia z sesją, ACL i demo po stronie `api`.

**DoD (milestone):**

- Faza 2 ma status `WYKONANY`.
- Placeholdery widoków i BFF są na miejscu.
- Kolejny krok to integracja z API (Faza 3), nie przebudowa layoutu od zera.
- Prowadzący prace akceptuje przejście do Fazy 3 **pod warunkiem** gotowości powierzchni API z majoru backendu (Faza 3 / odpowiadający MILESTONE).

---

## Faza 3 - UI v1: sesja, tabela + Test + SSE, mock wyszukiwarki

**Status:** `WYKONANY`

**Opis:** Domknięcie minimalnego panelu etapu 0: auth z cookie przez BFF, dashboard z tabelą i paginacją, przycisk Test z aktualizacją wiersza przez SSE, mock wyszukiwarki. **Zależność:** MILESTONE „API sesji i ACL gotowe pod front” (lub równoważny stan Fazy 3) w [`vinseo-recruitment-task-backend_major-plan.md`](./vinseo-recruitment-task-backend_major-plan.md). Norma: `SPEC-FRONTEND`, przepływ Test: `docs/data_flow.md`.

**DoD (faza):**

- Niezalogowany użytkownik na chronionych trasach trafia na `/`; po login/register - dashboard.
- `/` startuje w trybie login; klasyczny UX auth (CTA, linki tekstowe, `passwordConfirm` + match w UI) zgodnie z `SPEC-FRONTEND`.
- Sesja wyłącznie przez cookie HttpOnly (brak sekretów sesji w Web Storage).
- BFF `POST /api/auth/register`: match `passwordConfirm` przed proxy; mismatch → 400 bez wołania API; przy OK strip do `{ email, password }` (`SPEC-KOMUNIKACJA` K-6a).
- Tabela listuje spotkania z API (już po ACL); limity 10/25/50/100 + `page`.
- Test enqueue’uje demo; SSE aktualizuje wiersz bez zmiany trasy; `failed` pokazuje status + komunikat.
- Wyszukiwarka to jawny mock bez wołań LLM/search.
- BFF nie egzekwuje ACL.

### Krok 3.1 - Auth UI i ochrona tras

**Status:** `WYKONANY`

**Opis:** Formularz login/register - klasyczny UX (jeden wspólny komponent). Doprecyzowanie względem: **Faza 2 / Krok 2.1** (WYKONANY; szkielet „przełączanie login/register”). Obowiązuje: tryb startowy **login**; CTA „Zaloguj się” / „Zarejestruj się”; pod formularzem linki tekstowe „Nie masz konta? Zarejestruj się!” / „Masz już konto? Zaloguj się!”; w register pole powtórz hasło (`passwordConfirm`) z **wymaganą** walidacją zgodności w UI przed submitem. Sukces → cookie przez BFF → redirect na dashboard. Brak sesji → redirect na `/`. Wylogowanie przez BFF/API.

**DoD (krok):**

- Ścieżka auth UI działa end-to-end względem API sesji z majoru backendu.
- Obserwowalne: start w trybie login; CTA i linki tekstowe zgodne z `SPEC-FRONTEND` F-1; przy mismatch haseł w register UI nie wysyła submitu.
- Brak przechowywania access/refresh w `localStorage` / `sessionStorage`.

### Krok 3.2 - BFF register + `passwordConfirm`

**Status:** `WYKONANY`

**Opis:** Egzekucja kontraktu BFF dla `POST /api/auth/register` wg `SPEC-KOMUNIKACJA` K-6a / `docs/dokumentacja_komunikacji.md`: ciało z `email`, `password`, `passwordConfirm`; przed proxy sprawdzenie match; mismatch → HTTP 400 + envelope walidacji **bez** wołania Nest; przy OK proxy wyłącznie `{ email, password }` (`passwordConfirm` nie trafia do API). Login BFF bez `passwordConfirm`.

**DoD (krok):**

- Mismatch na BFF → 400, brak requestu do `POST /auth/register`.
- Sukces BFF register → API dostaje tylko `{ email, password }`.
- Zakazy BFF (ACL, enqueue poza wywołaniem `api`) nadal respektowane - wyjątek wyłącznie UI-only `passwordConfirm`.

### Krok 3.3 - Dashboard: sidebar, tabela, paginacja

**Status:** `WYKONANY`

**Opis:** Sidebar: widok domyślny vs wyszukiwarka. Tabela z listy API; select limitu ∈ {10,25,50,100} oraz `page`. Bez osobnej strony detail jako głównej nawigacji po wyniku pipeline.

**DoD (krok):**

- Lista odzwierciedla dane dozwolone przez ACL po stronie `api` (UI nie „dopuszcza po ID”).
- Paginacja wysyła wymagane parametry do API przez BFF.

### Krok 3.4 - Test, SSE i aktualizacja wiersza

**Status:** `WYKONANY`

**Opis:** Przycisk Test zawsze widoczny po zalogowaniu → BFF → demo enqueue → otwarcie SSE dla `meetingId` → użytkownik zostaje na widoku; wiersz aktualizuje status (`pending` → `processing` → `completed` | `failed`) i po sukcesie skrót summary/zadań.

**DoD (krok):**

- Ścieżka Test + SSE działa zgodnie z `SPEC-FRONTEND` / `docs/data_flow.md`.
- Brak redirectu na detail po Test.

### Krok 3.5 - Mock wyszukiwarki i domknięcie bezpieczeństwa UI

**Status:** `WYKONANY`

**Opis:** Podstrona wyszukiwarki z hardcodowanym mockiem i adnotacją atrapy; zakaz LLM/search/RAG. Brak wrażliwych sekretów w bundlu klienta; na prod bez logowania pełnego transcriptu w konsoli.

**DoD (krok):**

- Wyszukiwarka nie woła zabronionych API.
- Kryteria bezpieczeństwa UI z `SPEC-FRONTEND` są spełnione w zakresie v1.

---

## MILESTONE - Panel v1 działa z API

**Status:** `OSIĄGNIĘTY`

**Opis:** Bramka po Fazie 3. Duży skok: minimalny front etapu 0 jest używalny ze spiętym backendem (sesja, lista, Test, statusy).

**DoD (milestone):**

- Faza 3 ma status `WYKONANY`.
- Spełnione kryteria akceptacji UI v1 z `SPEC-FRONTEND` (auth, sidebar, Test+SSE, mock search, limity, brak sekretów w Web Storage).
- Zależność od Fazy 3 majoru backendu jest domknięta.
- Prowadzący prace akceptuje przejście do Fazy 4.

---

## Faza 3.5 - UI Test pod nowy kontrakt DEMO (multi-tester)

**Status:** `WYKONANY`

**Opis:** Domknięcie ścieżki użytkownika **Test** pod zaktualizowany kontrakt DEMO/Test (UUID runu, multi-tester, rosnąca lista, bez wyboru fixture w UI) - `SPEC-FRONTEND` F-7/F-8, `docs/frontend.md`.

**Refaktor / zmiana kontraktu względem:** Faza 3 / Krok 3.4 - Test, SSE i aktualizacja wiersza (`WYKONANY`); MILESTONE „Panel v1 działa z API” (`OSIĄGNIĘTY`) - **bez przepisywania** treści źródeł. **Zależność:** Faza **3.5** majoru backendu (tożsamość DEMO/Test) - [`vinseo-recruitment-task-backend_major-plan.md`](./vinseo-recruitment-task-backend_major-plan.md).

**DoD (faza):**

- Po Test: `meetingId` z odpowiedzi = własne spotkanie sesji; SSE/ACL bez współdzielonego globalnego wiersza dema między kontami.
- Ponowny Test dokłada kolejny wiersz (lista może rosnąć); brak UI wyboru fixture.
- Zachowanie zgodne z API po Fazie 3.5 backendu.
- Po reloadzie widoku spotkań wiersze `completed` / `failed` nadal pokazują kompletny podgląd wyniku (Krok 3.5.3).

### Krok 3.5.1 - Test + SSE przy UUID runu i rosnącej liście

**Status:** `WYKONANY`

**Opis:** UI po `POST` demo traktuje każdy sukces jako własny `meetingId`; otwiera SSE dla tego id; tabela aktualizuje / dokłada wiersz; ponowny Test = kolejny wiersz. Bez selektora fixture.

**DoD (krok):**

- Multi-tester (różne sesje) widzi tylko własne runy dema w ACL listy.
- Brak założenia jednego globalnego wiersza dema w UI.

### Krok 3.5.2 - Spójność z kontraktem API dema (Faza 3.5 backend)

**Status:** `WYKONANY`

**Opis:** Weryfikacja, że BFF/UI nie wymuszają starego kontraktu (np. współdzielonego `fixtureKey` jako tożsamości); zależność od backend Fazy 3.5 jest jawna w DoD oddania tej fazy.

**DoD (krok):**

- Ścieżka Test działa na żywym API po kontrakcie K-5; brak regresji względem Fazy 3 UI poza zamierzonym kontraktem dema.

### Krok 3.5.3 - Kompletny wiersz tabeli po liście i reloadzie (`summary` / błąd)

**Status:** `WYKONANY`

**Opis:** Poprawka widoku domyślnego (`/meetings`): kolumna **Podsumowanie / błąd** oraz pełny podgląd wyniku w wierszu nie znikają po odświeżeniu strony. UI buduje skrót / komunikat z pól listy (`summary`, `failureReason`) oraz z SSE — bez polegania wyłącznie na stanie ephemeralnym z EventSource.

**Refaktor względem:** Faza 3 / Krok 3.4 — Test, SSE i aktualizacja wiersza (`WYKONANY`). Zmiana: wcześniejsze `summaryPreview` / `failureMessage` tylko z SSE (po reloadzie `GET` listy bez mapowania wyniku → pusta kolumna) → mapowanie wiersza z kontraktu listy (K-2a / F-5) + bezpieczny merge SSE bez nadpisywania metadanych `null`ami. **Zależność kontraktowa:** backend Faza 3.5 / Krok **3.5.4** (projekcja `summary` / `failureReason` na liście i SSE).

**Zakres frontend (`apps/web`):**

- `meetings-dashboard`: `toRowView` przy loade listy; kolumna z `summaryPreview` / `failureMessage` po reloadzie.
- SSE: patch tylko pól obecnych w evencie (w tym `failureReason` przy `failed`); bez zerowania `startedAt` / organizatora itd. przy update.
- Spójność z `SPEC-FRONTEND` F-5 / F-8.7 i `docs/frontend.md` (podgląd wyniku w tabeli bez trasy detail).

**Poza tym krokiem:** BFF bez `fixtureKey` / multi-tester UUID (3.5.1–3.5.2); implementacja Nest listy (backend 3.5.4).

**DoD (krok):**

- Po `completed` / `failed` i odświeżeniu `/meetings` kolumna Podsumowanie / błąd pozostaje wypełniona (dane z `GET` listy).
- Live Test+SSE nadal aktualizuje wiersz; brak redirectu na detail.
- Brak N+1 `GET /meetings/:id` wyłącznie po to, by uzupełnić kolumnę po reloadzie.

---

## MILESTONE - UI Test multi-tester zgodny z API dema

**Status:** `OSIĄGNIĘTY`

**Opis:** Bramka po Fazie 3.5 frontu. Przycisk Test respektuje nowy kontrakt DEMO; kilku użytkowników na jednej instancji nie koliduje w widoku.

**DoD (milestone):**

- Faza 3.5 (ten major) ma status `WYKONANY`.
- Zależność od Fazy 3.5 majoru backendu jest domknięta.
- Kryteria F-7/F-8 (`SPEC-FRONTEND`) dla multi-tester / rosnącej listy są spełnione.

---

## Faza 4 - Wkład frontu w bramkę jakości / oddanie

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Udział warstwy `web` w bramce jakości oddania: smoke build / typecheck zgodnie z `SPEC-TESTY` / `docs/testy.md`. **Część A** (dokument ≤5 stron) i główna konfiguracja CI PR dla backendu pozostają we **Fazie 4 majoru backendu** - tu bez przepisywania dokumentu A.

**DoD (faza):**

- Smoke build / typecheck `web` przechodzi (lokalnie i/lub w CI - spójnie z ustaleniami majoru backendu).
- Opis UI w artefaktach oddania nie przeczy faktycznemu stanowi frontu (korekty wzmianek, bez dublowania Części A).
- Brak regresji „front nie buduje się”, która blokowałaby oddanie etapu 0.

### Krok 4.1 - Smoke build / typecheck warstwy web

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Domknięcie bramki jakości frontu wymaganej przez `SPEC-TESTY` (T-13 / równoważne): aplikacja web buduje się / typecheck przechodzi w zakresie uzgodnionym z CI.

**DoD (krok):**

- Smoke frontu jest zielony albo jawnie wpisany w CI z majoru backendu.
- Awaria builda web nie jest „niespodzianką” na Fazie 5.

### Krok 4.2 - Spójność opisu UI w oddaniu (bez przepisywania Części A)

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Przegląd, czy wzmianki o UI w README / skrótach oddania są zgodne z działającym panelem; właściciel dokumentu Części A = major backendu.

**DoD (krok):**

- Nie ma sprzeczności „w docs UI jest X, a w repo Y” w zakresie frontu v1.
- Część A nie jest tu tworzona od nowa.

---

## MILESTONE - Bramka jakości frontu domknięta względem CI/oddania

**Opis:** Bramka po Fazie 4. Duży skok: warstwa web nie wywraca oddania na bramce build/typecheck; opis UI jest spójny.

**DoD (milestone):**

- Faza 4 ma status `WYKONANY`.
- Smoke web jest domknięty względem CI/oddania.
- Prowadzący prace akceptuje przejście do Fazy 5.

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Faza 5 - Domknięcie UI etapu 0

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Dopieszczenie ścieżki użytkownika, smoke UI na czystym clone razem z instrukcją README (koordynacja z majorem backendu), jawna lista cięć UI. Pełne kryterium „etap 0 z panelem” z `docs/plan_wdrozenia_etapy.md` domyka się **łącznie** z majorem backendu.

**DoD (faza):**

- Ścieżka: auth → tabela → Test → aktualizacja statusu → mock search działa według docs.
- README (koordynacja z backendem) opisuje, co robi UI, co jest atrapą i czego świadomie nie ma.
- Smoke na czystym clone obejmuje start `web` obok procesów z majoru backendu.
- Playwright / pełny panel / prawdziwa wyszukiwarka pozostają poza must-have - nazwane.

### Krok 5.1 - Dopieszczenie ścieżki użytkownika

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Usunięcie oczywistych dziur UX ścieżki v1 (auth, tabela, Test, SSE, mock search) bez rozszerzania zakresu poza `SPEC-FRONTEND`.

**DoD (krok):**

- Krytyczna ścieżka użytkownika jest przechodnia bez „dziur” blokujących demo UI.
- Brak ukrywania Test za flagą UI.

### Krok 5.2 - Smoke UI na czystym clone i README

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Weryfikacja uruchomienia frontu według root README; uzupełnienie sekcji UI / atrap we współpracy z majorem backendu (jeden README oddania).

**DoD (krok):**

- Czysty clone + README prowadzi do działającego minimalnego panelu (przy założeniu działającego API z majoru backendu).
- Sekcja UI w README jest kompletna względem faktycznego stanu.

### Krok 5.3 - Świadome cięcia i checklista zależności od backendu

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Lista odpuszczonych rzeczy UI; checklista: co musi być `WYKONANY` / `OSIĄGNIĘTY` w majorze backendu, żeby uznać pełny etap 0 z panelem.

**DoD (krok):**

- Cięcia UI są jawne w README (lub równoważnie w oddaniu).
- Zależność od majoru backendu jest nazwana (nie udajemy, że sam front = cały etap 0).

---

## MILESTONE - Frontend etapu 0 gotowy do oddania

**Opis:** Bramka zamykająca ten major. Duży skok: UI v1 + BFF są oddawalne. Pełne oddanie etapu 0 wymaga także domknięcia majoru backendu (pipeline, ACL, CI, Część A, README wspólne).

**DoD (milestone):**

- Faza 5 ma status `WYKONANY`.
- Panel v1 spełnia must-have UI z `docs/frontend.md` / `SPEC-FRONTEND` / kryteriów etapu 0 dotyczących frontu.
- Smoke web i opis UI w oddaniu są kompletne.
- Prowadzący prace uznaje frontend za gotowy; pełne oddanie etapu 0 = ten MILESTONE **oraz** zamykający MILESTONE majoru backendu (lub jawny zapis w README, jeśli UI domknięte wcześniej niż backend).

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Poza zakresem tego major planu

- Fundament monorepo, Prisma, `api`, `worker`, pipeline, ACL po stronie `api`, Część A, główne CI backendu - [`vinseo-recruitment-task-backend_major-plan.md`](./vinseo-recruitment-task-backend_major-plan.md).
- Pełny panel produktowy (w tym erase treści), branding, Q&A UI, Playwright must-have, prawdziwa wyszukiwarka/RAG, detail page jako główna ścieżka - poza v1 (`docs/frontend.md`).

## Mapowanie SPEC → fazy (ślad)

| Obszar | Fazy (ten major) |
|--------|------------------|
| Odbiór fundamentu (bez powielania) | 1 ← backend Faza 1 |
| Szkielet UI/BFF | 2 |
| `SPEC-FRONTEND` + spięcie z `SPEC-KOMUNIKACJA` / auth | 3 ← zależy od backend Faza 3 |
| `SPEC-FRONTEND` F-7/F-8 + DEMO/Test multi-tester (K-5) | 3.5 ← zależy od backend Faza 3.5 |
| `SPEC-TESTY` (smoke web) | 4 |
| Domknięcie UI etapu 0 | 5 |

## Synchronizacja z majorem backendu (skrót)

| Faza (dzień) | Backend | Frontend (ten plik) |
|--------------|---------|---------------------|
| 1 | Fundament monorepo + stub `web` | Odbiór stubu; mapa widoków |
| 2 | Pipeline | Szkielet UI/BFF |
| 3 | Auth, ACL, API, SSE | UI v1 na żywym API |
| 3.5 | DEMO/Test multi-tester (UUID, katalog 10) | UI Test pod nowy kontrakt dema |
| 4 | Część A + CI | Smoke web / spójność opisu UI |
| 5 | Domknięcie backendu / oddanie | Domknięcie UI / oddanie |
