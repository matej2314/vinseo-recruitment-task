# Firmowy asystent spotkań — dokument decyzyjny
 
**Cel:** uporządkowany przegląd kierunku rozwiązania — capture, prywatność, dostęp, koszt, architektura i wdrożenie w celach decyzyjnych.
**Założenia skali (z briefu):** ~40 osób (~25 regularnie na spotkaniach), ~300 h spotkań / mies. (~400 spotkań po 45 min), PL z wtrąceniami EN, część uczestników spoza firmy.

---

## 1. Skąd biorą się nagrania / transkrypcje

**Rekomendacja na start (pilot): wariant A — Fireflies.**  
Fireflies wchodzi na spotkanie Meet jako widoczny notatnik (uczestnicy go widzą), nagrywa rozmowę i zamienia ją na tekst z podziałem na mówców. Z tego tekstu nasz system sam robi krótkie streszczenie i listę zadań. Gotowego streszczenia z Fireflies nie używamy — wolimy mieć jedną, spójną wersję ustaleń u siebie.

**Minimalny zakres dostępu**

| Co | Potrzebne | Czego świadomie nie robimy na starcie |
|----|-----------|--------------------------------------|
| Fireflies | Konta dla osób prowadzących spotkania, bot na Meet, tajny klucz dostępu tylko po stronie naszego serwera | Podpinanie szerokiego dostępu do Google (kalendarz, dysk „na zapas”) w naszej aplikacji |
| Google Workspace | Meet, z którego firma już korzysta; zgoda uczestników na obecność bota | Budowanie osobnego produktu wokół kalendarza i dysku Google w pierwszej wersji |

Kalendarz i lista gości zostają tam, gdzie są dziś (Workspace / osoba prowadząca Meet). My bierzemy tylko wynik nagrania/transkrypcji i zapisujemy go w naszym systemie w ustalonym, prostym formacie.

**Później — fallback w Workspace (Notes by Gemini / notatki Meet).** Gdy Fireflies nie wejdzie na call, nie ma zgody na bota albo nie dostaniemy sensownego tekstu, na kolejnym etapie możemy brać notatki z Google Workspace zamiast budować własne nagrywanie i rozpoznawanie mowy. To tańsza ścieżka i dane zostają bliżej Workspace, ale zwykle gorzej dzieli mówców i częściej zostaje sam fakt spotkania (bez streszczenia AI), gdy notatek nie ma albo są zbyt ubogie.

**W repozytorium (etap 0):** wyłącznie **mock Fireflies** (happy path + testy jednostkowe pozostałych przypadków) — bez prawdziwego Google/Fireflies i **bez** mocka Notes by Gemini. Podmiana adaptera na produkcyjny nie wymaga zmiany pipeline’u.

---

## 2. Bezpieczeństwo i prywatność

**Zgody.** Na callach z klientem: jawna informacja na początku Meet (i proces sprzedażowy / umowa po stronie firmy). Brak zgody → **brak capture treści**; w systemie może zostać rekord metadanych (kiedy, kto, tytuł) bez transcriptu i AI. Bot jest widoczny — to feature, nie ukryte nagrywanie.

**Co wychodzi na zewnątrz (wariant A).** Audio / transcript u Fireflies (DPA z vendorem). Do LLM (streszczenie) idzie treść **po redakcji** klas PII (e-mail, telefon i inne wrażliwe dane). Klucze API tylko na backendzie, nigdy w warstwie frontendowej. HubSpot i podobne CRM — poza zakresem.

**Retencja (założenie robocze do uzgodnienia z firmą)**

| Zasób | Okres | Sens |
|-------|-------|------|
| Transkrypcja | 90 dni | Najwyższa ekspozycja; krótkie okno odtworzenia |
| Streszczenie + zadania | 12 miesięcy | Cykl projektu / kampanii |
| Audyt operacyjny (bez treści rozmowy) | 90 dni | Ślad bezpieczeństwa |

**Erase na żądanie klienta:** usuwamy treść (transcript, summary, zadania, e-maile zewnętrzne w metadanych); **zostaje fakt** spotkania (data, czas trwania, tytuł, powiązanie z klientem). Inicjacja: użytkownik z rolą administratora.

**Edge case’y**

| Sytuacja | Zachowanie |
|----------|------------|
| Odchodzący pracownik | Dezaktywacja konta + unieważnienie sesji; historia spotkań zostaje w organizacji pod ACL |
| Spotkanie poufne (`confidential`) | Ta sama ścieżka **włącznie ze streszczeniem AI** (priorytet: summary dla uczestników); dostęp jak niżej (w tym admin). Typy rozróżniamy — patrz niżej. |
| Osoba / klient bez zgody na nagrywanie | Metadata-only, bez AI |
| Wyciek ID cudzego spotkania | Odpowiedź jak „nie znaleziono” (bez enumeracji) |

