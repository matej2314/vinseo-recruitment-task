---
wersja: 15
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-11-01
---

# Plan wdrożenia - etapy

Jak dojść od szkieletu (oddanie / v1 kodu) do użycia w całej firmie. Spójne z `dokumentacja_koncepcyjna.md`, `bezpieczenstwo_i_rodo.md`, `koszty_i_warianty.md`, `deployment.md`.

## Przegląd etapów

| Etap | Nazwa | Cel |
|------|-------|-----|
| **0** | Szkielet | Działający system w repo: pipeline, ACL v1, testy, docs, CI; mocki zamiast vendorów; auth e-mail/hasło |
| **1** | Pilot | Mały zespół; prawdziwy capture i LLM; **logowanie Google Workspace** (powiązanie kont z e-mailem Calendar); produkcyjny VPS; różne typy spotkań (równy priorytet) |
| **2** | Rozszerzenie | Więcej użytkowników; retencja automatyczna; erase admin; ewentualnie Q&A ze źródłami; dopracowanie IdP |
| **3** | Cała firma | Membership zespołu klienta (onboarding historii); polityka grup Calendar; confidential/vendor w prod; offboarding zsynchronizowany z IdP |

**Priorytet typów spotkań:** wszystkie (wewnętrzne i zewnętrzne) mają **identyczny** priorytet produktowy. Wrażliwe (1:1, rekrutacje, zarząd) - flaga `confidential`, nie „odkładanie na później”.

---

## Etap 0 - Szkielet (oddanie rekrutacyjne / fundament)

### Jest

- Monorepo: `api`, `worker`, `web`, `packages/contracts`, Prisma, pg-boss.
- Model danych: spotkania (w tym organizator, status linku klienta), uczestnicy, transcript, summary, zadania, uprawnienia, `audit_log`; `ProjectMembership` może istnieć w schemacie **bez** roli ACL v1.
- Pipeline idempotentny (mock źródła / transcript → redakcja → **UC1 LlmClient mock** + Zod → persist); metadata-only gdy brak treści; bez `summary` z FF jako kanonu.
- ACL na API: **organizator ∨ uczestnik ∨ admin** + testy; redakcja + testy.
- Auth **e-mail/hasło** (norma etapu 0); access JWT + refresh w Postgres; cookie HttpOnly. Logowanie Google Workspace — **poza etapem 0** (etap 1+).
- Frontend wg `frontend.md`: `/` login/register → dashboard (tabela + sidebar, mock wyszukiwarki) + przycisk Test + SSE + **button nagrania (demo, zawsze widoczny)**.
- Przycisk **Test** / demo: sesja pracownika → enqueue (bez flagi `DEMO_ENABLED`).
- **Szkielet on-demand nagrania:** endpoint `GET /meetings/:id/recording` + mock URL (`https://example.com/...`) + BFF proxy; **bez** trwałego `audio_url` w DB (`dokumentacja_komunikacji.md`).
- **Zaślepka portów gałęzi zgody (major Faza 3.7):** port metadanych (Calendar) + adapter treści `gemini-notes` jako szkielet / NotImplemented w `apps/worker` — **bez** OAuth i prawdziwych wywołań Google; happy-path nadal mock. Norma produktowa gałęzi (Calendar + FF vs Gemini Notes) jest w docs; działająca logika = etap 1+.
- CI: testy na PR; ochrona `main`.
- Dokumentacja w `docs/`.
- **Root `README.md`** zgodny z wymaganiami oddania zadania (osobno od `docs/`):
  - jak uruchomić całość (ścieżka A: `pnpm db:up` + `dev:*`; ścieżka B: `pnpm dev:stack:up`);
  - co działa, co jest atrapą, czego nie zrobiono i dlaczego;
  - jak używano AI przy zadaniu i co trzeba było poprawić po modelu;
  - (opcjonalnie, ale wskazane) link do dokumentu Części A ≤5 stron w repo lub PDF.

### Czego świadomie nie ma w etapie 0

