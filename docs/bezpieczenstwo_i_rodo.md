---
wersja: 6
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-31
---

# Bezpieczeństwo i RODO

Dokument inżyniersko-produktowy Firmowego asystenta spotkań. **Nie stanowi porady prawnej** - założenia poniżej są robocze na v1 docs; okresy retencji przyjęte po uzgodnieniu z firmą jako założenie do uzasadnienia.

Szerszy kontekst produktu: `dokumentacja_koncepcyjna.md`. ACL i redakcja w kodzie: `architektura.md`, `dokumentacja_komunikacji.md`, `observability.md`.

## Cele ochrony

- Dane klientów i treść spotkań **nie trafiają** tam, gdzie nie powinny (vendorzy, logi, osoby bez ACL).
- Pracownicy widzą tylko spotkania zgodne z modelem dostępu (ACL v1).
- Zgody uczestników zewnętrznych są **jawne**; odmowa nagrywania ma skutek operacyjny (**bez** FF / audio; treść z Notes by Gemini gdy dostępna), nie „ciche” nagrywanie.
- Retencja jest skończona i egzekwowalna (w tym `audit_log`); erase treści na żądanie klienta nie kasuje faktu callu.

## Role danych (skrót)

| Kategoria | Przykłady | Gdzie w systemie |
|-----------|-----------|------------------|
| Konto pracownika | e-mail, hash hasła | Postgres; hasło tylko bcrypt |
| Metadane spotkania | tytuł, czas, czas trwania, `clientId`, status linku, `processingStatus` | Postgres |
| Treść wrażliwa | transcript, summary, action items, e-maile zewnętrznych | Postgres pod ACL; **nie** w pino / `audit_log` jako treść |
| Audyt | eventType, id, requestId | `audit_log` (90 dni); przy erase - anonimizacja |
| Capture u vendora | audio / transcript u Fireflies lub Notes by Gemini (gdy prod) | poza naszą DB - wymaga DPA i decyzji |

Klienci zewnętrzni **nie mają kont** - mogą być w metadanych uczestników / tekście.

## Zgody i nagrywanie

### Zasada v1 (robocza)

**Jawna zmiana normy** względem wcześniejszego zapisu „brak zgody → brak capture / czyste metadata-only bez transcriptu / AI”: odmowa dotyczy **nagrywania** (Fireflies / audio), nie automatycznie każdej treści tekstowej.

1. Na spotkaniach z klientem: **jawna informacja** na początku Meet (oraz zapis w umowie / procesie sprzedaży, gdy firma to wdroży).
2. **Metadane faktu callu** (tytuł, czas, uczestnicy indywidualni): **zawsze** z **Google Calendar** (ew. Meet w zakresie linku / czasu) — niezależnie od zgody na nagrywanie.
3. **Zgoda** zewnętrznego (klient / kandydat) na nagrywanie → treść + nagranie: **Fireflies** (transcript do pipeline; nagranie wyłącznie on-demand — `dokumentacja_komunikacji.md`).
4. **Brak zgody** na nagrywanie → **zakaz FF / audio** (brak buttonu / on-demand linku FF w produkcji); źródło informacji = **Notes by Gemini** (Google Meet / Workspace). Gdy Notes dostarcza materiał tekstowy → redakcja E+T+P+K + **UC1** + Zod. **Metadata-only** (bez transcriptu / AI) **tylko** gdy Gemini Notes **nie** dostarcza treści.
5. **Docelowo (produkcja / po procesie zgód):** widoczność mechanizmu nagrania w UI jest powiązana ze **zgodą na nagrywanie** (bez zgody — brak buttonu / on-demand FF).
6. **Etap 0 / demo (świadomy wyjątek):** przycisk nagrania w UI jest **zawsze widoczny** w celach demonstracyjnych szkieletu on-demand — to **nie** jest docelowa norma produkcyjna.
7. Bot / Notetaker na callu jest widoczny; ewentualny Meet SDK też wymaga zgody w UI Google - proces firmowy musi to uwzględniać.
8. **Obecna wersja (kod):** happy-path = mock źródła + mock LLM (w tym mock URL nagrania); **zaślepka** portów metadanych (Calendar) i treści `gemini-notes` — major backend **Faza 3.7**; **bez** prawdziwego OAuth / Calendar / Gemini Notes. **Działająca** logika Calendar + wybór `fireflies` \| `gemini-notes` wg zgody = **etap 1 (pilot) / kolejna wersja** (`plan_wdrozenia_etapy.md`), na tych samych portach.

### Nagranie a nasza baza

