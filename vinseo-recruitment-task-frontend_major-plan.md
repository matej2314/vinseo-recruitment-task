# Vinseo Recruitment Task — major plan (frontend)

**Zakres tego pliku:** major plan prac nad **frontendem** etapu 0 — warstwa `apps/web` (UI v1 + cienki BFF) zgodnie z `docs/frontend.md` i `SPEC-FRONTEND`.

**Powiązany major backendu:** [`vinseo-recruitment-task-backend_major-plan.md`](./vinseo-recruitment-task-backend_major-plan.md). Oba pliki razem opisują postęp etapu 0; statusy prowadzi się **osobno** w każdym pliku.

**Fundament i szkielety procesów:** utworzenie struktury całego monorepo, środowisk danych, szkieletów `api` / `worker` oraz **stubu** `web` jest opisane w **Fazie 1** majoru backendu. **Ten major nie powiela** tej treści — Faza 1 poniżej to odbiór gotowości stubu i start rozbudowy UI.

**Źródła:** `docs/` oraz `spec/SPEC-*.md` (szczególnie `docs/frontend.md`, `SPEC-FRONTEND`, `SPEC-KOMUNIKACJA`, `SPEC-AUTH_I_ACL`, `SPEC-TESTY`).  
**Etap produktowy:** szkielet / etap 0 — `docs/plan_wdrozenia_etapy.md`.

