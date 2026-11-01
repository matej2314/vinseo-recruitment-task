---
wersja: 12
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-11-01
---

# Dokumentacja koncepcyjna - Firmowy asystent spotkań

## Cel produktu

**Firmowy asystent spotkań** (roboczo: Meeting Memory) to wewnętrzny system pamięci ustaleń dla agencji e-commerce pracującej na marketplace'ach (m.in. Allegro) i w Google Workspace.

Problem, który adresuje: ustalenia ze spotkań giną - nikt nie pamięta zobowiązań wobec klienta, zadania nie wracają do zespołu, a nowa osoba w projekcie nie ma skąd wziąć historii.

Najważniejsza wartość:

- Po spotkaniu (objętym procesem) powstaje **transkrypcja po polsku z podziałem na mówców**, **krótkie streszczenie** oraz **lista ustaleń i zadań**.
- Pracownik widzi **tylko te spotkania i treści, do których ma prawo**.
- Dane klientów nie są wynoszone - architektura zakłada kontrolowane granice (własne źródło prawdy w systemie; wejście z ekosystemu Workspace / notetakera jako adapter, nie jako Notebook firmowy).
- W kolejnych etapach: pytanie w stylu „co ustaliliśmy z klientem X o budżecie?” z **wskazaniem źródła** (poza zakresem pierwszej wersji kodu) - ten sam provider LLM co przy kanonicznym streszczeniu spotkania (`llm_i_asystent.md`), nie osobna integracja.
- Kanon streszczenia i zadań: **nasz** wynik LLM/mock po Zod; źródło zewnętrzne dostarcza materiał wejściowy, nie gotowe `summary` vendora jako kanon.
- **Wejście docelowe (per zgoda):** metadane faktu **zawsze** z Google Calendar; zgoda na nagrywanie = tag **`[record-ok]`** w opisie wydarzenia → treść + nagranie z **Fireflies** (on-demand URL); **brak tagu** → treść z **Notes by Gemini** (bez FF / audio); **metadata-only** tylko gdy Gemini też nie dostarcza materiału. Szczegóły: `bezpieczenstwo_i_rodo.md`.
- Capture u notetakera (**Fireflies**, tylko przy `[record-ok]`) obejmuje **transcript i nagranie**; nasz system kanonizuje tekst oraz udostępnia odnośnik do nagrania przez mechanizm **on-demand** (świeży URL po ACL) — **nie** magazyn plików audio/video ani trwałego URL w DB. W **obecnej wersji**: mock happy-path + button demonstracyjny + **zaślepka** portów Calendar / `gemini-notes` (major Faza 3.7); działająca gałąź Google/FF = **kolejna wersja / etap 1+** (`frontend.md`, `dokumentacja_komunikacji.md`, `plan_wdrozenia_etapy.md`).

System jest świadomie **narzędziem wewnętrznym** - nie portalem dla klientów zewnętrznych.

## Dla kogo jest system

| Segment | Potrzeba |
|---------|----------|
| **Specjalista / opiekun klienta** | Odtworzyć ustalenia i zobowiązania z calli, na których był organizatorem lub uczestnikiem; mieć listę zadań po spotkaniu. |
| **Nowa osoba w projekcie** | Docelowo: historia ustaleń klienta/projektu bez obecności na każdym callu. **Poza ACL v1** - wymaga membership „zespołu klienta” (kolejna faza; Workspace nie ma grup klienckich). |
| **Lead / koordynator** | W v1: tylko spotkania, gdzie jest organizatorem lub uczestnikiem (albo admin). Brak automatycznego wglądu „po dziale” z grup Google. |
| **Admin / ops (wewnętrzny)** | Widok serwisowy wszystkich spotkań; erase treści na żądanie klienta; obsługa wyjątków (np. offboarding). |

**Odbiorcy tej dokumentacji (`docs/`):** przede wszystkim autor rozwiązania i ewentualny przyszły zespół developerski - nie zastępuje osobnego dokumentu decyzyjnego dla zarządu.

## Użytkownicy i dostęp

