---
wersja: 8
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# Architektura - Firmowy asystent spotkań

## Styl globalny

System to **modularny monolit** z wyraźnymi warstwami i zależnościami skierowanymi do wewnątrz:

```text
HTTP / BFF  →  aplikacja (use case / serwisy)  →  porty
                                                    ↑
                         infrastruktura (adapters: DB, kolejka, mocki vendorów)
```

v1: **bez** bogatej warstwy klas domenowych (encje DDD, domain events „wszędzie”) — wystarczają use case’y + porty (`spec/SPEC-ARCHITEKTURA.md`).

- Jedna organizacja, jedna instalacja, **jedna baza PostgreSQL** (stan domenowy, pg-boss oraz tabela audytu **`audit_log`** - trwały ślad kluczowych zdarzeń biznesowych; to nie jest event sourcing ani zamiennik logów procesu).
- Trzy procesy runtime: **`api`**, **`worker`**, **`web`** - wspólny kod kontraktów w monorepo, bez rozbijania na mikroserwisy per capability.
- Integracje zewnętrzne (źródło spotkań / Fireflies, **jeden** provider LLM) przez **porty i adaptery** (hexagonal na granicach I/O), żeby mock w developmentcie był podmienialny na prawdziwą implementację.
- Fireflies dostarcza **transcript**; kanoniczne streszczenie i zadania powstają u nas (UC1 LLM). Obiekt `summary.*` z Fireflies **ignorujemy**. Szczegóły: `llm_i_asystent.md`.

Ten sam styl obowiązuje **we wszystkich** bounded contextach v1 - bez wyjątków „bogatszego DDD tylko w jednym module”.

## Style wewnętrzne per obszar

| Obszar | Styl wewnętrzny | Uwagi |
|--------|-----------------|--------|
| **Ingest / pipeline** | Orkiestracja kroków joba (fetch → normalize → redact → summarize → persist) | Idempotencja, statusy, ponowne uruchomienie bez duplikatów |
| **Meetings + access** | Reguły ACL i odczyt spotkania w warstwie aplikacji (use case / serwis `access`) | Controllers cienkie; egzekucja ACL wyłącznie po stronie zaufanej (`api`) |
| **Audit** | Zapis zdarzeń do `audit_log` przez serwis writerski | Używany z api i workera; odczyt v1 tylko ops/DB, bez HTTP |
| **Redaction** | Czyste funkcje / serwis bez I/O | Łatwe unit testy; wywołanie przed adapterem summarizera |
| **Summarization (UC1)** | Use case na wspólnym porcie **LlmClient** | Wejście: zredagowany transcript; wyjście: Zod; mock w etapie 0 |
| **Ask / asystent (UC2)** | Ten sam LlmClient, inny use case | Etap 2+: ACL → retrieval → grounded answer; poza MVP kodu |
| **Web (BFF + UI)** | Cienki BFF; tabela + sidebar; mock wyszukiwarki; SSE po Test | Bez reguł ACL w przeglądarce; BFF woła `api` |

## Poza zakresem styli w v1

- Event sourcing.
- Pełny CQRS (osobne modele zapisu/odczytu „na sztywno”).
- Mikroserwisy per domena / osobne bazy per usługa.
- Bogaty model DDD (agregaty, domain events) wszędzie „dla zasady”.

## Procesy i odpowiedzialności

```text
                    ┌─────────────┐
   przeglądarka ──► │    web      │  Next.js: BFF + sidebar (tabela/Test/SSE
                    │  (BFF)      │  + mock wyszukiwarki); cookie HttpOnly
                    └──────┬──────┘
                           │ HTTP (sesja użytkownika)
                           ▼
                    ┌─────────────┐
                    │    api      │  NestJS: auth użytkowników, ACL,
                    │             │  odczyt/zapis przez use case'y
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         PostgreSQL    pg-boss     (metadane jobów
         (dane)        (w tej      w tej samej DB)
                        samej DB)
                           ▲
                           │ pobiera joby
                    ┌──────┴──────┐
                    │   worker    │  NestJS entry bez publicznego HTTP
                    │             │  pipeline spotkania, adaptery I/O
                    └─────────────┘
```