**Statusy (fazy / kroki):** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`  
**Milestone:** domyślnie **bez statusu**; po spełnieniu DoD → wyłącznie `OSIĄGNIĘTY`

**Kalendarz roboczy (orientacyjnie):** jedna faza ≈ jeden dzień roboczy; synchronizacja z numeracją faz majoru backendu (ten sam dzień kalendarza).

---

## Faza 1 — Odbiór fundamentu i stubu `web`

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Potwierdzenie, że po **Fazie 1 majoru backendu** stub `apps/web` i układ monorepo pozwalają bezpiecznie rozbudować UI v1 — bez ponownego tworzenia struktury repo, workspaces ani szkieletów `api`/`worker`. Mapowanie widoków i granic BFF względem `api` według docs/SPEC.

**DoD (faza):**

- MILESTONE „Fundament monorepo gotowy” (lub równoważny stan Fazy 1) majoru backendu jest osiągnięty / Faza 1 backendu domknięta w zakresie stubu `web`.
- Stub `web` startuje lokalnie; trasy-placeholdery pod auth / dashboard / BFF są rozpoznawalne.
- Zespół frontu ma jasną mapę widoków v1 i zakazów (brak ACL w UI, brak detail page) zgodną z `docs/frontend.md` / `SPEC-FRONTEND`.
- Nie ma potrzeby przebudowy monorepo, żeby wejść w Fazę 2 tego planu.

### Krok 1.1 — Potwierdzenie gotowości stubu po fundamencie backendu

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Sprawdzenie, że lokalizacja i minimalny start `apps/web` z Fazy 1 majoru backendu są wystarczające jako baza pod UI v1. Ewentualne drobne doprecyzowanie placeholderów tras **w obrębie istniejącego stubu** — bez powielania prac monorepo.

**DoD (krok):**

- Stub `web` jest uruchamialny w tym samym układzie repo co opisano w majorze backendu.
- Brak blokady „najpierw trzeba przebudować drzewo monorepo”.

### Krok 1.2 — Mapa widoków v1 i granic BFF

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Ustalenie (opisowo, względem docs/SPEC): `/` auth, layout ze sidebarem (domyślny vs wyszukiwarka), brak trasy detail UI, rola BFF jako proxy (cookie, bez ACL, bez bezpośredniego enqueue kolejki).

**DoD (krok):**

- Mapa widoków i granic jest zgodna z `docs/frontend.md` / `SPEC-FRONTEND` / `SPEC-KOMUNIKACJA`.
- Świadomie poza v1 UI (pełny panel, admin erase / ręczne przypisanie klienta, Q&A, Playwright must-have itd.) jest nazwane.

### Krok 1.3 — Gotowość warstwy web do rozbudowy

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Warstwa web w stubie jest gotowa na dodanie layoutu roboczego i handlerów BFF w kolejnych fazach (zależności UI w obrębie istniejącej aplikacji web — bez ruszania fundamentu opisanego w majorze backendu).

**DoD (krok):**

- Da się kontynuować prace UI w `apps/web` bez otwierania na nowo Fazy 1 backendu.
- Wspólne kontrakty typów z pakietu monorepo (jeśli potrzebne pod BFF) są dostępne jako efekt fundamentu backendu.

---

## MILESTONE — Stub web zaakceptowany pod UI v1

**Opis:** Bramka po Fazie 1. Duży skok: front startuje od **odbioru** fundamentu backendu, nie od budowy monorepo. Wolno rysować szkielet powierzchni UI/BFF.

**DoD (milestone):**

- Faza 1 ma status `WYKONANY`.
- Stub `web` i mapa widoków v1 są zaakceptowane.
- Powiązanie z Fazą 1 majoru backendu jest spełnione (fundament nie jest tu powielany).
- Prowadzący prace akceptuje przejście do Fazy 2.

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Faza 2 — Szkielet powierzchni UI i BFF

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Przygotowanie szkieletu widoków i cienkiego BFF **pod** późniejsze spięcie z gotowym API (Faza 3 backendu / Faza 3 tego planu). Równolegle do pipeline’u w majorze backendu — bez implementacji pełnej ścieżki Test+SSE na żywym jobie, jeśli API jeszcze nie jest gotowe. Zgodnie z kierunkiem `docs/frontend.md` (layout roboczy, bez brandingu produktowego).

**DoD (faza):**

- Istnieją placeholdery: auth, layout ze sidebarem, widok domyślny, wyszukiwarka.
- Szkielet BFF obejmuje miejsca na proxy auth / meetings / demo / SSE — bez egzekucji ACL i bez omijania `api`.
- Bazowy layout roboczy jest czytelny i gotowy do podpięcia danych w Fazie 3.
- Faza 3 nie zaczyna się od pustego stubu tras.

### Krok 2.1 — Placeholdery auth, sidebar i widoków

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Szkielet `/` (przełączanie login/register), layout po „zalogowaniu” (nawet atrapowo) z sidebarem: widok domyślny (miejsce na tabelę + Test) oraz podstrona wyszukiwarki.

**DoD (krok):**

- Nawigacja między placeholderami sidebar działa.
- Brak osobnej trasy detail UI jako głównej ścieżki produktu v1.

### Krok 2.2 — Szkielet BFF (proxy)

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Placeholdery Route Handlers pod auth, meetings, demo i SSE. BFF ma pozostać cienkim proxy: cookie HttpOnly, **bez** reguł ACL, **bez** bezpośredniego sterowania kolejką / pipeline.

**DoD (krok):**

- Mapa handlerów BFF odpowiada kontraktom z `SPEC-KOMUNIKACJA` / `docs/dokumentacja_komunikacji.md` na poziomie powierzchni.
- Zakazy BFF (ACL, enqueue poza wywołaniem `api`) są respektowane w opisie i szkielecie.

### Krok 2.3 — Bazowy layout roboczy

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Prosty, czytelny układ roboczy (bez brandingu produktowego) pod formularz auth, tabelę i mock wyszukiwarki — zgodnie z docs (komponenty UI jako środki, nie cel sam w sobie).

**DoD (krok):**

- Layout nie blokuje kolejnego podpięcia interakcji (formularz, select limitu, Test, strumień statusów).
- Nie wprowadza wymagań spoza v1 (dark mode, PWA, pełny design system).

---

## MILESTONE — Szkielet UI/BFF gotowy do spięcia z API

**Opis:** Bramka po Fazie 2. Duży skok: powierzchnia frontu istnieje; brakuje żywego spięcia z sesją, ACL i demo po stronie `api`.

**DoD (milestone):**

- Faza 2 ma status `WYKONANY`.
- Placeholdery widoków i BFF są na miejscu.
- Kolejny krok to integracja z API (Faza 3), nie przebudowa layoutu od zera.
- Prowadzący prace akceptuje przejście do Fazy 3 **pod warunkiem** gotowości powierzchni API z majoru backendu (Faza 3 / odpowiadający MILESTONE).

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Faza 3 — UI v1: sesja, tabela + Test + SSE, mock wyszukiwarki

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Domknięcie minimalnego panelu etapu 0: auth z cookie przez BFF, dashboard z tabelą i paginacją, przycisk Test z aktualizacją wiersza przez SSE, mock wyszukiwarki. **Zależność:** MILESTONE „API sesji i ACL gotowe pod front” (lub równoważny stan Fazy 3) w [`vinseo-recruitment-task-backend_major-plan.md`](./vinseo-recruitment-task-backend_major-plan.md). Norma: `SPEC-FRONTEND`, przepływ Test: `docs/data_flow.md`.

**DoD (faza):**

- Niezalogowany użytkownik na chronionych trasach trafia na `/`; po login/register — dashboard.
- Sesja wyłącznie przez cookie HttpOnly (brak sekretów sesji w Web Storage).
- Tabela listuje spotkania z API (już po ACL); limity 10/25/50/100 + `page`.
- Test enqueue’uje demo; SSE aktualizuje wiersz bez zmiany trasy; `failed` pokazuje status + komunikat.
- Wyszukiwarka to jawny mock bez wołań LLM/search.
- BFF nie egzekwuje ACL.

### Krok 3.1 — Auth UI i ochrona tras

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Formularz login/register z przełączaniem trybu; sukces → cookie przez BFF → redirect na dashboard. Brak sesji → redirect na `/`. Wylogowanie przez BFF/API.

**DoD (krok):**

- Ścieżka auth UI działa end-to-end względem API sesji z majoru backendu.
- Brak przechowywania access/refresh w `localStorage` / `sessionStorage`.

### Krok 3.2 — Dashboard: sidebar, tabela, paginacja

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Sidebar: widok domyślny vs wyszukiwarka. Tabela z listy API; select limitu ∈ {10,25,50,100} oraz `page`. Bez osobnej strony detail jako głównej nawigacji po wyniku pipeline.

**DoD (krok):**

- Lista odzwierciedla dane dozwolone przez ACL po stronie `api` (UI nie „dopuszcza po ID”).
- Paginacja wysyła wymagane parametry do API przez BFF.

### Krok 3.3 — Test, SSE i aktualizacja wiersza

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Przycisk Test zawsze widoczny po zalogowaniu → BFF → demo enqueue → otwarcie SSE dla `meetingId` → użytkownik zostaje na widoku; wiersz aktualizuje status (`pending` → `processing` → `completed` | `failed`) i po sukcesie skrót summary/zadań.

**DoD (krok):**

- Ścieżka Test + SSE działa zgodnie z `SPEC-FRONTEND` / `docs/data_flow.md`.
- Brak redirectu na detail po Test.

### Krok 3.4 — Mock wyszukiwarki i domknięcie bezpieczeństwa UI

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Podstrona wyszukiwarki z hardcodowanym mockiem i adnotacją atrapy; zakaz LLM/search/RAG. Brak wrażliwych sekretów w bundlu klienta; na prod bez logowania pełnego transcriptu w konsoli.

**DoD (krok):**

- Wyszukiwarka nie woła zabronionych API.
- Kryteria bezpieczeństwa UI z `SPEC-FRONTEND` są spełnione w zakresie v1.

---

## MILESTONE — Panel v1 działa z API

**Opis:** Bramka po Fazie 3. Duży skok: minimalny front etapu 0 jest używalny ze spiętym backendem (sesja, lista, Test, statusy).

**DoD (milestone):**

- Faza 3 ma status `WYKONANY`.
- Spełnione kryteria akceptacji UI v1 z `SPEC-FRONTEND` (auth, sidebar, Test+SSE, mock search, limity, brak sekretów w Web Storage).
- Zależność od Fazy 3 majoru backendu jest domknięta.
- Prowadzący prace akceptuje przejście do Fazy 4.

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Faza 4 — Wkład frontu w bramkę jakości / oddanie

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Udział warstwy `web` w bramce jakości oddania: smoke build / typecheck zgodnie z `SPEC-TESTY` / `docs/testy.md`. **Część A** (dokument ≤5 stron) i główna konfiguracja CI PR dla backendu pozostają we **Fazie 4 majoru backendu** — tu bez przepisywania dokumentu A.

**DoD (faza):**

- Smoke build / typecheck `web` przechodzi (lokalnie i/lub w CI — spójnie z ustaleniami majoru backendu).
- Opis UI w artefaktach oddania nie przeczy faktycznemu stanowi frontu (korekty wzmianek, bez dublowania Części A).
- Brak regresji „front nie buduje się”, która blokowałaby oddanie etapu 0.

### Krok 4.1 — Smoke build / typecheck warstwy web

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Domknięcie bramki jakości frontu wymaganej przez `SPEC-TESTY` (T-13 / równoważne): aplikacja web buduje się / typecheck przechodzi w zakresie uzgodnionym z CI.

**DoD (krok):**

- Smoke frontu jest zielony albo jawnie wpisany w CI z majoru backendu.
- Awaria builda web nie jest „niespodzianką” na Fazie 5.

### Krok 4.2 — Spójność opisu UI w oddaniu (bez przepisywania Części A)

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Przegląd, czy wzmianki o UI w README / skrótach oddania są zgodne z działającym panelem; właściciel dokumentu Części A = major backendu.

**DoD (krok):**

- Nie ma sprzeczności „w docs UI jest X, a w repo Y” w zakresie frontu v1.
- Część A nie jest tu tworzona od nowa.

---

## MILESTONE — Bramka jakości frontu domknięta względem CI/oddania

**Opis:** Bramka po Fazie 4. Duży skok: warstwa web nie wywraca oddania na bramce build/typecheck; opis UI jest spójny.

**DoD (milestone):**

- Faza 4 ma status `WYKONANY`.
- Smoke web jest domknięty względem CI/oddania.
- Prowadzący prace akceptuje przejście do Fazy 5.

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Faza 5 — Domknięcie UI etapu 0

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Dopieszczenie ścieżki użytkownika, smoke UI na czystym clone razem z instrukcją README (koordynacja z majorem backendu), jawna lista cięć UI. Pełne kryterium „etap 0 z panelem” z `docs/plan_wdrozenia_etapy.md` domyka się **łącznie** z majorem backendu.

**DoD (faza):**

- Ścieżka: auth → tabela → Test → aktualizacja statusu → mock search działa według docs.
- README (koordynacja z backendem) opisuje, co robi UI, co jest atrapą i czego świadomie nie ma.
- Smoke na czystym clone obejmuje start `web` obok procesów z majoru backendu.
- Playwright / pełny panel / prawdziwa wyszukiwarka pozostają poza must-have — nazwane.

### Krok 5.1 — Dopieszczenie ścieżki użytkownika

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Usunięcie oczywistych dziur UX ścieżki v1 (auth, tabela, Test, SSE, mock search) bez rozszerzania zakresu poza `SPEC-FRONTEND`.

**DoD (krok):**

- Krytyczna ścieżka użytkownika jest przechodnia bez „dziur” blokujących demo UI.
- Brak ukrywania Test za flagą UI.

### Krok 5.2 — Smoke UI na czystym clone i README

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Weryfikacja uruchomienia frontu według root README; uzupełnienie sekcji UI / atrap we współpracy z majorem backendu (jeden README oddania).

**DoD (krok):**

- Czysty clone + README prowadzi do działającego minimalnego panelu (przy założeniu działającego API z majoru backendu).
- Sekcja UI w README jest kompletna względem faktycznego stanu.

### Krok 5.3 — Świadome cięcia i checklista zależności od backendu

**Status:** `NIE_ROZPOCZĘTY`

**Opis:** Lista odpuszczonych rzeczy UI; checklista: co musi być `WYKONANY` / `OSIĄGNIĘTY` w majorze backendu, żeby uznać pełny etap 0 z panelem.

**DoD (krok):**

- Cięcia UI są jawne w README (lub równoważnie w oddaniu).
- Zależność od majoru backendu jest nazwana (nie udajemy, że sam front = cały etap 0).

---

## MILESTONE — Frontend etapu 0 gotowy do oddania

**Opis:** Bramka zamykająca ten major. Duży skok: UI v1 + BFF są oddawalne. Pełne oddanie etapu 0 wymaga także domknięcia majoru backendu (pipeline, ACL, CI, Część A, README wspólne).

**DoD (milestone):**

- Faza 5 ma status `WYKONANY`.
- Panel v1 spełnia must-have UI z `docs/frontend.md` / `SPEC-FRONTEND` / kryteriów etapu 0 dotyczących frontu.
- Smoke web i opis UI w oddaniu są kompletne.
- Prowadzący prace uznaje frontend za gotowy; pełne oddanie etapu 0 = ten MILESTONE **oraz** zamykający MILESTONE majoru backendu (lub jawny zapis w README, jeśli UI domknięte wcześniej niż backend).

<!-- Domyślnie brak statusu. Po spełnieniu DoD: **Status:** `OSIĄGNIĘTY` -->

---

## Poza zakresem tego major planu

- Fundament monorepo, Prisma, `api`, `worker`, pipeline, ACL po stronie `api`, Część A, główne CI backendu — [`vinseo-recruitment-task-backend_major-plan.md`](./vinseo-recruitment-task-backend_major-plan.md).
- Pełny panel produktowy (w tym erase treści), branding, Q&A UI, Playwright must-have, prawdziwa wyszukiwarka/RAG, detail page jako główna ścieżka — poza v1 (`docs/frontend.md`).

## Mapowanie SPEC → fazy (ślad)

| Obszar | Fazy (ten major) |
|--------|------------------|
| Odbiór fundamentu (bez powielania) | 1 ← backend Faza 1 |
| Szkielet UI/BFF | 2 |
| `SPEC-FRONTEND` + spięcie z `SPEC-KOMUNIKACJA` / auth | 3 ← zależy od backend Faza 3 |
| `SPEC-TESTY` (smoke web) | 4 |
| Domknięcie UI etapu 0 | 5 |

## Synchronizacja z majorem backendu (skrót)

| Faza (dzień) | Backend | Frontend (ten plik) |
|--------------|---------|---------------------|
| 1 | Fundament monorepo + stub `web` | Odbiór stubu; mapa widoków |
| 2 | Pipeline | Szkielet UI/BFF |
| 3 | Auth, ACL, API, SSE | UI v1 na żywym API |
| 4 | Część A + CI | Smoke web / spójność opisu UI |
| 5 | Domknięcie backendu / oddanie | Domknięcie UI / oddanie |