- Konta wyłącznie dla **pracowników firmy**.
- Klienci, dostawcy i inni uczestnicy zewnętrzni **nie logują się** do systemu (występują w metadanych jako uczestnicy zewnętrzni - e-mail poza domeną firmy).
- **Uwierzytelnianie (tożsamość):**
  - **Obecna wersja / etap 0:** rejestracja i logowanie **e-mail + hasło** (otwarta rejestracja; oczekiwany firmowy adres jak w Workspace).
  - **Kolejne etapy (docelowo od etapu 1 / pilota):** **logowanie kontem Google Workspace** (domena firmowa) jako główny sposób wejścia. Po sukcesie IdP: find-or-create `User` po firmowym e-mailu (ew. `googleSub`) → ta sama sesja aplikacji (JWT + refresh, cookie HttpOnly). Cel: **powiązanie konta aplikacji z tożsamością Workspace od początku** integracji Calendar — ten sam e-mail, który trafia do `MeetingParticipant` / organizatora, bez polegania wyłącznie na konwencji „zarejestruj się tym samym adresem”.
  - Opcjonalny fallback e-mail/hasło (break-glass / okres przejściowy) — decyzja ops; nie zmienia ACL.
  - **OAuth Identity (login) ≠ OAuth / credentials integracji** Calendar / Notes / Drive (osobny flow workera / admina).
- Kontrola dostępu do zasobów (**ACL v1** — **bez zmian** przy SSO Google):
  - użytkownik jest **organizatorem** spotkania, albo
  - użytkownik jest **uczestnikiem** wewnętrznym spotkania, albo
  - użytkownik ma rolę **admin**.
- **Poza ACL v1 (kolejna faza):** membership w zespole projektu/klienta - Workspace grupuje głównie działy, nie klientów; źródłem membership będzie ręczna/administracyjna lista w naszym systemie (nie grupy Google).
- Egzekwowanie ACL odbywa się po stronie **`api`** (jedyny punkt zaufania dla odczytu, listy, przyszłego wyszukiwania i asystenta).

## Powiązanie z klientem

- Brak integracji z HubSpot (CRM może być wzmiankowany jako źródło prawdy operacyjnej firmy; system nie synchronizuje kalendarza z HubSpotem).
- Matching v1: **domena e-mail uczestnika zewnętrznego** → rekord `Client` (pole domeny).
- Brak dopasowania: pipeline **nie jest blokowany**; `clientId = null`, status linku `unmatched`; admin może przypisać klienta później.
- Spotkanie wyłącznie wewnętrzne (brak e-maili zewnętrznych): `clientLinkStatus = internal`, to nie jest błąd.

## Skala i kontekst językowy (założenia)

| Założenie | Wartość |
|-----------|---------|
| Organizacja | ok. 40 osób, z czego ok. 25 regularnie prowadzi spotkania |
| Wolumen | ok. 300 godzin spotkań miesięcznie |
| Typowe spotkanie | średnio ok. 45 minut, 2-6 uczestników |
| Język | polski z wtrąceniami angielskimi (nazwy kampanii, skróty branżowe) |
| Uczestnicy | część spoza firmy (klienci) - bez kont w systemie |

## Zakres v1

### Produktowo (pierwsza wersja firmowa)

- **Równy priorytet** typów spotkań (wewnętrzne i z klientami). Spotkania wrażliwe (1:1, rekrutacje, zarząd): flaga `confidential` (ręczne / z procesu); w v1 ten sam pipeline mock; ACL jak wyżej (+ admin czyta).
- Trwałe przechowanie: spotkanie, uczestnicy (wewnętrzni + metadane zewnętrznych), transkrypcja, streszczenie, zadania, reguły uprawnień.
- Przetwarzanie asynchroniczne od pojawienia się materiału źródłowego do zapisanego, **zwalidowanego** streszczenia i listy zadań. Brak treści ze źródła treści (mock / FF / Gemini Notes) → rekord metadanych (**metadata-only**), bez AI — przy braku zgody najpierw próba Notes by Gemini.
- Możliwość pracy i testów na **przygotowanym mocku** źródła (bez prawdziwych nagrań firmowych — fixture zamiast realnych plików media) oraz **walidacja formatu** transkrypcji / wyniku streszczenia; szkielet on-demand linku (mock URL) + zaślepka portów gałęzi zgody pod późniejszą podmianę na adaptery prod.
- Minimalny front: warstwa BFF + layout z **sidebarem** - widok domyślny (tabela spotkań + Test + SSE + button nagrania demo) oraz **mock wyszukiwarki**; bez pełnego panelu produktowego i bez osobnej strony detail.

### Technicznie (to, co ma udowodnić szkielet)

- Własny model danych i pipeline w repozytorium zespołu.
- Idempotentne przetwarzanie (ponowne uruchomienie / awaria w połowie bez duplikatów i bez gubienia spotkań). **Aktualizuj źródło** (etap 1+): ręczne ponowne enqueue tego samego spotkania, gdy treść u vendora dogoniła fakt callu — bez osobnego „sync Google” i bez magazynowania nagrania (`data_flow.md`).
- Redakcja danych wrażliwych przed krokiem traktowanym jako wyjście poza zaufaną granicę - z testami.
- Kontrola dostępu na API - z testami reguł.
- Uruchomienie lokalne: ścieżka A (`pnpm db:up` + `dev:*`) oraz ścieżka B (`pnpm dev:stack:up` - compose.dev) i przepuszczenie przykładowego spotkania komendami.

