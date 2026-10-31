# Raport oddania — wnioski z przeglądu architektury

Źródło: przegląd `apps/`, `docs/`, `spec/` względem `ZADANIE - Mid FullStack.md` (2026-10-30).  
Cel pliku: checklista przed oddaniem — nie zastępuje `OUTPUT.md` / `README.md`.

---

## Werdykt

- **Część B (kod):** obowiązki briefu (model, pipeline, redakcja+testy, ACL+testy, uruchomienie + przykładowe spotkanie) są spełnione.
- **DEMO/Test** idzie przez ten sam worker co docelowa produkcja (mock źródła/LLM za portami) — nie ma osobnej „fałszywej” ścieżki summary.
- **Część A (`OUTPUT.md`):** pokrywa 9 punktów briefu; przy dopinaniu pilnować limitu ~5 stron.
- **Największe ryzyko odbioru:** stale `README.md` (opisuje Fazę 2; Auth/ACL/UI już są). Recenzent czytający README najpierw uzna repo za niedokończone.

Po zsynchronizowaniu README + sekcji AI + ewentualnym minimalnym dopięciu kodu poniżej — projekt jest gotowy do oddania.

---

## Co działa poprawnie (api / worker)

- Model Prisma: spotkania, uczestnicy (schemat), transcript/summary JSON, role, organizer, audit.
- Pipeline: fetch → redact → LLM+Zod (+1 retry) → persist / `failed`; idempotencja po `externalMeetingId`.
- Redakcja E+T+P+K przed LLM, z testami.
- ACL na `api` (list / get / SSE): admin ∨ organizer ∨ participant; deny → 404 + audit.
- Auth cookie JWT + refresh; DEMO z sesją (`organizerId` = klikający, UUID runu ≠ fixture).
- DX `/dev/meetings/enqueue` wyłączone w `production`.

### Organizer w DEMO vs prod (ustalenie)

`organizerId = zalogowany user` przy `POST /demo/run-meeting` to **celowy mechanizm DEMO**, nie docelowy sposób ustalania właściciela spotkania.

| Etap | Skąd bierze się organizator |
|------|-----------------------------|
| **DEMO/Test (teraz)** | Sesja użytkownika, który klika Test — żeby ACL, lista i multi-tester działały bez Calendar/FF |
| **Produkcja** | Metadane ze źródła: **Google Calendar** (organizator wydarzenia) + **Fireflies** (uczestnicy / kontekst callu), mapowane na `User` w naszej DB |

Pipeline i ACL (`organizerId` / participant / admin) zostają te same — zmienia się tylko **skąd** pochodzi tożsamość organizatora (i później uczestników). W README warto to jednoznacznie napisać, żeby nikt nie wziął „klikający = organizer” za model produkcyjny.

---

## Luki: „świadomy cut” vs „wygląda jak bug”

Brief pozwala odpuścić z uzasadnieniem w dokumencie/README. Nie każda luka nadaje się do tej narracji tak samo.

### Nadaje się do „celowo / brak czasu” (opisać, nie dokładać półimplementacji)

| Temat | Uzasadnienie pod oddanie |
|-------|--------------------------|
| Prawdziwy Fireflies / Google Calendar / LLM | Porty + mocki; brief nie wymaga prawdziwej integracji |
| Pochodzenie `organizerId` z Calendar + FF | W DEMO celowo z sesji klikającego; prod = mapowanie z API vendorów |
| Sync uczestników wewnętrznych z payloadu źródła → `MeetingParticipant` | Ta sama warstwa co organizer z Calendar/FF — etap prawdziwego capture; w DEMO ACL opiera się na organizerze sesji |
| Q&A ze źródłami | Atrapa UI OK; ten sam ACL/redakcja na później |
| Metadata-only (brak zgody / puste źródło) | Opisane w OUTPUT; mocki zawsze mają treść — nie blokowało B2 |
| Erase / retencja jobami | Etap 2 / ops; pola w schemacie pod to |
| ProjectMembership w ACL | Świadomie poza v1 w docs |
| CI GitHub Actions | Nie jest w briefie; lokalnie `pnpm test` |

### Wygląda jak niedoróbka / bug — nie „sprzedawać” samym brakiem czasu bez fixu albo twardej narracji