- Plik audio/video **pozostaje u vendora** (docelowo Fireflies, **tylko** przy zgodzie na nagrywanie); system **nie** magazynuje plików ani **nie** trzyma trwałego `audio_url` / `video_url` w rekordzie spotkania.
- Dostęp do odsłuchu: mechanizm **on-demand** (świeży URL po ACL) — tylko gałąź ze zgodą; szczegóły: `dokumentacja_komunikacji.md`, `data_flow.md`.
- Erase treści obejmuje nagranie u vendora zgodnie z DPA/API (bez „czyszczenia kolumny URL” u nas — takiej kolumny nie ma).

### Uczestnicy zewnętrzni

- Brak logowania do naszego systemu.
- Klasyfikacja: e-mail **poza domeną firmy** = zewnętrzny (informacja w metadanych, nie konto).
- Ich dane w transcripcie podlegają ACL pracowników oraz retencji / erase jak poniżej.
- Udostępnianie summary klientowi e-mailem / linkiem - **poza v1**.

## Spotkania poufne (`confidential`)

- Flaga ręczna / procesowa (1:1, rekrutacja, zarząd itd.).
- W v1: **pełny pipeline** (mock) jak pozostałe spotkania; ACL v1 (organizator / uczestnik / **admin czyta**).
- W produkcji: rozważyć ograniczenie zewnętrznego capture/LLM dla `confidential` (osobna decyzja ops) - nie blokuje architektury etapu 0.

## Retencja (robocza) - uzasadnienie

| Zasób | Retencja | Uzasadnienie |
|-------|----------|--------------|
| Transkrypcja (surowa / znormalizowana) | **90 dni** | Pełny tekst rozmowy to najwyższa ekspozycja PII i tajemnic klienta; krótki okres ogranicza powierzchnię wycieku przy zachowaniu okna odtworzenia ustaleń. |
| Streszczenie + action items | **12 miesięcy** | Ustalenia i zadania żyją w cyklu projektu/kampanii dłużej niż surowy transcript; 12 mies. pokrywa typowy horyzont rozliczeń bez trzymania pełnej rozmowy. |
| `audit_log` | **90 dni** | Ślad bezpieczeństwa i operacji; bez treści transcriptu (patrz `observability.md`, `deployment.md`). |
| Dumpy backup | Osobna polityka ops | Mogą żyć dłużej niż wiersze w tabeli - świadomie, z kontrolą dostępu ops. |

Po upływie: hard delete transcriptu preferowany po 90 dniach; summary/action items po 12 miesiącach - job w etapie wdrożeniowym (nie must-have kodu etapu 0).

## Usunięcie treści na żądanie klienta

**Intencja firmy:** usuwamy **transkrypcje i ewentualne nagrania**, nie fakt spotkania.

| Zostaje bez zmian | Usuwane / zastępowane |
|-------------------|------------------------|
| Data rozpoczęcia, czas trwania, `processingStatus`, **title**, **clientId** | `transcriptSegments`, `summary` (w tym action items), metadane uczestników zewnętrznych (e-maile/nazwy), inne pola treściowe |
| | U vendora (gdy prod): usunięcie nagrania/transcriptu zgodnie z API i DPA |

- Inicjacja w produkcie: **tylko admin z panelu** (implementacja UI/API erase - **kolejna faza**; norma obowiązuje już w docs).
- `audit_log` powiązany ze spotkaniem: **anonimizacja** (bez treści, bez PII klienta w payloadzie; identyfikatory zdarzeń mogą pozostać).
- Spotkanie po erase nadal podlega ACL v1 (organizator/uczestnik/admin widzą „pustą” kartę faktu).

## Dostęp (ACL) a prywatność

- Egzekucja wyłącznie na `api`: **organizator** ∨ **uczestnik** ∨ **admin**.
- Brak uprawnień → **404** (bez enumeracji).
- Wyszukiwanie / przyszły asystent Q&A: tylko w zbiorze dozwolonym tą samą funkcją ACL.
- Deny ACL → zdarzenie w `audit_log` **bez** treści spotkania.
- Grupy Workspace (struktura org / grupa wszystkich pracowników): **nie** ekspandujemy do ACL całej firmy - utrata historii dla osób „obecnych tylko przez grupę” jest świadoma względem ryzyka wycieku; indywidualni uczestnicy z e-mailem firmowym w liście Calendar dostają uczestnictwo.

## Redakcja przed „wyjściem”

- Przed **każdym** wywołaniem LlmClient - UC1 summarize i UC2 ask (nawet mock): maskowanie uzgodnionych klas PII.
- Zakaz logowania transcriptu / pełnego summary / pełnych promptów w pino i w `audit_log`.
- Testy obowiązkowe: `testy.md`. Szczegóły UC: `llm_i_asystent.md`.