## Poza zakresem v1

- Pełny interfejs użytkownika / design system panelu (w tym panel erase - norma w `bezpieczenstwo_i_rodo.md`, implementacja później).
- Powiadomienia (mail, Slack itp.).
- Produkcyjna / działająca integracja Google Calendar, Fireflies i Notes by Gemini (w obecnej wersji: mock happy-path + zaślepka portów — Faza 3.7; pełna logika w etapie 1+).
- **Logowanie kontem Google Workspace** (w obecnej wersji: e-mail/hasło; IdP Google = etap 1+ — `plan_wdrozenia_etapy.md`).
- Wywołania prawdziwego LLM w MVP (mock summarizera z realnym kształtem kontraktu).
- Wyszukiwanie semantyczne / asystent Q&A z cytowaniem źródeł (RAG) - przewidziane koncepcyjnie na później; ACL tej samej reguły.
- Membership „zespołu klienta”, ekspansja zaproszeń grup Google (zwłaszcza grupy wszystkich pracowników).
- Integracja HubSpot.
- Konta i widoki dla klientów zewnętrznych.
- Rozbicie na mikroserwisy ponad podział API / worker / web.

## Główne założenia

1. **Własne źródło prawdy** - system trzyma kanoniczne rekordy spotkań, streszczeń i uprawnień; zewnętrzny notetaker / Notes by Gemini jest adapterem wejścia, nie Notebookiem firmowym.
2. **Wejście docelowe:** Calendar (metadane + `description` / `[record-ok]`) + treść (`fireflies` \| `gemini-notes`) + API LLM; w obecnej wersji — mock + zaślepka tych samych portów.
3. **Narzędzie wewnętrzne** - zero kont dla osób spoza organizacji; docelowa tożsamość pracowników = konto Google Workspace (ten sam firmowy e-mail co w Calendar).
4. **ACL przed treścią** - listowanie, podgląd i przyszłe wyszukiwanie / asystent nie mogą ujawnić spotkania poza zbiorem dozwolonym (organizator / uczestnik / admin). SSO Google **nie** rozszerza ACL — tylko ustala `User`.
5. **Fail-closed na wyniku modelu** - wynik streszczenia ma ustalony kontrakt; niepoprawny payload nie staje się źródłem prawdy w bazie.
6. **Równy priorytet typów spotkań**; wrażliwe oznaczane flagą, nie „odkładane na później” wyłącznie z powodu typu.
7. **Testowalność bez danych produkcyjnych** - fixture / mock + walidacja formatów jako domyślna ścieżka DX.

## Słownik skrótowy

| Pojęcie | Znaczenie |
|---------|-----------|
| Spotkanie | Rekord callu (metadane + powiązania), objęty pipeline'em |
| Organizator | Pracownik-właściciel wydarzenia; ścieżka ACL v1 |
| Uczestnik | Osoba na spotkaniu (wewnętrzna z kontem lub zewnętrzna w metadanych) |
| Transkrypcja | Tekst z podziałem na mówców (PL + wtrącenia EN) |
| Streszczenie | Skrót ustaleń o ustalonym, walidowanym kształcie |
| Zadanie / ustalenie | Pozycja „kto, co, do kiedy” wynikająca ze spotkania |
| ACL | Reguły kto może odczytać spotkanie i jego artefakty |

Szerszy słownik: w pełnym zestawie dokumentacji plik `dictionary.md`.

## Kryteria sukcesu v1

- Po przetworzeniu przykładowego (mock) spotkania w systemie są: transkrypcja, zwalidowane streszczenie i lista zadań (albo metadata-only, gdy brak treści źródła).
- Format transkrypcji / wyniku streszczenia jest walidowany; niepoprawne dane nie trafiają do bazy jako „sukces”.
- Użytkownik A nie odczyta spotkania / streszczenia poza ACL v1 (organizator / uczestnik / admin).
- Dane wrażliwe są redagowane przed krokiem „na zewnątrz” (nawet gdy kolejny krok to mock) - potwierdzone testami.
- Całość da się uruchomić lokalnie i przepuścić demo spotkania bez dostępu do prawdziwych nagrań firmy.

## Mapowanie na inne dokumenty

- Architektura: `architektura.md`
- Frontend (UI v1): `frontend.md`
- LLM / asystent: `llm_i_asystent.md`
- Plan etapów: `plan_wdrozenia_etapy.md`
- RODO: `bezpieczenstwo_i_rodo.md`
- Koszty: `koszty_i_warianty.md`
- Słownik: `dictionary.md`
- Spis docs: `README.md`