- Pełny panel UI / design system produktu; panel erase admin.
- Powiadomienia (mail, Slack).
- **Działająca** integracja Google Calendar / Notes by Gemini / Fireflies / HubSpot (w tym prawdziwy resolve URL nagrania z FF — w etapie 0 tylko mock + zaślepka portów).
- **Logowanie kontem Google Workspace** (IdP) — w etapie 0 zostaje e-mail/hasło.
- Model / pole zgody / `contentSource` w Prisma; egzekucja widoczności buttonu wg `[record-ok]` (norma produktowa w docs; w etapie 0 wyjątek demo).
- Prawdziwy LLM (tylko mock LlmClient / UC1).
- Q&A / RAG ze wskazaniem źródła (**UC2** - etap 2+).
- Membership ACL „zespołu klienta”; ekspansja grup Workspace.
- Automatyczny CD na VPS (jest CI + checklista ręczna).
- HTTP do odczytu `audit_log`.
- Konta dla klientów zewnętrznych.

### Kryteria „etap 0 działa”

- Lokalny start A i/lub B (`db:up`+`dev:*` oraz obowiązkowy `dev:stack:up`); demo spotkania komendami / Test.
- Dwukrotne przetworzenie tego samego fixture → jedno spotkanie.
- Testy ACL v1 i redakcji zielone; CI na PR zielone.
- Root `README.md` zawiera sekcje: uruchomienie, atrapy/zakres, użycie AI (oraz wskazuje Część A, gdy jest w repo).

---

## Etap 1 - Pilot

### Zakres

**Pierwsze wejście działającej logiki** na portach zalegalizowanych w etapie 0 (zaślepka → prod):

- Wybór 1–2 zespołów (nie ograniczać wyłącznie do calli klienckich).
- **Logowanie Google Workspace (IdP):** „Zaloguj z Google” ograniczone do domeny firmowej; po sukcesie find-or-create `User` po firmowym e-mailu → ta sama sesja (JWT + refresh / cookie) co w etapie 0. **ACL v1 bez zmian** (organizator ∨ uczestnik ∨ admin). Cel: od startu pilota konta aplikacji = tożsamość Workspace (ten sam e-mail co w Calendar), bez polegania wyłącznie na ręcznej rejestracji „tym samym adresem”. OAuth login **≠** credentials Calendar/Notes (`architektura.md`, `bezpieczenstwo_i_rodo.md`).
- **Calendar** (metadane faktu + `description` + uczestnicy indywidualni) + adaptery treści z **egzekucją `[record-ok]`**: tag w opisie → `fireflies`; brak tagu → `gemini-notes`; UC1 gdy tekst; metadata-only gdy brak treści (`koszty_i_warianty.md`, `bezpieczenstwo_i_rodo.md`).
- **Aktualizuj źródło:** UI + `POST /meetings/:id/reprocess` → ponowne `meeting.process` (ten sam `externalMeetingId`); upgrade-only treści; nagranie nadal on-demand (`data_flow.md` §5a).
- Prawdziwy **LlmClient** / UC1 summarize; redakcja włączona; gdy FF: transcript + **pełny adapter on-demand nagrania** (ten sam kontrakt HTTP co szkielet etapu 0); bez `[record-ok]` — **brak** mechanizmu nagrania FF.
- Szablon Calendar z `[record-ok]` (organizator uzupełnia opis „dla człowieka”); opcjonalnie Apps Script / automatyzacja Workspace dopinająca tag.
- Egzekucja wobec widoczności buttonu nagrania + wybór źródła treści (norma: `bezpieczenstwo_i_rodo.md`).
- Nginx + TLS na VPS; demo tylko dla zaufanych kont.
- Proces zgód na Meet / w umowie z klientem (spójny z użyciem tagu).
- Matching domen e-mail → `Client`; obsługa `unmatched` (ręcznie przez admina).
- Pola stanu zgody / `contentSource` w schemacie przy wdrożeniu adapterów prod (nie w zaślepce v0).

### Kryteria sukcesu etapu 1

| Metryka | Próg |
|---------|------|
| Spotkania objętego zespołu z zapisanym summary (lub świadome metadata-only) | **≥ 70%** w oknie pilota |
| Czas od końca Meet do dostępnego summary (gdy treść była) | **&lt; 1 h** (p95 roboczo) |
| Incydenty ACL (wyciek treści do osoby bez uprawnień) | **0** |
| Feedback leadów pilota | „użyteczne w codziennej pracy” |
| Job `failed` bez eskalacji / ignorowania | Przegląd `audit_log` + pino co tydzień |

### Poza etapem 1

- Wszyscy pracownicy firmy.
- Q&A asystent.
- Membership zespołu klienta.
- Pełny UI produktowy (wystarczy sprawny odczyt listy/detail + ewentualnie lekki panel).
- Dojrzały offboarding zsynchronizowany z IdP w skali całej firmy (etap 3); w pilocie wystarczy dezaktywacja konta + revoke sesji.