**Poufne — rozróżnienie typów (decyzja na prod, nie osobny kod w etapie 0).** Jedna flaga `confidential` w v1 oznacza „węższy krąg odbiorców”, a nie „wyłącz AI”. Warto jednak rozróżniać przypadki, bo ryzyko jest inne:

| Typ (przykład) | Co chronimy przede wszystkim | Kierunek na prod (do decyzji z firmą) |
|----------------|------------------------------|----------------------------------------|
| Wrażliwe ustalenia z klientem / budżet | Wyciek do osób spoza callu | Zostaje pełna ścieżka (capture + AI) + twarde ACL; DPA z vendorem |
| 1:1 / zarząd | Treść u zewnętrznego notatnika i modelu | Rozważyć: ten sam wynik dla uczestników, ale ostrzejszy vendor / bez FF / inny model — **bez** rezygnacji ze summary, jeśli uczestnicy go potrzebują |
| Rekrutacja | Dane kandydatów poza HR | Często najwęższy wariant: metadata-only albo brak zewnętrznego capture; summary tylko gdy HR świadomie włączy proces |

Na oddaniu / w pilocie przyjmujemy **wariant A**: pełne przetwarzanie + summary. Szczegółowa polityka per typ — po uzgodnieniu z ops/RODO, bez forka pipeline’u w etapie 0.

---

## 3. Model dostępu

Dostęp mają wyłącznie **pracownicy** (klienci nie logują się).

**Reguła v1:** widzi spotkanie i streszczenie ten, kto jest **organizatorem**, **uczestnikiem wewnętrznym** albo ma rolę **admin**.  
Admin — serwisowo — widzi wszystkie spotkania (w tym poufne); to świadomy wybór pod erase, support i offboarding.

**Świadome ograniczenie i złagodzenie w pilocie.** Pełne „onboarding historii klienta bez obecności na callu” (membership zespołu projektu) jest w planie późniejszym — Workspace nie mapuje się dobrze na grupy klienckie. W pilocie złagodzenie praktyczne: **lead / opiekun z rolą admin** (lub obecność na kluczowych callach) może odtwarzać ustalenia bez czekania na model membership; jednocześnie nie ekspandujemy zaproszeń typu „cała firma” z Calendar do ACL (ryzyko wycieku).

**Wyszukiwanie i asystent („co ustaliliśmy z klientem X?”).** Ten sam filtr ACL: odpowiedź tylko ze spotkań dozwolonych danej osobie, ze **wskazaniem źródła**. Asystent Q&A jest w roadmapie produktowej (etap rozszerzenia), **poza kodem pierwszej wersji** — architektura (jeden klient LLM, redakcja, ACL na API) jest pod to przygotowana.

---

## 4. Transkrypcja, mówcy, streszczenia

| Warstwa | Wybór | Dlaczego |
|---------|-------|----------|
| Capture + STT + mówcy | Fireflies (pilot) | Gotowy UX notetakera, diarizacja, szybki start bez budowy STT |
| Streszczenie + decyzje + zadania | **Gemini 3.5 Flash-Lite** (start); opcjonalnie **Claude Haiku 5.5** po testach jakości | Kontrola schematu wyniku, spójność z przyszłym Q&A, brak lock-inu na `summary` vendora; ten sam port `LlmClient` — wymiana modelu = konfiguracja |
| Walidacja | Schemat (np. Zod): shortSummary, decisions, actionItems | Zły JSON modelu → jeden retry „popraw format”; nadal źle → status błędu, **bez** zapisu jako sukces |
| Etap 0 w kodzie | Mock źródła + mock LLM | Oddanie bez credentiali i kosztów API; te same porty co prod |

**Dlaczego Gemini na start, Anthropic później.** Tani eksperyment na UC1 (summary + Zod); kryterium przełączenia = jakość PL / skróty branżowe / stabilność JSON pod schemat (udział fail → retry → `failed`), nie „droższy model z nazwy”. Przy wolumenie z briefu delta kosztu tokenów jest marginalna względem capture — decyzja o Haiku to jakość / DPA / preferencja vendora.

Jakość polskiego z wtrąceniami EN jest kryterium wyboru modelu i vendora capture; w pilocie mierzona feedbackiem zespołu, nie „paper benchmarkiem”.

---

