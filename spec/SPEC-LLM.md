---
wersja: 2
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-30
---

# SPEC - LLM i streszczenie (UC1)

Norma implementacji portu LLM i use case’u streszczenia spotkania. Kontekst: `docs/llm_i_asystent.md`. Orkiestracja joba i redakcja: `SPEC-PIPELINE`. Kontrakt wyniku logicznego: `docs/dokumentacja_komunikacji.md` / `SPEC-KOMUNIKACJA`. Warstwy: `SPEC-ARCHITEKTURA`.

## Cel / zakres

- Port `LlmClient` i adaptery (mock w tej wersji; prod podmienialny).
- Use case `summarizeMeeting` (UC1) wywoływany z pipeline workera.
- Kontrakt wyjścia + walidacja Zod w aplikacji.
- UC2 (ask / asystent) oraz parametry operacyjne prod (timeout, tokeny, retry sieciowy) - **poza tą wersją**.

## Powiązanie ze stylem z docs

| Ustalenie | Wiązanie |
|-----------|----------|
| Styl **Summarization (UC1)** | Use case na wspólnym porcie LlmClient |
| Jeden provider LLM | Brak osobnej integracji „do chatu” |
| Redakcja przed wywołaniem | Wejście do portu = treść po kroku redact (`SPEC-PIPELINE`) |
| Fail-closed na wyniku modelu | Zod w aplikacji; orkiestracja retry → PIPELINE |

**Wyjątek względem stylu globalnego:** brak.

## Wymagania egzekwowalne

### Port i adaptery

L-1. Istnieje port **`LlmClient`** (interfejs TypeScript) używany przez use case’y LLM. Use case **nie** zależy od konkretnego SDK ani nazwy modelu.

L-2. Adaptery za portem:

| Adapter | Norma w tej wersji |
|---------|---------------------|
| **mock** | **Obowiązkowy i jedyny używany w v1 kodu** - zero wychodzących requestów HTTP do API modelu |
| **prod** | Dozwolony kształt implementacji na później; podmiana bez zmiany `summarizeMeeting` |

L-3. Klient HTTP / SDK po stronie prod: **dowolny**, o ile spełnia port. Vendor i model są wymienne (docs wskazują roboczo **Gemini 3.5 Flash-Lite** na start oraz opcjonalnie **Claude Haiku 5.5** po testach jakości - `docs/koszty_i_warianty.md`, `docs/llm_i_asystent.md`). To **nie** sztywni SPEC do jednego SDK; decyzja modelu = konfiguracja adaptera.

L-4. Klucze API i sekrety providera: wyłącznie po stronie serwera (`api` / `worker`). **Zakaz** użycia w `apps/web` i w bundlu klienta.

### UC1 - `summarizeMeeting`

L-5. Wejście: zredagowany transcript (segmenty po E+T+P+K). **Zakaz** budowania kanonu ze `summary.*` Fireflies / vendora.

L-6. Wyjście logiczne (walidacja **Zod w aplikacji**, typ kształtu może być w `packages/contracts`):

```json
{
  "shortSummary": "string",
  "decisions": ["string"],
  "actionItems": [
    {
      "assignee": "string",
      "description": "string",
      "dueDate": "YYYY-MM-DD|null"
    }
  ]
}
```

L-7. Język treści wyjścia: **jak transkrypcja** (polski z możliwymi wtrąceniami EN - nazwy kampanii, skróty).

L-8. Use case wywoływany z pipeline workera (`SPEC-PIPELINE`). Niepoprawny wynik Zod: max **jeden** retry „popraw JSON”, potem `failed` / quarantine - reguły orkiestracji w PIPELINE, tu bez dublowania.

L-9. Mock musi umieć zwrócić zarówno payload zgodny ze schematem (happy path), jak i celowo niepoprawny (ścieżka testów fail-closed).

### Prywatność i obserwowalność (norma LLM)

L-10. Przed każdym wywołaniem portu (mock lub prod): treść już po redakcji pipeline.

L-11. **Zakaz** logowania pełnych promptów zawierających transcript / treść wrażliwą w pino oraz w `audit_log` (szczegóły katalogu audytu → `SPEC-OBSERVABILITY`).

## Norma: wzorce

### Wymagane

- Port `LlmClient` + adapter mock (i docelowo prod).
- Use case `summarizeMeeting` w warstwie aplikacji workera.
- Structured output → Zod w aplikacji (nie w `packages/`).
- Jedna integracja LLM na oba przyszłe UC (UC2 tylko poza wersją).

### Nie wolno

- Drugiego vendora / klienta „tylko do asystenta”.
- Wywołań LLM z `apps/web` lub BFF.
- Zapisania `summary.*` vendora jako kanonu domenowego.
- Traktowania surowego JSON z modelu jako sukcesu bez Zod.
- Logowania pełnego promptu z transcriptem.
- Sztywnego wiązania use case’u z konkretnym SDK w tej wersji.

## Zatwierdzony stack (obszar)

| Element | Wybór |
|---------|--------|
| Walidacja wyniku | Zod w `apps/worker` (aplikacja) |
| Port | Interfejs TS + DI Nest |
| Runtime v1 | Adapter **mock** |
| Prod client | Dowolny zgodny z portem (**poza obowiązkową implementacją tej wersji**) |

## Kryteria akceptacji

- [ ] Pipeline woła UC1 wyłącznie przez port; mock nie wykonuje requestów do API modelu.
- [ ] Happy-path mock przechodzi Zod i trafia do persist jako kanon.
- [ ] Niepoprawny mock → zgodnie z PIPELINE: ≤1 retry, potem failed bez kanonicznego sukcesu.
- [ ] W kodzie v1 brak użycia `summary` vendora jako wejścia do UC1 / DB.
- [ ] Brak sekretów LLM w `web`; brak logów z pełnym transcriptem w promptcie.

## Poza tą wersją

- UC2 `answerQuestion` (ACL → retrieval → grounded answer + źródła) - bez kontraktu implementacyjnego w tym SPEC.
- Parametry operacyjne prod: timeout, limity tokenów, retry sieciowy - **wymagane w config w kolejnej wersji aplikacji**; w obecnej pomijane.
- Wybór i pinning konkretnego modelu / SDK oraz rachunek kosztów (docs `koszty_i_warianty.md`).
- UI asystenta Q&A.
