---
wersja: 4
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# SPEC - Pipeline spotkania

Norma implementacji orkiestracji joba `meeting.process` w `apps/worker`. Przepływ koncepcyjny: `docs/data_flow.md`, `docs/architektura.md` (brak persist przed LLM; redakcja E+T+P+K). Kontrakt joba i portu źródła: `SPEC-KOMUNIKACJA`. Wywołanie modelu: `SPEC-LLM`. Warstwy: `SPEC-ARCHITEKTURA`. Testy: `SPEC-TESTY`.

## Cel / zakres

- Sekwencja kroków od pobrania źródła do trwałego zapisu zwalidowanego streszczenia.
- Idempotencja, statusy, fail-closed, redakcja PII przed LlmClient.
- Granica: worker **nie** egzekwuje ACL użytkownika.

**Poza tą wersją:** produkcyjny webhook Fireflies / real Workspace, NER/imiona-nazwiska poza E+T+P+K, równoległe joby per segment, osobne retry sieciowe vendora poza jednym retry Zod JSON, HTTP erase admin.

## Powiązanie ze stylem z docs

| Ustalenie | Wiązanie |
|-----------|----------|
| Styl **ingest / pipeline** | Orkiestracja jawnych kroków w workerze |
| Enqueue tylko z `api` | Worker wyłącznie konsumuje `meeting.process` |
| Hexagonal I/O | Fetch przez port źródła; summarize przez port LlmClient |
| Redakcja bez I/O | Czyste funkcje / serwis - unit testy |
| Styl globalny | Use case / serwis aplikacji; Prisma w infrastrukturze workera - bez wyjątku DDD |

**Wyjątek względem stylu globalnego:** brak.

## Wymagania egzekwowalne

### Orkiestracja

P-1. Jedna kanoniczna sekwencja dla happy path:

```text
fetch (port źródła)
  → normalize
  → redact (E+T+P+K)
  → summarize (LlmClient UC1)
  → walidacja Zod wyniku
  → persist (Prisma: transcript + summary + action items + status completed)
```

P-2. Wejście joba: payload jak w `SPEC-KOMUNIKACJA` (`externalMeetingId`, `source`, opcjonalnie `fixtureKey`). W v1 źródło = mock za portem.

P-3. **Zakaz** użycia `summary.*` (lub równoważnego) z Fireflies / vendora jako wejścia do DB lub do kroku summarize - kanon powstaje wyłącznie z UC1 na bazie (zredagowanego) transcriptu.

P-4. Worker **pomija** ACL użytkownika. Kontrola odczytu wyłącznie przy HTTP w `api` (`SPEC-AUTH_I_ACL`).

P-4a. **Metadata-only:** gdy źródło nie dostarcza treści (brak zgody / brak notatek) - wolno zapisać fakt spotkania (metadane) **bez** wywołania UC1; status terminalny bez kanonicznego summary (np. `completed` z pustą treścią albo osobny kod - spójnie w implementacji i contracts), **bez** udawania streszczenia AI.

P-4b. **Client link:** matching domeny e-mail zewnętrznego → `Client`; brak matcha → `clientLinkStatus = unmatched`, `clientId = null`; **nie** blokuje pipeline ani UC1. Spotkanie bez zewnętrznych → `internal`.

### Statusy

P-5. Status przetwarzania spotkania / joba widoczny dla API:

`pending` → `processing` → `completed` | `failed`

- Po pobraniu joba: przejście do `processing`.
- Sukces Zod + persist: `completed`.
- Fail po wyczerpaniu reguł P-8 / błąd uniemożliwiający sukces: `failed` (quarantine wyniku modelu - **nie** jako udane streszczenie).

### Idempotencja

P-6. Klucz idempotencji: **`externalMeetingId`**. Ponowne enqueue / retry **tego samego** `externalMeetingId` **nie** tworzy drugiego rekordu spotkania - **update in place**.

Zmiana względem wcześniejszego brzmienia P-6 („spójnie z `fixtureKey` na ścieżce mock” w kontekście dema UI): na ścieżce **DEMO/Test** (`POST /demo/run-meeting`) `externalMeetingId` jest ID **runu** (UUID nadane przez API); `fixtureKey` wskazuje wyłącznie **materiał** mocka z katalogu. **Nie** wymaga się `externalMeetingId === fixtureKey`. Idempotencja nadal chroni ponowne przetworzenie tego samego UUID runu - nie wymusza jednego wiersza na cały katalog fixture dla wszystkich użytkowników dema. Semantyka produkcji (ID vendora) i DX (`fixtureKey` ≈ `externalMeetingId` na `/dev/meetings/enqueue`) - **bez zmian** w tym wymaganiu poza jawnym rozdzieleniem ścieżki DEMO/Test.

P-7. Ponowne przetworzenie tego samego klucza (`externalMeetingId`) musi być bezpieczne względem końcowego stanu domenowego (brak duplikatów spotkań i „podwójnych” kanonicznych summary jako osobnych sukcesów bez nadpisania).

### Fail-closed i retry

