---
wersja: 7
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# Frontend

Opis warstwy `apps/web` Firmowego asystenta spotkań: zakres UI w etapie 0 / v1 kodu, stack, granice względem API. Szerszy kontekst: `architektura.md`, `dokumentacja_komunikacji.md`, `plan_wdrozenia_etapy.md`. Norma implementacji: `spec/SPEC-FRONTEND.md`.

## Cel warstwy web

- Dać **minimalny**, działający interfejs od początku projektu (nie „frontend kiedyś”).
- Umożliwić logowanie / rejestrację, tabelę spotkań z demo (**przycisk Test** + SSE) oraz **mock** podstrony wyszukiwarki.
- Nie przenosić reguł ACL ani logiki domenowej do przeglądarki.

## Stack UI

| Element | Wybór | Uzasadnienie |
|---------|--------|--------------|
| Framework | **Next.js** (App Router) | Zgodność z architekturą; BFF w `app/api/*` |
| Style | **Tailwind CSS** (już w projekcie) | Szybki układ bez osobnego design systemu |
| Komponenty | **shadcn/ui** | Gotowe bloki na start; da się rozwinąć na etapach 1+ |
| Data-fetching | **`fetch`** | Bez React Query jako wymogu v1 |
| Render | RSC domyślnie; `"use client"` przy interakcji | Formularz auth, sidebar, Test, SSE, select limitu |

**Bez brandingu** produktowego w v1 — czytelny, prosty layout roboczy.

## Widoki (v1)

### 1. Strona główna `/` — auth

- Jeden wspólny komponent **logowanie / rejestracja** z klasycznym przełączaniem trybu (różne pola i CTA wg trybu).
- **Tryb startowy:** login.
- **CTA submit:** login — „Zaloguj się”; register — „Zarejestruj się”.
- **Pod formularzem** tekstowe buttony przełączające tryb (bez innego, konkurencyjnego mechanizmu):
  - w trybie login: „Nie masz konta? Zarejestruj się!”
  - w trybie register: „Masz już konto? Zaloguj się!”
- W trybie **register:** drugie pole hasła (powtórz) — `passwordConfirm`; **wymagana** zgodność z pierwszym polem **przed** submitem (UI nie wysyła rejestracji przy mismatch).
- Po sukcesie **login lub register**: od razu cookie sesji → **redirect** na dashboard (widok domyślny).
- Sesja: cookie **HttpOnly** (access JWT 15 min + refresh — `SPEC-AUTH_I_ACL`); **zakaz** `localStorage` / `sessionStorage` na sekrety.
- Brak sesji na chronionych trasach → redirect na `/`.

### 2. Layout po zalogowaniu — sidebar

Prosty sidebar przełącza:

| Widok | Opis |
|-------|------|
| **Domyślny** | Tabela spotkań + przycisk Test |
| **Wyszukiwarka** | Osobna podstrona — **statyczny mock** (bez LLM / search API) |

### 3. Widok domyślny — tabela + Test

- Lista spotkań z API (już po ACL v1: organizator / uczestnik / admin); paginacja backendowa: select limitu **10 / 25 / 50 / 100** + parametr **`page`** (1-based).
- **Brak** osobnej strony detail (`/meetings/:id`) w UI v1 — wynik pipeline widać w **wierszu tabeli**.
- Panel admin (erase treści na żądanie klienta, ręczne przypisanie `clientId`) — **poza UI v1**; norma w `bezpieczenstwo_i_rodo.md`.
- **Przycisk Test** — zawsze widoczny po zalogowaniu (bez flagi UI ukrywającej przycisk).
- Po Test: `POST` demo → otwarcie **SSE** dla `meetingId` → użytkownik **zostaje** na widoku; tabela **aktualizuje wiersz** (`processingStatus`, po `completed` skrót summary/zadań; po `failed` status + komunikat). Bez redirectu na detail.
- Wylogowanie: BFF/API.

### 4. Wyszukiwarka (mock)

- Input / ewentualna lista wyników z **hardcodowanym** mockiem i adnotacją atrapy.
- **Zakaz** wołania LLM, RAG i endpointów search w v1.

## BFF (`app/api/*`)

- Proxy do Nest API: auth (w tym refresh), meetings, demo, **SSE** (`/meetings/:id/events`).
- Przekazywanie / ustawianie cookie HttpOnly.
- **Nie** egzekwuje ACL; **nie** enqueue’uje jobów poza wywołaniem API.

Szczegóły tras: `dokumentacja_komunikacji.md`.

## Zasady bezpieczeństwa UI

| Reguła | Opis |
|--------|------|
| Sesja | Tylko cookie HttpOnly |
| ACL | Wyłącznie odpowiedź API (404 / lista przefiltrowana) |
| Sekrety | Brak kluczy vendorów w bundlu; żadne wrażliwe `NEXT_PUBLIC_*` |
| Treść | Nie logować transcriptu w konsoli przeglądarki na prod |

## Struktura katalogów (skrót)

Zgodnie z `architektura_katalogi_pliki.md`:

```text
apps/web/
  app/
    page.tsx                 # auth (login/register)
    (dashboard)/...          # layout + sidebar; widok domyślny / wyszukiwarka
    api/                     # BFF Route Handlers (w tym proxy SSE)
  components/                # auth form, tabela, shadcn
```

## Testy frontu (v1)

Zgodnie z `testy.md`: bez Playwright jako must-have; smoke build / typecheck. Regresje ACL i pipeline — po stronie api/worker.

## Świadomie poza v1 (frontend)

- Pełny panel produktowy, branding / design system firmowy.
- Osobna strona detail spotkania jako główna nawigacja produktowa.
- Ukrywanie Test za `NEXT_PUBLIC_DEMO_UI`.
- Chat Q&A / prawdziwa wyszukiwarka (UC2).
- Dark mode jako wymóg, PWA, mobile-first polish.
- Przechowywanie JWT w storage przeglądarki.

## Mapowanie na inne dokumenty

- Procesy i granice: `architektura.md`
- Kontrakty BFF/API / demo / SSE: `dokumentacja_komunikacji.md`
- Przepływ Test: `data_flow.md`
- Etap 0: `plan_wdrozenia_etapy.md`
- LLM / przyszły asystent UI: `llm_i_asystent.md`
- Anty-patterny Next/BFF: `anty_patterny.md`
- Testy (smoke UI): `testy.md`
- Spis dokumentacji: `README.md`