---

## Etap 2 - Rozszerzenie

### Zakres

- Kolejne osoby / zespoły (nadal ACL v1: organizator/uczestnik/admin).
- Utrwalenie **logowania Google Workspace** jako domyślnej ścieżki dla nowych użytkowników; ewentualny fallback e-mail/hasło tylko jako break-glass / okres przejściowy.
- Job retencji (transcript 90 dni, summary 12 mies., `audit_log` 90 dni).
- **Erase treści na żądanie klienta** - admin z panelu (`bezpieczenstwo_i_rodo.md`).
- Dopracowanie mapowania źródeł i monitoring faili.
- Opcjonalnie: pierwsze **Q&A ze źródłami** (**UC2**, ten sam LlmClient; tylko w ACL) - cienki MVP asystenta.
- Opcjonalnie: zmniejszenie seatów FF / przejście części ruchu na wariant B (koszty).

### Kryteria sukcesu etapu 2

- Stabilny odsetek przetworzonych spotkań w objętych użytkownikach (utrzymanie ≥70% lub wyżej).
- Retencja działa (brak nieograniczonego wzrostu transcriptów).
- Erase zostawia fakt callu (title, daty, duration, status, clientId); treść usunięta.
- Jeśli Q&A: odpowiedzi tylko ze spotkań dozwolonych + cytowanie źródła.

---

## Etap 3 - Cała firma

### Zakres

- **Membership zespołu klienta** w naszym systemie (nie grupy Google) - onboarding historii bez obecności na każdym callu.
- Polityka zaproszeń Calendar / grup (zwłaszcza „wszyscy pracownicy”) - bez przypadkowego ACL dla całej firmy.
- Confidential vs vendor capture w prod.
- Offboarding zsynchronizowany z IdP Google Workspace (dezaktywacja w aplikacji przy odejściu z organizacji; revoke sesji). Grupy Google **nadal nie** mapują się na ACL spotkań.
- Ewentualny odczyt `audit_log` dla admina (HTTP) - decyzja osobna.
- Szkolenie / komunikacja wewnętrzna; właściciel produktu po stronie Vinseo.

### Kryteria sukcesu etapu 3

- Nowa osoba z membership projektu odtwarza historię ustaleń z dostępnych spotkań w rozsądnym czasie.
- Confidential respektowane według polityki prod.
- Koszt miesięczny zgodny z wybranym wariantem A/A’/B po actuals.

---

## Zależności między etapami a kosztami

| Etap | Typowy wariant kosztowy |
|------|-------------------------|
| 0 | Głównie czas dev + lokalny Compose (≈ 0 opex vendor) |
| 1 | A’ lub B; VPS 80–150 PLN; LLM niski |
| 2–3 | Skala seatów FF vs Workspace-lean - przegląd `koszty_i_warianty.md` |

## Ryzyka przejść etapów

| Ryzyko | Mitygacja |
|--------|-----------|
| Brak `[record-ok]` w opisie Calendar | Bez FF/audio; treść z Notes by Gemini (+ UC1 gdy tekst); metadata-only tylko gdy Notes puste; etap 1 wymaga szablonu tagu + adapterów prod |
| FF + RODO | DPA / wariant B; confidential w prod |
| Za szeroki ACL przez grupy Google | Brak ekspansji „wszyscy”; membership dopiero w etapie 3 i tylko w naszej DB; SSO Google ≠ ACL |
| Mylenie login Google z OAuth Calendar | Osobne klienty / credentials; sesja JWT aplikacji ≠ token pipeline’u |
| Oczekiwanie pełnego ChatGPT na spotkaniach w etapie 1 | Scope: lista + detail + summary; Q&A dopiero 2+ |
| Nowa osoba bez historii w v1/1–2 | Świadome ograniczenie ACL v1; komunikacja do etapu 3 |

## Mapowanie na inne dokumenty

- Zakres v1 produktu: `dokumentacja_koncepcyjna.md`
- Frontend etapu 0: `frontend.md`
- LLM UC1/UC2: `llm_i_asystent.md`
- Bezpieczeństwo: `bezpieczenstwo_i_rodo.md`
- Koszty: `koszty_i_warianty.md`
- Deploy: `deployment.md`
- Przepływy: `data_flow.md`
