---
wersja: 6
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-29
---

# Plan wdrożenia - etapy

Jak dojść od szkieletu (oddanie / v1 kodu) do użycia w całej firmie. Spójne z `dokumentacja_koncepcyjna.md`, `bezpieczenstwo_i_rodo.md`, `koszty_i_warianty.md`, `deployment.md`.

## Przegląd etapów

| Etap | Nazwa | Cel |
|------|-------|-----|
| **0** | Szkielet | Działający system w repo: pipeline, ACL, testy, docs, CI; mocki zamiast vendorów |
| **1** | Pilot | Mały zespół, **callе z klientem**; prawdziwy capture i LLM; produkcyjny VPS |
| **2** | Rozszerzenie | Więcej zespołów/projektów; retencja automatyczna; ewentualnie Q&A ze źródłami |
| **3** | Cała firma | Szersze typy spotkań wg polityki; confidential; IdP / offboarding dojrzały |

Priorytet produktowy od etapu 1: **zewnętrzne spotkania z klientem** przed masą calli wewnętrznych.

---

## Etap 0 - Szkielet (oddanie rekrutacyjne / fundament)

### Jest

- Monorepo: `api`, `worker`, `web`, `packages/contracts`, Prisma, pg-boss.
- Model danych: spotkania, uczestnicy, transcript, summary, zadania, uprawnienia, `audit_log`.
- Pipeline idempotentny (mock źródła / transcript → redakcja → **UC1 LlmClient mock** + Zod → persist); bez `summary` z FF.
- ACL na API + testy; redakcja + testy.
- Auth e-mail/hasło; access JWT + refresh w Postgres; cookie HttpOnly.
- Frontend wg `frontend.md`: `/` login/register → dashboard (tabela + sidebar, mock wyszukiwarki) + przycisk Test + SSE.
- Przycisk **Test** / demo: sesja pracownika → enqueue (bez flagi `DEMO_ENABLED`).
- CI: testy na PR; ochrona `main`.
- Dokumentacja w `docs/`.
- **Root `README.md`** zgodny z wymaganiami oddania zadania (osobno od `docs/`):
  - jak uruchomić całość (Compose + procesy / komendy);
  - co działa, co jest atrapą, czego nie zrobiono i dlaczego;
  - jak używano AI przy zadaniu i co trzeba było poprawić po modelu;
  - (opcjonalnie, ale wskazane) link do dokumentu Części A ≤5 stron w repo lub PDF.

### Czego świadomie nie ma w etapie 0

- Pełny panel UI / design system produktu.
- Powiadomienia (mail, Slack).
- Prawdziwa integracja Google Workspace / Fireflies.
- Prawdziwy LLM (tylko mock LlmClient / UC1).
- Q&A / RAG ze wskazaniem źródła (**UC2** na tym samym providerze - etap 2).
- Automatyczny CD na VPS (jest CI + checklista ręczna).
- HTTP do odczytu `audit_log`.
- Konta dla klientów zewnętrznych.

### Kryteria „etap 0 działa”

- Compose + procesy; demo spotkania komendami / Test.
- Dwukrotne przetworzenie tego samego fixture → jedno spotkanie.
- Testy ACL i redakcji zielone; CI na PR zielone.
- Root `README.md` zawiera sekcje: uruchomienie, atrapy/zakres, użycie AI (oraz wskazuje Część A, gdy jest w repo).

---

## Etap 1 - Pilot (callе z klientem)

### Zakres

- Wybór 1–2 zespołów opiekujących się klientami.
- Adapter źródła produkcyjny (Fireflies **lub** Meet-native - decyzja koszt/RODO: `koszty_i_warianty.md`, `bezpieczenstwo_i_rodo.md`).
- Prawdziwy **LlmClient** / UC1 summarize (np. GPT-5.2); redakcja włączona; FF = transcript only.
- Nginx + TLS na VPS; demo tylko dla zaufanych kont (brak wyłącznika `DEMO_ENABLED` w kontrakcie).
- Proces zgód na Meet / w umowie z klientem.
- Mapowanie użytkowników → projekty/klienci (membership pod ACL).

