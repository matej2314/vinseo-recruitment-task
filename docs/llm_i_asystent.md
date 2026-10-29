---
wersja: 2
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-29
---

# LLM i asystent

Jak w projekcie wykorzystujemy model językowy (API): jedna integracja, dwa use case’y. Spójne z briefem (streszczenie + zadania teraz; pytania kontekstowe ze źródłami później).

## Podział odpowiedzialności

| Warstwa | Rola |
|---------|------|
| **Fireflies** (mock w etapie 0) | Capture + **transcript** (zdania / mówcy). **`summary.*` z FF ignorujemy** - nie jest kanonem ani wejściem do DB. |
| **LLM (API)** | Ekstrakcja / odpowiedzi na bazie tekstu, który już mamy (po redakcji lub po retrieval). |
| **Nasza DB + Zod** | Kanoniczne `shortSummary`, `decisions`, `actionItems` oraz późniejszy kontekst pod Q&A. |

## Jedna integracja, dwa use case’y

Wspólny port / adapter klienta LLM (redakcja przed wysyłką; w prod później: klucz, timeouty, limity tokenów, retry sieciowy — poza obowiązkowym MVP). Use case’y różnią się promptem i wejściem - **nie** osobnym vendorem „do chatu”. Retry **Zod / „popraw JSON”** przy UC1 to norma pipeline (max 1) — nie mylić z retry sieciowym vendora.

```text
                    ┌─────────────────┐
                    │  LlmClient port │
                    │  (mock | prod)  │
                    └────────┬────────┘
               ┌─────────────┴─────────────┐
               ▼                           ▼
     UC1 summarizeMeeting         UC2 answerQuestion
     (pipeline / worker)          (api, etap 2+)
```

| | **UC1 - summarizeMeeting** | **UC2 - answerQuestion** |
|--|----------------------------|---------------------------|
| Kiedy | Etap 0: mock; etap 1+: prawdziwy model | Etap 2+ (koncepcja; stub poza MVP kodu) |
| Wejście | Zredagowany transcript (segmenty) | Pytanie użytkownika + **wyłącznie** fragmenty z DB w ACL |
| Wyjście | JSON → Zod (`shortSummary`, `decisions`, `actionItems`) | Odpowiedź + wskazanie źródeł (meeting id / fragment) |
| Gdzie | Worker, job `meeting.process` | API (po retrieval) |

Model roboczy w rachunkach: **GPT-5.2** (cennik w `koszty_i_warianty.md`) - wymiana modelu nie zmienia portu ani use case’ów.

## UC1 - summarizeMeeting (obowiązkowe w architekturze oddania)

1. Transcript z portu źródła (mock / FF) - **bez** używania `summary` vendora.  
2. Redakcja PII.  
3. Wywołanie LLM (lub mock o tym samym kontrakcie).  
4. Walidacja Zod; przy nieOK → **dokładnie jeden** retry „popraw JSON”; nadal nieOK → `failed` / quarantine (**zakaz** zapisu jako sukces). Orkiestracja: `architektura.md` / `spec/SPEC-PIPELINE.md`.  
5. Zapis kanoniczny w Postgres (**po** udanym Zod; bez trwałego transcriptu przed LlmClient).

Etap 0: **brak wychodzących requestów** do API modelu - mock zwraca fixture zgodny ze schematem lub celowo niepoprawny payload do testów ścieżki błędu.

## UC2 - answerQuestion (przyszłe usprawnienie)

Przykład: „Co ustaliliśmy z klientem X w sprawie budżetu?”

```text
Pytanie + user
  → ACL: zbiór dozwolonych meeting_id
  → retrieval (summary / action items / fragmenty transcriptu z DB)
  → LLM: odpowiedź tylko na podstawie dostarczonego kontekstu + cytowanie źródeł
  → brak faktów spoza kontekstu
```

- Ten sam `LlmClient` co UC1.  
- Bez implementacji w etapie 0; w docs i architekturze przewidziane jako rozszerzenie.  
- UI asystenta: poza v1 frontu (`frontend.md`).

## Prywatność

- Przed każdym wywołaniem LLM (UC1 i UC2): treść zgodna z polityką redakcji.  
- Nie logować pełnych promptów z transcriptem w pino / `audit_log`.  
- Klucz API tylko po stronie api/worker (`deployment.md`).

## Kryteria wyboru modelu (na przyszłą podmianę)

- Trzymanie schematu JSON / structured output.  
- Jakość polskiego + wtrąceń EN (kampanie).  
- Cena przy ~400 summary/mies. oraz późniejszym N pytaniach Q&A.  
- Warunki przetwarzania danych (DPA) vs polityka firmy.

## Mapowanie na inne dokumenty

- Pipeline i porty: `architektura.md`
- Kontrakt Zod / FF mapping: `dokumentacja_komunikacji.md`
- Przepływy: `data_flow.md`
- Koszty LLM: `koszty_i_warianty.md`
- Etapy: `plan_wdrozenia_etapy.md`
- RODO / redakcja: `bezpieczenstwo_i_rodo.md`
- Spis: `README.md`