## Vendorzy i transfer (Fireflies / Workspace / LLM)

| Temat | Norma robocza |
|-------|----------------|
| Obecna wersja (etap 0) | Mock happy-path za portami; **zaślepka** portów Calendar (metadane) + `gemini-notes` (treść) — Faza 3.7 major backend; bez prawdziwych wywołań Google. |
| Google Calendar (prod / etap 1+) | **Zawsze** źródło **metadanych** faktu callu i uczestników **indywidualnych** (pod `MeetingParticipant`); **nie** magazyn nagrania; **zakaz** ekspansji grup Workspace do ACL. |
| Fireflies (prod, **przy zgodzie** na nagrywanie) | Dane mogą wyjść poza infrastrukturę firmy; **DPA**; FF = źródło **transkrypcji i nagrań** (media u vendora); z FF do kanonu tekstu — transcript; **`summary.*` ignorujemy**; link do nagrania wyłącznie on-demand (nie persist URL). |
| Notes by Gemini (prod, **przy braku zgody** na nagrywanie) | Fallback **treści** (notatki / tekst z Meet); **bez** audio FF; jest materiał → UC1; brak / pusty materiał → metadata-only. |
| LLM (jeden provider) | Tylko treść **po redakcji**; UC1 + później UC2; w MVP kodu - mock bez requestów. |
| HubSpot | **Brak integracji**; najwyżej wzmianka w docs decyzyjnych. |
| Minimalne uprawnienia Google | Calendar / Meet / Docs / Drive **tylko** w zakresie wybranego adaptera — **bez osłabienia** scope’ów „na skróty”. OAuth Google **≠** login pracowników v1. |
| API Key / OAuth | Tylko `api`/`worker`; nigdy `NEXT_PUBLIC_*`. |

Mapowanie techniczne FF: `dokumentacja_komunikacji.md`. Porty metadane vs treść: `architektura.md`.

## Offboarding pracownika

1. Dezaktywacja konta (brak logowania).
2. Unieważnienie sesji (cookie / store sesji).
3. Natychmiastowy efekt ACL (nie loguje się; historyczne uczestnictwo/organizatorstwo w metadanych może zostać).
4. Dane spotkań **zostają** w organizacji - inni organizatorzy/uczestnicy/admin nadal widzą wg ACL v1; nie kasujemy historii klienta wraz z odejściem osoby.
5. Opcjonalnie: wpis w `audit_log` (`user.deactivated`).

## Edge case’y (checklista operacyjna)

| Sytuacja | Zachowanie |
|----------|------------|
| Odmowa zgody na nagrywanie | Bez FF / audio; treść z Notes by Gemini (+ UC1 gdy tekst); metadata-only tylko gdy Notes puste; Calendar nadal dostarcza metadane; docelowo brak buttonu / on-demand FF w UI (w etapie 0: wyjątek demo — button zawsze widoczny; działająca gałąź = etap 1+) |
| Spotkanie `confidential` | Flaga; pipeline v1 jak zwykle; ACL v1 + admin |
| Brak matcha domeny klienta | `unmatched`, treść OK, `clientId` null do ręcznego przypisania |
| Zaproszenie grupy „wszyscy” | Bez ekspansji ACL na całą firmę |
| Wyciek ID spotkania | 404 bez ACL |
| Retry webhooka / podwójny Test | Idempotencja - bez duplikatu treści |
| Żądanie erase klienta | Kasuj treść; zostaw fakt (title, daty, duration, status, clientId) |
| Podejrzenie incydentu | Logi pino + `audit_log`; rotacja sekretów; procedura firmy |

## Otwarte wobec firmy (nie blokują v1 docs)

- Klauzule umowne o nagrywaniu Meet.
- DPA / lokalizacja danych u vendorów (FF oraz Workspace); proces zbierania zgody zewnętrznych.
- Potwierdzenie domeny e-mail firmy do klasyfikacji wewnętrzny/zewnętrzny.

## Mapowanie na inne dokumenty

- Koncepcja i zakres: `dokumentacja_koncepcyjna.md`
- ACL, redakcja, procesy: `architektura.md`
- Kontrakty / 404: `dokumentacja_komunikacji.md`
- `audit_log`: `observability.md`
- Backup / env prod: `deployment.md`
- Sesja w UI (cookie HttpOnly): `frontend.md`
- LLM: `llm_i_asystent.md`
- Plan etapów / zgody w pilocie: `plan_wdrozenia_etapy.md`