| Proces | Robi | Nie robi |
|--------|------|----------|
| **api** | Logowanie (e-mail/hasło), sesja, egzekwowanie ACL, API domenowe dla BFF | Długiego przetwarzania transcript→summary w requestcie synchronicznym |
| **worker** | Joby pg-boss, kroki pipeline, wywołania portów (mock źródła / mock summary) | Publicznego API dla przeglądarki; decyzji „czy user X może to zobaczyć” przy serwowaniu UI |
| **web** | Cookie HttpOnly, BFF, sidebar (tabela+Test / mock wyszukiwarka) | Reguł uprawnień do treści spotkań |

Lokalnie te same trzy procesy mogą biec **na hoście** (`pnpm db:up` + `dev:*`) albo w **kontenerach developerskich** (`docker-compose.dev.yml` / `pnpm dev:stack:up` — bind mount kodu). Granice odpowiedzialności procesów się nie zmieniają. Szczegóły: `deployment.md`.

## Współdzielenie: `packages/`

Katalog **`packages/`** trzyma **wspólne definicje kontraktów** (typy TypeScript, kształty DTO / komunikatów uzgodnione między stronami) używane przez **`api`**, **`worker`** i **`web`**.

- Cel: jedna definicja tego, co krąży między procesami (np. kształt zdarzenia „pojawił się transcript”, kształt odpowiedzi API dla listy spotkań) - bez kopiowania na trzy sposoby.
- **Bez Zod w `packages/`.** Walidacja runtime Zod należy do **konkretnej aplikacji** (`api` / `worker` / ewentualnie `web`), która egzekwuje kontrakt na swojej granicy.
- Na granicy HTTP w Nest: **`class-validator`** + **`class-transformer`** (DTO).
- Wynik streszczenia / warstwa „jak LLM”: walidacja **Zod w aplikacji** (`worker` lub `api` - tam gdzie powstaje i jest akceptowany wynik), nie w paczce kontraktów.

## Dane i kolejka

- **PostgreSQL** - jedyny magazyn stanu aplikacji (użytkownicy, spotkania, transcript, summary, zadania, opcjonalnie Project/Membership pod kolejną fazę, joby pg-boss, **`audit_log`**).
- **Prisma** - ORM i migracje.
- **pg-boss** - kolejka w Postgresie (świadomie bez Redis), żeby ograniczyć liczbę kontenerów i ruchomych części.
- **`audit_log`** - audyt kluczowej logiki (retencja 90 dni); szczegóły katalogu zdarzeń i zakazów treści: `observability.md`. Odczyt w v1 bez API HTTP.

## Uwierzytelnianie i autoryzacja

### Użytkownicy (pracownicy)

- Rejestracja / logowanie: **e-mail + hasło**. Rejestracja v1 **otwarta** (bez zaproszenia); po sukcesie register **od razu cookie sesji** (jak login).
- Hasła: **bcrypt** przed zapisem; przy rejestracji min. **12** znaków, ≥1 wielka, ≥1 cyfra, ≥1 specjalny.
- Sesja: **access JWT (TTL 15 min)** + **refresh** (hash w PostgreSQL); oba w cookie **HttpOnly** (BFF przekazuje); rotacja `POST /auth/refresh`. Treść sekretna nie w `localStorage` / `sessionStorage`. Szczegóły: `spec/SPEC-AUTH_I_ACL.md`.
- Tylko pracownicy firmy mają konta (zgodnie z koncepcją produktu).
- Lista spotkań: paginacja backendowa — `limit` ∈ {10,25,50,100} oraz **`page`** (nie cursor).

### Integracje zewnętrzne

- Wywołania do zewnętrznych API (np. Fireflies) w v1: **atrapa / mock** za portem - bez prawdziwych credentiali w ścieżce happy-path developmentu.
- Docelowa podmiana adaptera nie powinna wymagać przepisywania use case'ów pipeline'u.

### Autoryzacja (ACL)

Odczyt spotkania i artefaktów (transkrypt, streszczenie, zadania) tylko gdy zachodzi co najmniej jedno (**ACL v1**):

