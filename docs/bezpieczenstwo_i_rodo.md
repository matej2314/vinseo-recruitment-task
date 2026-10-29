---
wersja: 3
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-29
---

# Bezpieczeństwo i RODO

Dokument inżyniersko-produktowy Firmowego asystenta spotkań. **Nie stanowi porady prawnej** - założenia poniżej są robocze na v1 docs i podlegają potwierdzeniu z firmą / IOD.

Szerszy kontekst produktu: `dokumentacja_koncepcyjna.md`. ACL i redakcja w kodzie: `architektura.md`, `dokumentacja_komunikacji.md`, `observability.md`.

## Cele ochrony

- Dane klientów i treść spotkań **nie trafiają** tam, gdzie nie powinny (vendorzy, logi, osoby bez ACL).
- Pracownicy widzą tylko spotkania zgodne z modelem dostępu.
- Zgody uczestników zewnętrznych są **jawne**; odmowa ma skutek operacyjny (brak capture), nie „ciche” nagrywanie.
- Retencja jest skończona i egzekwowalna (w tym `audit_log`).

## Role danych (skrót)

| Kategoria | Przykłady | Gdzie w systemie |
|-----------|-----------|------------------|
| Konto pracownika | e-mail, hash hasła | Postgres; hasło tylko bcrypt |
| Metadane spotkania | tytuł, czas, client/project id | Postgres |
| Treść wrażliwa | transcript, summary, action items | Postgres pod ACL; **nie** w pino / `audit_log` jako treść |
| Audyt | eventType, id, requestId | `audit_log` (90 dni) |
| Capture u vendora | audio / transcript u Fireflies (gdy prod) | poza naszą DB - wymaga DPA i decyzji |

Klienci zewnętrzni **nie mają kont** - mogą być w metadanych uczestników / tekście.

## Zgody i nagrywanie

### Zasada v1 (robocza)

1. Na spotkaniach z klientem: **jawna informacja** na początku Meet (oraz zapis w umowie / procesie sprzedaży, gdy firma to wdroży).
2. Brak zgody uczestnika / klienta na nagrywanie lub notetakera → **brak capture** całego spotkania w naszej ścieżce (nie nagrywamy „po cichu” ani nie obchodzimy odmowy).
3. Bot / Notetaker na callu jest widoczny; ewentualny Meet SDK też wymaga zgody w UI Google - proces firmowy musi to uwzględniać.

### Uczestnicy zewnętrzni

- Brak logowania do naszego systemu.
- Ich dane w transcripcie podlegają ACL pracowników oraz retencji jak poniżej.
- Udostępnianie summary klientowi e-mailem / linkiem - **poza v1** (wymaga osobnej decyzji).

## Spotkania poufne (`confidential`)

- Flaga / klasyfikacja spotkania poufnego (zarząd, rekrutacja wrażliwa, itd.).
- **Wyłączony** zewnętrzny vendor capture i zewnętrzny LLM.
- Preferowana ścieżka: brak notetakera albo wyłącznie artefakty w Google Workspace według polityki firmy; nasz pipeline dla takich spotkań w prod - tylko gdy źródło jest dopuszczone wewnętrznie.
- W kodzie MVP i tak panuje mock - reguła jest normą produktową na wdrożenie firmowe.

## Retencja (robocza)

| Zasób | Retencja |
|-------|----------|
| Transkrypcja (surowa / znormalizowana) | **90 dni** |
| Streszczenie + action items | **12 miesięcy** |
| `audit_log` | **90 dni** (job czyszczący; patrz `observability.md`, `deployment.md`) |
| Dumpy backup | Osobna polityka ops (mogą żyć dłużej niż wiersze w tabeli) |

Po upływie: usunięcie lub anonimizacja zgodnie z implementacją (hard delete preferowany dla transcriptu po 90 dniach, o ile prawo/umowa nie wymagają inaczej - do potwierdzenia z firmą).

