---
wersja: 9
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-31
---

# SPEC - Frontend (`apps/web`)

Norma implementacji warstwy Next.js: auth UI, dashboard z tabelą, mock wyszukiwarki, BFF, SSE po Test, button nagrania (demo). Kontekst: `docs/frontend.md`, przepływ Test / on-demand: `docs/data_flow.md`. Kontrakty / SSE / recording: `SPEC-KOMUNIKACJA`, sesja/ACL: `SPEC-AUTH_I_ACL`. Warstwy: `SPEC-ARCHITEKTURA`. Smoke: `SPEC-TESTY`.

## Cel / zakres

- Minimalny UI v1: logowanie/rejestracja, widok domyślny (tabela + Test + button nagrania demo), podstrona wyszukiwarki (mock).
- BFF jako cienkie proxy; aktualizacja tabeli po demo przez **SSE** (bez osobnej trasy detail UI); on-demand nagranie przez BFF.
- Zakaz przenoszenia ACL i sekretów do przeglądarki.

**Poza tą wersją:** pełny panel produktowy (w tym admin erase treści / ręczne `clientId`), branding, Q&A UI, dark mode jako wymóg, PWA, Playwright E2E, ukrywanie Test za flagą UI, prawdziwa wyszukiwarka/RAG, UI zbierania zgody / egzekucja gałęzi Gemini Notes w obecnym UI, egzekucja widoczności buttonu nagrania wg zgody (must-have etap 1+ / po FF + procesie zgód; norma produktowa w docs).

## Powiązanie ze stylem z docs

| Ustalenie | Wiązanie |
|-----------|----------|
| Styl **Web (BFF + UI)** | Cienki BFF; brak ACL w React |
| Cookie HttpOnly | Sesja tylko przez cookie; BFF przekazuje |
| RSC / client | Server Components domyślnie; `"use client"` przy interakcji |
| `SPEC-ARCHITEKTURA` | Bez logiki pipeline / ACL w `web` |

**Wyjątek względem stylu globalnego:** brak.

## Wymagania egzekwowalne

### Routing i layout

F-1. `/` - auth: jeden wspólny komponent login / register z klasycznym przełączaniem trybu.
Zmiana względem: wcześniejsza norma F-1 („login/register z przełączaniem trybu” bez szczegółów UX). Obowiązuje teraz:
- **tryb startowy:** login;
- **CTA submit:** login - „Zaloguj się”; register - „Zarejestruj się”;
- **pod formularzem** tekstowe buttony (bez innego, konkurencyjnego mechanizmu): w login - „Nie masz konta? Zarejestruj się!”; w register - „Masz już konto? Zaloguj się!”;
- w trybie **register:** pole potwierdzenia hasła (`passwordConfirm`); **wymagana** walidacja zgodności z `password` w UI **przed** submitem (przy mismatch UI **nie** wysyła rejestracji);
- po sukcesie **login lub register** (oba ustawiają cookie sesji) → redirect na dashboard (widok domyślny).

F-2. Brak ważnej sesji na chronionych trasach UI → **redirect na `/`**.

F-3. Po zalogowaniu: layout z prostym **sidebarem** przełączającym:
- widok **domyślny** (tabela spotkań + Test),
- widok **wyszukiwarki** (osobna podstrona).

F-4. **Brak** osobnej trasy UI detail spotkania (`/meetings/:id`) w v1 - podgląd wyniku w **tabeli** na widoku domyślnym.

### Widok domyślny

F-5. Tabela spotkań z API (`GET` lista przez BFF), wyłącznie dane już po ACL po stronie `api`. Element listy obejmuje pola wyniku potrzebne do kolumny podglądu: **`summary`** oraz **`failureReason`** (`SPEC-KOMUNIKACJA` K-2a). UI mapuje je na skrót / komunikat w wierszu.
Zmiana względem: wcześniejsze F-5 bez wymogu treści wyniku na liście (poleganie wyłącznie na SSE / detail).

