---
wersja: 13
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-11-01
---

# Anty-patterny

Pułapki typowe dla Firmowego asystenta spotkań (modularny monolit, Nest `api`/`worker`, Next BFF, pg-boss, ACL, adaptery źródeł). Format: **czego unikać → dlaczego boli → co robić zamiast**.

## Granice modułów i Nest

### God Module („wszystko w jednym module”)

- **Unikać:** jeden `CoreModule` / `MeetingsModule` z auth, ACL, pipeline, Prisma, redakcją i HTTP naraz.
- **Boli:** cykliczne importy, niemożliwe testowanie wycinka, każda zmiana rusza „całość”.
- **Zamiast:** moduły wg odpowiedzialności (`auth`, `users`, `meetings`, `access`, po stronie workera `pipeline` / `jobs` / `adapters`); wspólne tylko to, co naprawdę współdzielone (np. Prisma module, contracts).

### God Controller

- **Unikać:** controller z regułami ACL, zapytaniami Prisma, mapowaniem Fireflies i wywołaniem summarizera w jednej metodzie.
- **Boli:** nieczytelny HTTP layer, testy tylko e2e, regresje przy każdej zmianie kontraktu.
- **Zamiast:** cienki controller → use case / service; ACL w `access`; I/O vendora w adapterach workera.

### Prisma (lub inny ORM) bezpośrednio w controllerze

- **Unikać:** `prisma.meeting.findMany` w handlerze HTTP.
- **Boli:** wyciek szczegółów schemy do warstwy transportu; trudna podmiana zapytań; ACL łatwo „ominąć” przy kopiuj-wklej.
- **Zamiast:** repozytorium / serwis domenowy lub aplikacyjny; controller zna DTO i wynik use case.

### Rozmyte granice modułów Nest

- **Unikać:** wzajemne importy feature→feature bez wyraźnego API modułu; eksport „całego serwisu z wnętrznościami”.
- **Boli:** ukryte sprzężenia, trudny refaktor, worker ciągnący HTTP-owe zależności api.
- **Zamiast:** jawne `exports` tylko kontraktów potrzebnych sąsiadom; kod pipeline i adapterów w `apps/worker`, nie w controllerach `api`; typy w `packages/contracts`.

### Czytanie `process.env` głęboko w domenie

- **Unikać:** ad hoc `process.env.FOO` w serwisie ACL / redakcji.
- **Boli:** niedeterministyczne testy, brak fail-closed przy starcie.
- **Zamiast:** zwalidowany obiekt konfiguracji na starcie procesu (`config/`).

## ACL, bezpieczeństwo, dane

### ACL przez grupę Google / dział / „wszyscy pracownicy”

- **Unikać:** traktowania zaproszenia grupy Workspace (zwłaszcza all-company) lub membership działu jako ACL do treści spotkań; ekspansji grup Calendar do `MeetingParticipant` „dla wygody”.
- **Boli:** wyciek ustaleń do osób bez realnej obecności na callu; Workspace ≠ grupy klienckie.
- **Zamiast:** ACL v1 = organizator ∨ uczestnik ∨ admin; Calendar → wyłącznie uczestnicy **indywidualni**; membership klienta dopiero w kolejnej fazie i tylko w naszej DB.

### Jeden OAuth Google „do logowania i Calendar naraz”

- **Unikać:** jednego consentu / tokenu użytkownika używanego jednocześnie jako sesja UI i jako credentials pipeline’u Calendar/Notes/Drive.
- **Boli:** nadmiarowe scope’y przy loginie, trudny audyt, wyciek uprawnień integracji do sesji przeglądarki, mylenie IdP z adapterem I/O.
- **Zamiast:** logowanie Google (etap 1+) = OpenID / e-mail domeny → sesja JWT aplikacji; Calendar/Notes = osobne credentials workera/admina (`architektura.md`, `bezpieczenstwo_i_rodo.md`).

### Traktowanie „Zaloguj z Google” jako zmiany ACL