| Temat | Dlaczego źle wygląda | Co zrobić |
|-------|----------------------|-----------|
| Brak wyjaśnienia, że organizer z sesji = tylko DEMO | Recenzent może uznać to za docelowy model ACL | Opisać w README (patrz wyżej) — **to nie jest bug kodu** |
| Pipeline nie zapisuje `MeetingParticipant` | Model + ACL „uczestnik” + fixture `internal` bez syncu | Albo krótki sync e-mail→User gdy istnieje, **albo** (spójnie z organizerem) w README: uczestnicy z Calendar/FF w etapie 1; DEMO = organizer sesji ∨ admin |
| Re-enqueue / `markFailed` zostawia stare `summary` przy statusie `failed` | Niespójny stan danych | W `markFailed` (lub przy starcie retry) czyść `summary` |
| README: Auth/ACL/UI = „nie / Faza 3” | Faktycznie zaimplementowane | Zaktualizować tabelę statusów + demo flow + sekcję AI |
| `durationSeconds` zawsze `null` | Pole w API, nigdy nie setowane | Uzupełnić z fixture **albo** nie eksponować / opisać jako poza mockiem |
| DX: `organizerId = null`, dowolny `fixtureKey` | Pułapka DX (lista pusta / worker `failed`) | Walidacja katalogu fixture; w README: do ACL używaj DEMO/Test |

SSE bez timeoutu, metadata-only, prawdziwi vendorzy — przy happy-path DEMO nie wyglądają na oczywisty bug, jeśli są nazwane.

---

## DEMO vs produkcja (skrót)

| | DEMO/Test | DX `/dev` | Prod |
|--|-----------|-----------|------|
| Auth | Tak | Nie | Tak |
| `externalMeetingId` | UUID runu | = fixtureKey | ID vendora (FF) |
| Owner ACL | **Celowo** klikający (stub bez Calendar) | `null` | Organizator z **Google Calendar** (+ kontekst FF), mapowany na `User` |
| Uczestnicy ACL | Nie syncowane z fixture (świadomie z DEMO) | — | Lista z Calendar/FF → `MeetingParticipant` |
| Silnik | Ten sam orchestrator | Ten sam | Ten sam + prawdziwe adaptery |

---

## Minimalny zestaw przed wysłaniem linku

1. **README** = rzeczywistość (co działa / atrapa / świadomie odłożone) + **jak użyto AI i co poprawiono**.
2. Wskazać **`OUTPUT.md`** jako dokument Części A (≤5 stron).
3. W README: **organizer z sesji = tylko DEMO**; prod = Calendar + Fireflies.
4. Kod (opcjonalnie): czyszczenie `summary` w `markFailed`; sync participant tylko jeśli nie chcesz polegać wyłącznie na narracji.
5. Nie dokładać „na szybko” prawdziwego LLM, Q&A ani metadata-only.

---

## Szkic uzasadnień do README („świadomie odłożyłem”)

- Capture/LLM: mocki za portami; jakość PL i DPA w pilocie.
- **Organizator i uczestnicy z Workspace/FF:** w DEMO `organizerId` bierze się z zalogowanego użytkownika (Test), żeby egzekwować ACL bez Google. Na produkcji te dane przyjdą z API Calendar + Fireflies i zostaną zmapowane na `User` / `MeetingParticipant` — bez zmiany reguł ACL na `api`.
- Asystent Q&A: atrapa UI; architektura (ACL, redakcja, port LLM) pod UC2.
- Metadata-only przy braku zgody: w dokumencie decyzyjnym; w etapie 0 fixture’y mają treść.
- Erase/retencja, membership projektu, powiadomienia, CI: kolejne etapy / poza obowiązkami B.

---

## Ocena względem kryteriów briefu

| Kryterium | Ocena |
|-----------|--------|
| Decyzje + uzasadnienie | Silne (`OUTPUT` + `docs/`) |
| Bezpieczeństwo / ACL | Silne; luka syncu uczestników do domknięcia lub nazwania |
| Koszty | Silne (Fireflies vs Workspace) |
| Kod + testy | Silne |
| Ograniczenie zakresu | Dobre w OUTPUT; słabo zakomunikowane w README |
| Komunikacja oddania | README = krytyczna poprawka |