F-6. Paginacja: select limitu **10 / 25 / 50 / 100** oraz parametr **`page`** (1-based; norma `SPEC-AUTH_I_ACL`); oba wysyłane do API.

F-7. Przycisk **Test** - zawsze widoczny po zalogowaniu (bez flagi UI ukrywającej przycisk). Wywołuje BFF → `POST /demo/run-meeting`. **Bez** UI wyboru fixture - losowanie mocka po stronie API (katalog 10; `SPEC-KOMUNIKACJA` K-5).

F-7a. **Button nagrania (demo v0):** w wierszu tabeli (lub równoważnie w zakresie UI listy v1) **zawsze widoczny** po zalogowaniu — świadomy wyjątek demonstracyjny (`docs/bezpieczenstwo_i_rodo.md`). Po kliknięciu: BFF → `GET /api/meetings/:id/recording` → API → JSON `{ url }` → otwarcie `url` (np. nowe okno/karta). **Zakaz** hardcodu URL wyłącznie w React jako jedynej ścieżki „produkcyjnej”.
**Norma docelowa (etap 1+ / prod):** brak mechanizmu nagrania FF **bez** zgody na nagrywanie (brak buttonu); wyjątek demo v0 powyżej **nie** otwiera nagrania FF bez zgody w prod i **nie** jest sprzeczny z regułą prod. UI obecnej wersji **nie** musi egzekwować gałęzi Gemini Notes ani modelu zgody.
Zmiana względem: brak normy UI dla nagrania — obowiązuje szkielet on-demand przez BFF/API (`SPEC-KOMUNIKACJA` K-5b) + jawny rozdział demo v0 vs prod.

F-8. Po sukcesie enqueue:
1. UI używa `meetingId` z odpowiedzi (własny run sesji) i otwiera **SSE** (przez BFF) dla tego id (`SPEC-KOMUNIKACJA`).
2. Użytkownik **zostaje** na bieżącym widoku.
3. Tabela **aktualizuje / dokłada wiersz** (status `pending` → `processing` → `completed` | `failed`; po `completed` - dostępne pola summary / zadań w wierszu lub rozwinięciu).
4. Przy `failed` - status + komunikat w UI; **bez** redirectu.
5. **Multi-tester:** wielu użytkowników na jednej instancji - każdy widzi własne spotkania dema (ACL); brak założenia jednego globalnego wiersza dema współdzielonego między kontami.
6. **Ponowny Test** tego samego użytkownika dodaje kolejny wiersz (akceptowalne w v1; lista może rosnąć).
7. Po **odświeżeniu** widoku (ponowny `GET` listy) wiersze `completed` / `failed` nadal pokazują skrót summary / komunikat błędu z pól listy (F-5) — **zakaz** traktowania wyłącznie stanu SSE jako źródła kolumny wyniku.
Zmiana względem: F-8 bez jawnego wymogu przetrwania podglądu wyniku po reloadzie.

F-9. Data-fetching: natywny **`fetch`** (bez React Query / SWR jako wymogu).

### Wyszukiwarka (mock)

F-10. Osobna podstrona dostępna z sidebara.

F-11. UI może zawierać input / listę wyników, ale dane są **statycznym mockiem** (hardcode / fixture frontowy) z jawną adnotacją atrapy.

F-12. **Zakaz** wołania LLM, endpointu search/RAG oraz UC2 z tej podstrony w v1.

### BFF

F-13. Route Handlers w `app/api/*`: proxy auth, meetings (lista/detail API jeśli potrzebne), demo, **recording** (`/meetings/:id/recording`), **SSE**; ustawianie / przekazywanie cookie HttpOnly.

F-14. BFF nie egzekwuje ACL, nie enqueue’uje pg-boss bezpośrednio, nie woła adapterów źródła/LLM / media.

### Bezpieczeństwo UI