- **Unikać:** wniosku, że skoro użytkownik jest w Workspace, widzi wszystkie spotkania firmy / działu.
- **Boli:** obejście ACL v1 „przy okazji SSO”.
- **Zamiast:** SSO tylko ustala `User` (firmowy e-mail); odczyt spotkań nadal organizator ∨ uczestnik ∨ admin.

### ACL przez `ProjectMembership` w v1

- **Unikać:** `canView` oparte o membership „na zapas”, bez źródła prawdy zespołu klienta.
- **Boli:** fałszywe poczucie onboardingowego dostępu; rozjazd z polityką firmy.
- **Zamiast:** `clientId` jako metadane; membership poza egzekucją `access` do czasu etapu 3.

### ACL tylko na froncie / w BFF

- **Unikać:** filtrowanie listy spotkań wyłącznie w React lub w BFF „dla wygody”.
- **Boli:** wyciek przez bezpośrednie wołanie API lub zgadnięcie ID.
- **Zamiast:** egzekucja w `api` / `access`; BFF tylko przekazuje sesję.

### 403 vs 404 przy cudzym zasobie

- **Unikać:** `403` z komunikatem „nie masz dostępu do spotkania X” gdy X istnieje.
- **Boli:** enumeracja istniejących ID.
- **Zamiast:** jednolity **404** przy braku ACL (jak w kontrakcie komunikacji).

### Wysyłka surowego transcriptu „na zewnątrz” bez redakcji

- **Unikać:** pomijanie redakcji, bo „to tylko mock” lub „LLM i tak jest bezpieczny”.
- **Boli:** nawyk bez testów; na prod wyciek PII.
- **Zamiast:** redakcja zawsze przed portem summarizera; testy jednostkowe redaktora.

### Transcript / hasło / pełne summary w `audit_log`

- **Unikać:** wrzucanie treści rozmowy lub sekretów do tabeli audytu „na wszelki wypadek”.
- **Boli:** drugi magazyn PII, dłuższa ekspozycja przy wycieku DB, sprzeczność z retencją i RODO.
- **Zamiast:** tylko metadane i kody zdarzeń; treść zostaje w tabelach domenowych pod ACL.

### Mylenie pino z `audit_log` / zapis audytu w controllerze

- **Unikać:** wyłącznie `console`/`pino` zamiast audytu przy ACL i jobach; albo `prisma.auditLog.create` rozrzucone w każdym controllerze.
- **Boli:** brak trwałego śladu biznesowego albo niespójny katalog eventów.
- **Zamiast:** serwis `audit` wspólny dla api i workera; pino nadal na stdout.

### Zaufanie JSON-owi z modelu / mocka bez walidacji

- **Unikać:** `JSON.parse` → zapis do DB.
- **Boli:** half-written summary, UI się wywala, „źródło prawdy” śmieciowe.
- **Zamiast:** Zod w aplikacji; ścieżka `failed` / quarantine.

## Pipeline i kolejka

### Synchroniczne przetwarzanie spotkania w HTTP

- **Unikać:** `POST /demo/run-meeting` (ani `POST /meetings/:id/reprocess`) czeka na cały transcript→summary / sync Google+FF w jednym requeście.
- **Boli:** timeouty, brak odporności, niemożliwy retry kroku.
- **Zamiast:** enqueue pg-boss; HTTP zwraca `jobId` / `meetingId` + status.

### „Aktualizuj” jako fat-sync Google / ściąganie nagrania

- **Unikać:** osobnego subsystemu „synchronizacja Calendar+Drive+FF+media” w API; persistencji pliku audio przy reprocess; kasowania istniejącego summary, gdy re-fetch wróci pusty.
- **Boli:** timeouty HTTP, duplikaty, utrata kanonu, mylenie on-demand media z pipeline treści.
- **Zamiast:** ten sam `meeting.process` + `externalMeetingId`; upgrade-only; nagranie = `GET .../recording` (`data_flow.md` §5a).