### Kryteria sukcesu etapu 1

| Metryka | Próg |
|---------|------|
| Callе klienckie zespołu pilotażowego z zapisanym summary w systemie | **≥ 70%** w oknie pilota |
| Czas od końca Meet do dostępnego summary | **&lt; 1 h** (p95 roboczo) |
| Incydenty ACL (wyciek treści do osoby bez uprawnień) | **0** |
| Feedback leadów pilota | „użyteczne w codziennej pracy” (jakościowo / krótka ankieta) |
| Job `failed` bez eskalacji / ignorowania | Przegląd `audit_log` + pino co tydzień |

### Poza etapem 1

- Wszyscy pracownicy firmy.
- Q&A asystent.
- Pełny UI produktowy (wystarczy sprawny odczyt listy/detail + ewentualnie lekki panel).

---

## Etap 2 - Rozszerzenie

### Zakres

- Kolejne zespoły / projekty podłączone do ACL.
- Job retencji (transcript 90 dni, summary 12 mies., `audit_log` 90 dni).
- Dopracowanie mapowania Fireflies/Meet i monitoring faili.
- Opcjonalnie: pierwsze **Q&A ze źródłami** (**UC2**, ten sam LlmClient; tylko w ACL) - cienki MVP asystenta.
- Opcjonalnie: zmniejszenie seatów FF / przejście części ruchu na wariant B (koszty).

### Kryteria sukcesu etapu 2

- Stabilny odsetek przetworzonych calli klienckich w objętych zespołach (utrzymanie ≥70% lub wyżej).
- Retencja działa (brak nieograniczonego wzrostu transcriptów).
- Brak regresji ACL przy większej liczbie projektów.
- Jeśli Q&A: odpowiedzi tylko ze spotkań dozwolonych + cytowanie źródła.

---

## Etap 3 - Cała firma

### Zakres

- Polityka: które spotkania wewnętrzne wchodzą (1:1, rekrutacje, zarząd - często z `confidential`).
- Offboarding zsynchronizowany z IdP / grupami Google (jeśli dostępne).
- Ewentualny odczyt `audit_log` dla admina (HTTP) - decyzja osobna.
- Szkolenie / komunikacja wewnętrzna; właściciel produktu po stronie Vinseo.

### Kryteria sukcesu etapu 3

- Nowa osoba w projekcie odtwarza historię ustaleń z dostępnych spotkań w rozsądnym czasie (bez pytania „co ustaliliśmy?” w ciemno).
- Confidential respektowane (brak FF/LLM zewnętrznego tam, gdzie flaga).
- Koszt miesięczny zgodny z wybranym wariantem A/A’/B po actuals.

---

## Zależności między etapami a kosztami

| Etap | Typowy wariant kosztowy |
|------|-------------------------|
| 0 | Głównie czas dev + lokalny Compose (≈ 0 opex vendor) |
| 1 | A’ (mniej godzin) lub B; VPS 80–150 PLN; LLM niski |
| 2–3 | Skala seatów FF vs Workspace-lean - przegląd `koszty_i_warianty.md` |

## Ryzyka przejść etapów

| Ryzyko | Mitygacja |
|--------|-----------|
| Brak zgód klientów | Nie włączamy capture; etap 1 blokuje się na procesie, nie na kodzie |
| FF + RODO | DPA / wariant B; confidential |
| ACL przy rosnącej liczbie projektów | Testy + audyt deny; code review access |
| Oczekiwanie pełnego ChatGPT na spotkaniach w etapie 1 | Trzymać scope: lista + detail + summary; Q&A dopiero 2+ |

## Mapowanie na inne dokumenty

- Zakres v1 produktu: `dokumentacja_koncepcyjna.md`
- Frontend etapu 0: `frontend.md`
- LLM UC1/UC2: `llm_i_asystent.md`
- Bezpieczeństwo: `bezpieczenstwo_i_rodo.md`
- Koszty: `koszty_i_warianty.md`
- Deploy: `deployment.md`
- Przepływy: `data_flow.md`