F-15. Zakaz przechowywania access/refresh w `localStorage` / `sessionStorage`.

F-16. Zakaz wrażliwych sekretów w `NEXT_PUBLIC_*` i w bundlu klienta.

F-17. Na produkcji: nie logować pełnego transcriptu w konsoli przeglądarki.

### Render

F-18. **RSC** domyślnie; `"use client"` tylko dla interakcji (formularz auth, sidebar, Test, button nagrania, EventSource/SSE, select paginacji).

## Norma: wzorce

### Wymagane

- Next.js App Router + BFF w `app/api/*`.
- Tailwind CSS + shadcn/ui; layout roboczy bez brandingu produktowego.
- Auth UI: klasyczny UX login/register wg F-1 (start login, CTA, linki tekstowe, `passwordConfirm` + match przed submit w register).
- Sidebar: domyślny ↔ wyszukiwarka.
- Tabela + SSE po Test (aktualizacja in-place).
- Button nagrania demo (F-7a) → BFF → API → otwarcie `url`.
- Mock wyszukiwarki bez backendu AI.

### Nie wolno

- ACL / „dopuszczania po ID” wyłącznie w UI.
- Osobnej trasy detail UI w v1 jako głównej ścieżki po Test.
- Redirectu na detail po Test (norma: zostań + SSE).
- React Query jako wymogu v1.
- Playwright jako must-have v1.
- Ukrywania Test za `NEXT_PUBLIC_*`.
- Prawdziwego search/LLM z podstrony wyszukiwarki.
- Hardcodu URL nagrania w React jako jedynej ścieżki produkcyjnej (F-7a).

## Zatwierdzony stack (obszar)

| Element | Wybór |
|---------|--------|
| Framework | Next.js (App Router) |
| Style | Tailwind CSS |
| Komponenty | shadcn/ui |
| Data-fetching | `fetch` |
| SSE (klient) | EventSource (lub równoważne) wobec BFF |
| Testy UI v1 | smoke `next build` / typecheck (`SPEC-TESTY`) |

Wersje pakietów: zgodne z repo / aktualnym LTS - bez pinowania w tym SPEC.

## Kryteria akceptacji

- [ ] `/` startuje w trybie **login**; CTA i linki tekstowe przełączania zgodne z F-1.
- [ ] W trybie register przy mismatch `password` / `passwordConfirm` UI **nie** wysyła submitu rejestracji.
- [ ] Niezalogowany użytkownik na dashboardzie trafia na `/`.
- [ ] Sidebar przełącza widok domyślny i wyszukiwarkę; wyszukiwarka nie woła API LLM/search.
- [ ] Test enqueue’uje demo; SSE aktualizuje / dokłada wiersz bez zmiany trasy; bez UI wyboru fixture; ponowny Test = kolejny wiersz (F-7/F-8).
- [ ] Button nagrania zawsze widoczny w v0; klik idzie przez BFF/API i otwiera `url` z JSON (F-7a) — bez hardcodu jako jedynej ścieżki produkcyjnej.
- [ ] Po completed/failed i odświeżeniu `/meetings` kolumna podsumowania / błędu pozostaje wypełniona z `GET` listy (F-5 / F-8.7).
- [ ] Limit listy tylko z {10,25,50,100}.
- [ ] Brak sekretów sesji w Web Storage; BFF nie zawiera reguł ACL.
- [ ] `"use client"` nie obejmuje całych drzew bez potrzeby interakcji.

## Poza tą wersją

- Pełny panel, multi-modułowa nawigacja, branding Vinseo.
- Osobny widok detail jako strona produktowa.
- UI zbierania zgody / ukrywanie buttonu nagrania wg zgody / egzekucja Gemini Notes w UI (norma prod w docs; etap 1+).
- Chat Q&A / prawdziwa wyszukiwarka.
- Dark mode / PWA / mobile-first polish jako wymóg.
- E2E Playwright.