### Brak idempotencji jobów

- **Unikać:** każde kliknięcie Test = nowy wiersz spotkania dla tego samego fixture.
- **Boli:** duplikaty, zły ACL, bałagan w demo i na prod przy retry webhooka.
- **Zamiast:** klucz po `externalMeetingId`; update in place.

### Osobny „fałszywy happy path” tylko dla UI

- **Unikać:** przycisk Test zapisuje hardkodowane summary z pominięciem workera.
- **Boli:** PoC nie dowodzi mechanizmu; regresje niewidoczne.
- **Zamiast:** Test → ten sam `meeting.process`.

### Redis + Bull „bo tak się robi”, przy decyzji o pg-boss

- **Unikać:** dokładanie brokera bez potrzeby w v1.
- **Boli:** więcej kontenerów i failure modes w zadaniu z limitem czasu.
- **Zamiast:** trzymać pg-boss, dopóki skala nie wymusi zmiany (z uzasadnieniem).

## Next.js / BFF

### `"use client"` na całe drzewo + logika domenowa w przeglądarce

- **Unikać:** reguły kto widzi spotkanie w komponencie klienckim jako jedyna ochrona.
- **Boli:** łatwy bypass; puchnięcie bundle.
- **Zamiast:** App Router; BFF cienki; ACL na api.

### BFF jako drugi backend domenowy

- **Unikać:** orkiestracja Prisma / jobów / redakcji w Route Handlers Next; przenoszenie ACL treści lub reguł domenowych do BFF.
- **Boli:** dwa miejsca prawdy, niespójne testy.
- **Zamiast:** BFF = proxy, cookies, ewentualnie składanie DTO pod widok.
- **Wyjątek (wymagany w tym produkcie):** wolno - i jest wymagane - walidować na BFF pola **wyłącznie UI** przed proxy auth register (`passwordConfirm` vs `password`; mismatch → 400 bez wołania API). To nie otwiera drogi do ACL treści, enqueue ani drugiego backendu domenowego w Next.

### Sekrety i klucze vendorów w `NEXT_PUBLIC_*` lub w web

- **Unikać:** klucz Fireflies / LLM w froncie.
- **Boli:** wyciek w bundle.
- **Zamiast:** tylko `api` / `worker`; w v1 i tak atrapy.

### Surowy JSON `summary` w komórce tabeli

- **Unikać:** `JSON.stringify(summary)` (ew. `truncate`) jako jedyna treść kolumny wyniku na `/meetings`.
- **Boli:** nieczytelny UI; użytkownik nie widzi `shortSummary` / zadań; wrażenie „dumpu technicznego” zamiast skrótu spotkania.
- **Zamiast:** parser kanonicznego kształtu + kolumna **Wynik** (`shortSummary`, liczniki, opcjonalne Szczegóły; przy `failed` komunikat) — `frontend.md`.

## Integracje i kontrakty

### Uzależnienie domeny od schemy Fireflies 1:1

- **Unikać:** encje DB o polach `raw_text`, `dateString`, `meeting_attendees` 1:1 z GraphQL.
- **Boli:** każda zmiana API FF łamie Wasz model; trudny drugi źródłowy adapter.
- **Zamiast:** port + mapowanie (anti-corruption); typy w contracts bez Zod vendora.

### Użycie `summary.*` z Fireflies jako kanonu

- **Unikać:** zapis `short_summary` / `action_items` z FF do DB zamiast UC1; traktowanie stringa FF jako Zod.
- **Boli:** brak kontroli nad „kto/do kiedy”; rozjazd z briefem; druga „prawda”.
- **Zamiast:** FF = transcript; kanon = UC1 LlmClient + Zod (`llm_i_asystent.md`).

### Persist ephemeral `audio_url` / `video_url` w Postgres