## 5. Koszt miesięczny (narzędzia + VPS)

**Założenia (model decyzyjny, nie oferta):** 300 h → **400** spotkań; 25 seatów FF; kurs **1 USD = 4 PLN**; VPS Compose **80–150 PLN**; tokeny na spotkanie (założenie inżynierskie) **10 000** in + **800** out.

**LLM — Gemini 3.5 Flash-Lite (cennik Standard):** 0,30 USD / 1M in + 2,50 USD / 1M out →  
\(10\,000/10^6 \times 0{,}30 + 800/10^6 \times 2{,}50 = 0{,}005\) USD / spotkanie → \(400 \times 0{,}005 = 2\) USD ≈ **8 PLN** / mies.

**LLM — Claude Haiku 5.5 (opcjonalnie, tier ≤100k):** 0,10 / 0,50 USD za 1M in/out → ≈ **0,0014 USD** / spotkanie → ≈ **2 PLN** / mies. przy 400 spotkaniach.

**Wariant A — Fireflies + Gemini + VPS (rekomendowany pilot capture)**

| Składnik | Obliczenie | PLN / mies. |
|----------|------------|-------------|
| Fireflies | 25 × 19 USD × 4 | **1 900** |
| LLM Gemini (400) | 2 USD × 4 | **≈ 8** |
| VPS | widełki | **80–150** |
| **Suma A** | | **≈ 1 988 – 2 058** |

**Wariant B — bez Fireflies, wejście z Workspace (fallback) + Gemini + VPS**

Model kosztowy, gdy część lub całość ruchu idzie bez seatów FF (np. notatki Meet / Notes by Gemini jako zapasowe źródło tekstu).

| Składnik | PLN / mies. |
|----------|-------------|
| Fireflies | **0** (przyrostowo względem opłaconego Workspace*) |
| LLM Gemini (400) | **≈ 8** |
| VPS | **80–150** |
| **Suma B** | **≈ 88 – 158** |

\*ewentualny koszt Gemini w planie Workspace — do weryfikacji u firmy.

**Kotwica decyzyjna:** przy tej skali rachunek przesuwa **Fireflies (seaty)** albo ich brak — nie wybór Flash-Lite vs Haiku (delta LLM ≈ kilka PLN / mies.). Po testach jakości UC1 można przełączyć na Haiku bez zmiany architektury; sumy A/B z Haiku ≈ **1 982–2 052** / **82–152** PLN.

Szczegóły i warianty zawężenia (mniej godzin / mniej seatów): `docs/koszty_i_warianty.md`.

Koszt przyszłego Q&A = f(liczba pytań × kontekst); **nie** jest wliczony powyżej. Czas pracy zespołu / legal — poza tą tabelą.
---

## 6. Architektura

Modularny **monolit** w jednym monorepo: trzy procesy, jedna baza PostgreSQL. Bez mikroserwisów na start — jedna organizacja, mały zespół, limit czasu na dostarczenie działającego szkieletu.

```text
  Przeglądarka
       │
       ▼
  ┌─────────┐     cookie HttpOnly
  │  web    │  Next.js — BFF + prosty UI (lista, statusy)
  └────┬────┘
       │ HTTP
       ▼
  ┌─────────┐
  │  api    │  NestJS — logowanie, ACL, enqueue jobów
  └────┬────┘
       │
       ├──────────────┐
       ▼              ▼
  PostgreSQL      pg-boss
  (dane + audyt)  (kolejka w tej samej DB)
       ▲              │
       │              ▼
       │         ┌─────────┐
       └─────────│ worker  │  NestJS bez publicznego HTTP
                 │         │  fetch → normalize → redakcja
                 │         │  → LLM → walidacja → zapis
                 └─────────┘
```

**Dlaczego tak**

- **Osobny worker** zamiast „całe spotkanie w jednym HTTP”: timeouty, retry, idempotencja; jednocześnie najniższy koszt przygotowania pod produkcję w limicie czasowym (ten sam wzorzec lokalnie i na VPS).
- **pg-boss w Postgresie** zamiast Redis + BullMQ: mniej zależności i kontenerów w v1; **nie zamyka** późniejszej migracji na Redis/BullMQ, gdy skala lub wymagania kolejek to wymuszą.
- **Porty / adaptery** na źródło i LLM: mock dziś, Fireflies / model jutro bez przepisywania reguł biznesowych.
- **ACL wyłącznie na `api`:** front i BFF nie są zaufaną granicą uprawnień.

**Gdy krok się nie powiedzie**