1. użytkownik jest **organizatorem** spotkania, albo  
2. użytkownik jest **uczestnikiem** wewnętrznym spotkania (`MeetingParticipant` → `User`), albo  
3. rola **administracyjna** (operacje serwisowe; także spotkania `confidential`).

`clientId` / status linku klienta służą do metadanych, filtrów i erase — **nie** przyznają ACL w v1.  
`Project` / `ProjectMembership` mogą istnieć w schemacie pod **kolejną fazę** (zespół klienta); **nie** egzekwują dostępu w v1. Grupy Google Workspace (działy / „wszyscy”) nie mapują się na ACL.

ACL egzekwuje **`api`** (lista, detail, przyszłe wyszukiwanie / asystent). BFF i UI nie są źródłem prawdy uprawnień.

## Pipeline spotkania

1. Pojawia się materiał źródłowy (w v1: mock zgodny z kontraktem przyszłego Fireflies / Meet).
2. Enqueue job (klucz idempotencji: zewnętrzne ID spotkania / transcriptu).
3. Worker: pobranie → normalizacja → **redakcja (E+T+P+K)** → **UC1 summarizeMeeting** (LlmClient mock/prod) → walidacja Zod → zapis. Bez użycia `summary` z Fireflies.
4. Ponowne uruchomienie tego samego klucza: **update in place**, bez drugiego rekordu spotkania.
5. **Brak** trwałego zapisu stanu pośredniego (transcript/summary) w DB **przed** wywołaniem LlmClient; po udanym Zod — persist. Niepoprawne summary **nie** trafia do bazy jako sukces (quarantine / failed; max 1 retry JSON).

## Granica „na zewnątrz” i redakcja

- Przed wywołaniem **LlmClient** (UC1 i później UC2; nawet mocka) treść przechodzi przez **redakcję** klas **E+T+P+K** (e-mail, telefon, PESEL/dowód, karta) - z testami jednostkowymi.
- Nie wprowadzamy drugiej, osobnej integracji LLM „tylko do chatu” - asystent to kolejny use case tego samego portu.
- Osobna świadomość produktowa: sam etap **capture / STT u vendora** (gdy pójdzie na produkcję) to inna powierzchnia ryzyka (RODO, DPA) - nie mylić z redakcją przed LLM; obie opisujemy w dokumentacji decyzyjnej / komunikacji, a w kodzie v1 capture jest mockiem.

## Stack (skrót decyzji)

| Element | Wybór |
|---------|--------|
| Język | TypeScript |
| API / worker | NestJS (osobne procesy) |
| Web | Next.js + BFF |
| DB | PostgreSQL + Prisma |
| Kolejka | pg-boss |
| Kontrakty współdzielone | `packages/` (typy; bez Zod) |
| Walidacja HTTP | class-validator + class-transformer |
| Walidacja wyniku AI / summary | Zod w aplikacji |
| LLM | Jeden provider (roboczo GPT-5.2); UC1 summarize + UC2 ask później |
| Testy | Jest |

## Anty-patterny, których unikamy (architektonicznie)

- Logika biznesowa i ACL w komponentach React / wyłącznie w BFF.
- Synchroniczne „przetwórz całe spotkanie” w handlerze HTTP.
- Zaufanie surowemu JSON-owi z modelu bez walidacji w aplikacji.
- Gruby `utils` / wspólna paczka z Zod i wszystkim naraz zamiast cienkich kontraktów.
- Czytanie `process.env` głęboko w domenie zamiast zwalidowanej konfiguracji na starcie procesu.

## Mapowanie na inne dokumenty

- Koncepcja produktu i zakres v1: `dokumentacja_koncepcyjna.md`
- Drzewo katalogów: `architektura_katalogi_pliki.md`
- Normatywne kontrakty I/O: `dokumentacja_komunikacji.md`
- Frontend (Next, BFF, widoki): `frontend.md`
- LLM / asystent: `llm_i_asystent.md`
- Przepływ danych end-to-end: `data_flow.md`
- Observability / `audit_log`: `observability.md`
- Anty-patterny: `anty_patterny.md`