- **Unikać:** kolumna na `Meeting` (lub równoważna) z URL nagrania z Fireflies „żeby mieć link”.
- **Boli:** URL wygasa (~24 h u vendora); martwe linki w UI; fałszywe poczucie magazynu media; zbędne PII/powierzchnia wycieku.
- **Zamiast:** on-demand po ACL → świeży URL (mock w etapie 0; adapter FF później, **tylko** przy zgodzie); odpowiedź JSON `{ url }` bez zapisu do DB (`dokumentacja_komunikacji.md`).

### Notes by Gemini traktowane jako nagranie FF

- **Unikać:** serwowania Gemini Notes jako `recording` / podpinania on-demand FF przy braku zgody; mylenia tekstu Notes z audio.
- **Boli:** naruszenie normy RODO (nagrywanie bez zgody); fałszywy UX „odsłuchu”.
- **Zamiast:** bez `[record-ok]` — treść z `gemini-notes` (+ UC1 gdy tekst); bez buttonu / mechanizmu nagrania FF (`bezpieczenstwo_i_rodo.md`).

### Calendar jako magazyn audio / fat-adapter „wszystko Google+FF”

- **Unikać:** traktowania Calendar / Meet linku jako źródła nagrania; jednego adaptera łączącego metadane Calendar + FF + Gemini Notes + media; „AI czyta cały opis” zamiast sztywnego tokenu `[record-ok]`.
- **Boli:** niemożliwa podmiana per zgoda; regresja ACL/grup; nieczytelne granice portów; kruche NLP.
- **Zamiast:** port metadanych (Calendar) oddzielony od portu treści (`fireflies` \| `gemini-notes`); Calendar ≠ audio; zgoda = dokładny tag `[record-ok]` w `description`.

### Drugi vendor LLM „tylko do asystenta”

- **Unikać:** osobna integracja chatowa obok summarizera.
- **Boli:** podwójne klucze, redakcja, limity, niespójne modele.
- **Zamiast:** jeden LlmClient; UC2 = kolejny use case.

### Q&A bez ACL / bez retrieval

- **Unikać:** pytanie do modelu z dostępem do całej bazy lub bez cytowania źródeł.
- **Boli:** wyciek treści spotkań; halucynacje.
- **Zamiast:** ACL → retrieval → grounded answer.

### Zod w `packages/contracts` „dla wszystkich”

- **Unikać:** wspólna paczka z Zod jako jedyny runtime dla api/worker/web.
- **Boli:** zbędne sprzężenie frontu z walidacją workera; sprzeczne z decyzją architektury.
- **Zamiast:** contracts = typy; Zod w aplikacji egzekwującej granicę.

## DX i testy

### Testy tylko e2e „czy strona się otwiera”

- **Unikać:** brak unitów na ACL i redakcję.
- **Boli:** drogie, kruche testy; krytyczne reguły bez siatki bezpieczeństwa.
- **Zamiast:** piramida - dużo unitów ACL/redaction/Zod; mniej integracji pipeline; e2e oszczędnie.

### Mock, który nie da się podmienić na adapter

- **Unikać:** `if (demo) return hardcoded` rozrzucone po serwisach.
- **Boli:** prawdziwa integracja wymaga przepisywania use case'ów.
- **Zamiast:** port + implementacje mock / fireflies / gemini-notes (+ osobny port Calendar); zaślepka v0 na tych samych powierzchniach.

### God `utils.ts` / `helpers.ts`

- **Unikać:** worek niepowiązanych funkcji „na wszelki wypadek”.
- **Boli:** ukryte zależności, złe nazewnictwo, kopiowanie między appami.
- **Zamiast:** nazwy domenowe (`redaction`, `access`, `meeting-idempotency`).

## Mapowanie na inne dokumenty

- Styl i granice: `architektura.md`
- Drzewo katalogów: `architektura_katalogi_pliki.md`
- Kontrakty: `dokumentacja_komunikacji.md`
- Frontend: `frontend.md`
- LLM: `llm_i_asystent.md`
- Przepływy: `data_flow.md`
- Observability / audit: `observability.md`