| Awaria | Skutek |
|--------|--------|
| Brak treści ze źródła | Metadata-only; bez AI |
| Błąd / zły JSON z LLM | Status `failed`; bez „prawie OK” w bazie |
| Ponowne uruchomienie / retry tego samego spotkania zewnętrznego | Idempotencja — **jedno** kanoniczne spotkanie, bez duplikatów |
| Brak ACL przy odczycie | Jak brak zasobu; zdarzenie audytowe bez treści rozmowy |

---

## 7. Środowiska bez prawdziwych danych firmy

| Środowisko | Jak |
|------------|-----|
| Local | Postgres w Dockerze; api / worker / web lokalnie lub cały stack w Compose z mockami |
| CI | Baza testowa + testy jednostkowe (ACL, redakcja) i integracyjne (pipeline, API) na fixture’ach |
| Prod (docelowo) | VPS + Compose + Nginx/TLS; sekrety poza gitem |

Bez prawdziwych nagrań klientów: przygotowane **fixture’y** (PL + EN wtrącenia). Demo w UI odpala **ten sam** pipeline co produkcja, nie osobną „fałszywą” ścieżkę.

---

## 8. Plan wdrożenia

| Etap | Co jest | Czego świadomie nie ma | Po czym wiemy, że działa |
|------|---------|------------------------|---------------------------|
| **0 — szkielet** | Model danych, pipeline idempotentny, ACL + testy, redakcja + testy, mocki, minimalny UI, uruchomienie komendami | Prawdziwy FF/Google/LLM, Q&A, powiadomienia, pełny panel | Dwukrotne przetworzenie fixture → jedno spotkanie; zielone testy ACL/redakcji |
| **1 — pilot (A)** | 1–2 zespoły; Fireflies + prawdziwy LLM; VPS; proces zgód; różne typy spotkań (równy priorytet) | Cała firma; membership klienta; dojrzały asystent | ≥70% objętych spotkań ze summary (lub świadome metadata-only); p95 &lt; 1 h od końca Meet do summary; **0** wycieków ACL |
| **2 — rozszerzenie** | Więcej użytkowników; retencja; erase admin; opcjonalnie Q&A ze źródłami | — | Stabilny coverage; retencja działa; erase zostawia fakt callu |
| **3 — cała firma** | Membership zespołu klienta; polityka grup Calendar; IdP / offboarding; ewentualnie przesunięcie części ruchu na B | — | Nowa osoba odtwarza historię; koszt zgodny z actuals |

**Pierwsza wersja produktowa (pilot)** ma capture i streszczenia; **nie** obiecuje pełnego ChatGPT na bazie wszystkich calli firmy — to etap 2+.

---

## 9. Ryzyka i pytania przed startem

**Ryzyka**

- Jakość polskiej transkrypcji / diarizacji przy wtrąceniach EN i skrótach marketplace — mitygacja: pilot na realnych callach, metryki + feedback, opcja przejścia części ruchu na B lub zmiana modelu.
- Opór klientów wobec bota / nagrywania — mitygacja: jawna zgoda, metadata-only przy odmowie, komunikacja korzyści (mniej gubionych ustaleń).
- Koszt seatów Fireflies przy skali 25 hostów — mitygacja: mniej seatów albo późniejszy fallback na notatki Workspace (wariant B).
- Zbyt szeroki dostęp przez grupy Calendar — mitygacja: brak ekspansji „wszyscy” do ACL.
- Oczekiwanie asystenta Q&A od dnia 1 — mitygacja: jasny scope etapów.

**Pytania do Was**

1. Czy macie (lub planujecie) proces / klauzule o nagrywaniu Meet z klientami?
2. Czy akceptujecie dane capture u Fireflies (DPA), czy priorytetem jest maksymalnie Workspace?
3. Ilu hostów realnie potrzebuje seata FF (25 vs mniej)?
4. Czy w Waszym planie Workspace Notes by Gemini / notatki Meet dają użyteczny tekst po polsku (jako późniejszy fallback, gdy nie ma Fireflies)?
5. Kto po stronie firmy jest właścicielem erase / procesu RODO?
6. Jaka jest domena e-mail Workspace do klasyfikacji uczestnik wewnętrzny vs zewnętrzny?

---

*Dokument opiera się na ustaleniach przyjętych przy projektowaniu rozwiązania (skala, ACL v1, capture A/B, LLM Gemini → opcjonalnie Haiku, retencja robocza, etapy 0–3). Liczby kosztowe są modelem decyzyjnym — do aktualizacji po fakturach vendorów. Rozszerzony rachunek: `docs/koszty_i_warianty.md`.*