P-8. Niepoprawny wynik summarize względem schematu Zod:

1. **Jeden** retry z żądaniem / ścieżką „popraw JSON” (ten sam kontrakt wyjścia).
2. Jeśli nadal nieOK → status `failed` / quarantine; **zakaz** zapisu jako udane streszczenie.

P-9. **Zakaz persistencji stanu pośredniego w bazie przed wywołaniem LlmClient** (np. nie zapisujemy trwale transcriptu „w połowie”, a potem wołamy LLM). Trwały zapis transcript + summary + zadania następuje **po** udanej walidacji Zod (P-1). Awaria przed tym punktem: job kończy się błędem / retry pg-boss zgodnie z konfiguracją workera - bez pół-kanonicznego success w DB.

### Redakcja

P-10. Przed każdym wywołaniem LlmClient (w tym mock) treść transcriptu przechodzi przez redakcję.

P-11. Obowiązkowe kategorie v1 (maskowanie / placeholder w tekście segmentów):

| Id | Kategoria | Norma |
|----|-----------|--------|
| **E** | Adresy e-mail | Wykrycie + zastąpienie placeholderem |
| **T** | Numery telefonów | j.w. |
| **P** | PESEL / numer dowodu (regex PL) | j.w. |
| **K** | Numery kart płatniczych | j.w. |

P-12. Implementacja redakcji: **czyste funkcje lub serwis bez I/O** (bez Prisma, bez HTTP, bez kolejki) - testy jednostkowe obowiązkowe w strategii testów (`SPEC-TESTY`).

P-13. Kategorie poza E+T+P+K (np. NER imion/nazwisk) - **poza tą wersją**.

### Persistencja (Prisma)

P-14. Zapis końcowy sukcesu przez Prisma w workerze: kanoniczny transcript, zwalidowane summary (`shortSummary`, `decisions`, `actionItems`), powiązanie ze spotkaniem, status `completed`. Szczegóły modelu → `SPEC-DANE`.

P-15. Przy `failed` po Zod: **nie** oznaczać summary jako sukcesu; dopuszczalny zapis metadanych statusu / informacji o błędzie **bez** traktowania niepoprawnego payloadu jako kanonu.

## Norma: wzorce

### Wymagane

- Orkiestrator pipeline (sekcja / serwis) z jawnymi krokami P-1.
- Port źródła + port LlmClient (adaptery w infrastrukturze workera).
- Idempotencja po kluczu zewnętrznym (P-6).
- Redakcja jako warstwa pure przed LLM.
- Walidacja Zod wyniku w aplikacji workera (nie w `packages/`).
- Prisma wyłącznie w warstwie infrastruktury / repozytorium workera - nie w czystej redakcji.

### Nie wolno

- Uruchamiać pełnego transcript→summary synchronicznie w handlerze HTTP `api`.
- Enqueue’ować jobów z workera „dla UI” z pominięciem api (demo i produkcyjny trigger v1: api).
- Używać `summary.*` vendora jako kanonu.
- Persystować stan pośredni w DB przed LLM (P-9).
- Wykonywać redakcji wyłącznie „przy okazji” wewnątrz adaptera LLM bez osobnego, testowalnego kroku.
- Egzekwować ACL użytkownika w workerze przy budowie kanonu.

## Zatwierdzony stack (obszar)

| Element | Wybór |
|---------|--------|
| Runtime | NestJS `apps/worker` |
| Kolejka | pg-boss (`meeting.process`) |
| Persistencja | Prisma + PostgreSQL |
| Walidacja wyniku summary | Zod w workerze |
| Źródło / LLM v1 | Adaptery mock za portami |

## Kryteria akceptacji

- [ ] Przetworzenie mock/fixture kończy się `completed` z transcript + summary + zadaniami po Zod.
- [ ] Ten sam `externalMeetingId` nie tworzy drugiego spotkania; na DEMO/Test `fixtureKey` nie jest kluczem tożsamości wiersza.
- [ ] Niepoprawny JSON summary: max jeden retry; potem `failed` bez kanonicznego sukcesu w DB.
- [ ] Brak trwałego zapisu transcriptu/summary w DB przed wywołaniem LlmClient na ścieżce sukcesu.
- [ ] Segmenty z e-mailem / telefonem / PESEL-like / kartą są zredagowane przed wywołaniem portu LLM (testy jednostkowe E+T+P+K).
- [ ] Worker nie konsultuje membership/uczestnictwa użytkownika przy persistencji.
- [ ] `summary` z mocka Fireflies-kształtu (jeśli obecne w fixture) jest ignorowane.

## Poza zakresem / poza tą wersją

- Szczegóły promptu, limity tokenów, wybór modelu → `SPEC-LLM`.
- Pełny schemat tabel → `SPEC-DANE`.
- Katalog `audit_log` / pino → `SPEC-OBSERVABILITY`.
- Webhook FF, OAuth, prawdziwy capture.
- Redakcja NER nazwisk; klasy poza E+T+P+K.
- Równoległe przetwarzanie segmentów / fan-out jobów.