## Dostęp (ACL) a prywatność

- Egzekucja wyłącznie na `api` (uczestnik **lub** zespół projektu/klienta **lub** admin).
- Brak uprawnień → **404** (bez enumeracji).
- Wyszukiwanie / przyszły asystent Q&A: tylko w zbiorze dozwolonym (poza MVP kodu, ale norma już obowiązuje).
- Deny ACL → zdarzenie w `audit_log` **bez** treści spotkania.

## Redakcja przed „wyjściem”

- Przed **każdym** wywołaniem LlmClient - UC1 summarize i UC2 ask (nawet mock): maskowanie uzgodnionych klas PII.
- Zakaz logowania transcriptu / pełnego summary / pełnych promptów w pino i w `audit_log`.
- Testy obowiązkowe: `testy.md`. Szczegóły UC: `llm_i_asystent.md`.

## Vendorzy i transfer (Fireflies / LLM)

| Temat | Norma robocza |
|-------|----------------|
| Fireflies / podobny capture | Dane mogą wyjść poza infrastrukturę firmy; **wymagane DPA** i świadoma decyzja (EOG / subprocessors). Z FF bierzemy transcript; **`summary.*` ignorujemy**. |
| Alternatywa | Workspace-first (Meet transcript / bez zewnętrznego notetakera) dla wrażliwych calli. |
| LLM (jeden provider) | Tylko treść **po redakcji**; UC1 + później UC2; w MVP kodu - mock bez requestów. |
| Minimalne uprawnienia Google | Calendar / Meet / Drive tylko w zakresie potrzebnym do wybranego adaptera - nie „pełne Workspace”. |
| API Key / OAuth | Tylko api/worker; nigdy `NEXT_PUBLIC_*`. |

Mapowanie techniczne FF: `dokumentacja_komunikacji.md`.

## Offboarding pracownika

1. Dezaktywacja konta (brak logowania).
2. Unieważnienie sesji (cookie / store sesji).
3. Natychmiastowy efekt ACL (nie uczestniczy już jako „aktywny user”; historyczne uczestnictwo w metadanych spotkań może zostać).
4. Dane spotkań **zostają** w organizacji pod ACL zespołów / admina - nie kasujemy historii klienta wraz z odejściem osoby.
5. Opcjonalnie: wpis w `audit_log` (`user.deactivated`) - do dodania w katalogu eventów przy implementacji.

## Edge case’y (checklista operacyjna)

| Sytuacja | Zachowanie |
|----------|------------|
| Odmowa zgody na nagrywanie | Brak enqueue / brak notetakera; spotkanie może istnieć tylko jako metadane kalendarza bez treści - lub w ogóle poza systemem |
| Spotkanie `confidential` | Bez FF/LLM zewnętrznego |
| Wyciek ID spotkania | 404 bez ACL |
| Retry webhooka / podwójny Test | Idempotencja - bez duplikatu treści |
| Podejrzenie incydentu | Logi pino + `audit_log`; rotacja sekretów; procedura firmy (poza tym docs) |

## Pytania do firmy (nie blokują architektury v1)

- Finalne okresy retencji vs branża / umowy z klientami.
- Klauzule w umowach o nagrywaniu Meet.
- Czy Fireflies (poza EOG) jest akceptowalny przy DPA, czy wymóg EU-only / self-host.
- Kto jest adminem ACL i jak mapowane są grupy Google → projekty.

## Mapowanie na inne dokumenty

- Koncepcja i zakres: `dokumentacja_koncepcyjna.md`
- ACL, redakcja, procesy: `architektura.md`
- Kontrakty / 404: `dokumentacja_komunikacji.md`
- `audit_log`: `observability.md`
- Backup / env prod: `deployment.md`
- Sesja w UI (cookie HttpOnly): `frontend.md`
- LLM: `llm_i_asystent.md`
- Plan etapów / zgody w pilocie: `plan_wdrozenia_etapy.md`
