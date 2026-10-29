---
wersja: 4
data_utworzenia: 2026-10-29
data_modyfikacji: 2026-10-29
---

# Dokumentacja koncepcyjna - Firmowy asystent spotkań

## Cel produktu

**Firmowy asystent spotkań** (roboczo: Meeting Memory) to wewnętrzny system pamięci ustaleń dla agencji e-commerce pracującej na marketplace'ach (m.in. Allegro) i w Google Workspace.

Problem, który adresuje: ustalenia ze spotkań giną - nikt nie pamięta zobowiązań wobec klienta, zadania nie wracają do zespołu, a nowa osoba w projekcie nie ma skąd wziąć historii.

Najważniejsza wartość:

- Po spotkaniu (objętym procesem) powstaje **transkrypcja po polsku z podziałem na mówców**, **krótkie streszczenie** oraz **lista ustaleń i zadań**.
- Pracownik widzi **tylko te spotkania i treści, do których ma prawo**.
- Dane klientów nie są wynoszone - architektura zakłada kontrolowane granice (własne źródło prawdy w systemie; wejście z ekosystemu Workspace / notetakera jako adapter, nie jako Notebook firmowy).
- W kolejnych etapach: pytanie w stylu „co ustaliliśmy z klientem X o budżecie?” z **wskazaniem źródła** (poza zakresem pierwszej wersji kodu) - ten sam provider LLM co przy kanonicznym streszczeniu spotkania (`llm_i_asystent.md`), nie osobna integracja.
- Kanon streszczenia i zadań: **nasz** wynik LLM/mock po Zod; Fireflies dostarcza transcript, nie gotowe `summary` vendora.

System jest świadomie **narzędziem wewnętrznym** - nie portalem dla klientów zewnętrznych.

## Dla kogo jest system

| Segment | Potrzeba |
|---------|----------|
| **Specjalista / opiekun klienta** | Odtworzyć ustalenia i zobowiązania z calli z klientem; mieć listę zadań po spotkaniu. |
| **Nowa osoba w projekcie** | Szybko wejść w historię ustaleń przypisanego klienta/projektu (w granicach ACL). |
| **Lead / koordynator** | Widzieć spotkania i streszczenia w obrębie zespołu lub projektów, którymi zarządza. |
| **Admin / ops (wewnętrzny)** | Konfiguracja dostępu, obsługa wyjątków (np. odwołanie dostępu po odejściu). |

**Odbiorcy tej dokumentacji (`docs/`):** przede wszystkim autor rozwiązania i ewentualny przyszły zespół developerski - nie zastępuje osobnego dokumentu decyzyjnego dla zarządu.

## Użytkownicy i dostęp

- Konta wyłącznie dla **pracowników firmy**.
- Klienci, dostawcy i inni uczestnicy zewnętrzni **nie logują się** do systemu (mogą występować w metadanych / transkrypcie jako uczestnicy spotkania).
- Kontrola dostępu do zasobów (v1):
  - użytkownik widzi spotkania, w których jest **uczestnikiem**, oraz
  - spotkania powiązane z **klientem / projektem**, do którego należy jego **zespół** (także bez obecności na danym callu),
  - plus ewentualna rola administracyjna do operacji serwisowych.
- Egzekwowanie ACL odbywa się po stronie API (jedyny punkt zaufania dla odczytu spotkań i streszczeń).

## Skala i kontekst językowy (założenia)

| Założenie | Wartość |
|-----------|---------|
| Organizacja | ok. 40 osób, z czego ok. 25 regularnie prowadzi spotkania |
| Wolumen | ok. 300 godzin spotkań miesięcznie |
| Typowe spotkanie | średnio ok. 45 minut, 2-6 uczestników |
| Język | polski z wtrąceniami angielskimi (nazwy kampanii, skróty branżowe) |
| Uczestnicy | część spoza firmy (klienci) - bez kont w systemie |

## Zakres v1

### Produktowo (pierwsza wersja firmowa)

- Priorytet objętych spotkań: **zewnętrzne z klientem**; spotkania wyłącznie wewnętrzne (1:1, rekrutacje, zarząd) - niższy priorytet / później.
- Trwałe przechowanie: spotkanie, uczestnicy, transkrypcja, streszczenie, zadania (ustalenia), reguły uprawnień.
- Przetwarzanie asynchroniczne od pojawienia się materiału źródłowego do zapisanego, **zwalidowanego** streszczenia i listy zadań.
- Możliwość pracy i testów na **przygotowanym mocku** źródła (bez prawdziwych nagrań firmowych) oraz **walidacja formatu** transkrypcji / wyniku streszczenia.
- Minimalny front: warstwa BFF + layout z **sidebarem** — widok domyślny (tabela spotkań + Test + SSE) oraz **mock wyszukiwarki**; bez pełnego panelu produktowego i bez osobnej strony detail.

### Technicznie (to, co ma udowodnić szkielet)

- Własny model danych i pipeline w repozytorium zespołu.
- Idempotentne przetwarzanie (ponowne uruchomienie / awaria w połowie bez duplikatów i bez gubienia spotkań).
- Redakcja danych wrażliwych przed krokiem traktowanym jako wyjście poza zaufaną granicę - z testami.
- Kontrola dostępu na API - z testami reguł.
- Uruchomienie lokalne (Compose + procesy) i przepuszczenie przykładowego spotkania komendami.

## Poza zakresem v1

- Pełny interfejs użytkownika / design system panelu.
- Powiadomienia (mail, Slack itp.).
- Produkcyjna integracja z Google Workspace i Fireflies w kodzie MVP (w kodzie: mocki o stabilnym kontrakcie).
- Wywołania prawdziwego LLM w MVP (mock summarizera z realnym kształtem kontraktu).
- Wyszukiwanie semantyczne / asystent Q&A z cytowaniem źródeł (RAG) - przewidziane koncepcyjnie na później.
- Konta i widoki dla klientów zewnętrznych.
- Rozbicie na mikroserwisy ponad podział API / worker / web.

## Główne założenia

1. **Własne źródło prawdy** - system trzyma kanoniczne rekordy spotkań, streszczeń i uprawnień; zewnętrzny notetaker jest adapterem wejścia, nie Notebookiem firmowym.
2. **Wejście z ekosystemu Google Workspace** (Meet / kalendarz) oraz ścieżka notetakera (Fireflies) jako założenie produktowe; w developmentcie - symulowane źródło.
3. **Narzędzie wewnętrzne** - zero kont dla osób spoza organizacji.
4. **ACL przed treścią** - listowanie, podgląd i przyszłe wyszukiwanie / asystent nie mogą ujawnić spotkania poza zbiorem dozwolonym dla użytkownika.
5. **Fail-closed na wyniku modelu** - wynik streszczenia ma ustalony kontrakt; niepoprawny payload nie staje się źródłem prawdy w bazie.
6. **Priorytet calli z klientem** w pierwszej fali wdrożenia firmowego.
7. **Testowalność bez danych produkcyjnych** - fixture / mock + walidacja formatów jako domyślna ścieżka DX.

## Słownik skrótowy

| Pojęcie | Znaczenie |
|---------|-----------|
| Spotkanie | Rekord callu (metadane + powiązania), objęty pipeline'em |
| Uczestnik | Osoba na spotkaniu (wewnętrzna lub zewnętrzna); konto ma tylko pracownik |
| Transkrypcja | Tekst z podziałem na mówców (PL + wtrącenia EN) |
| Streszczenie | Skrót ustaleń o ustalonym, walidowanym kształcie |
| Zadanie / ustalenie | Pozycja „kto, co, do kiedy” wynikająca ze spotkania |
| ACL | Reguły kto może odczytać spotkanie i jego artefakty |

Szerszy słownik: w pełnym zestawie dokumentacji plik `dictionary.md`.

## Kryteria sukcesu v1

- Po przetworzeniu przykładowego (mock) spotkania w systemie są: transkrypcja, zwalidowane streszczenie i lista zadań.
- Format transkrypcji / wyniku streszczenia jest walidowany; niepoprawne dane nie trafiają do bazy jako „sukces”.
- Użytkownik A nie odczyta spotkania / streszczenia poza swoim ACL (uczestnictwo lub zespół projektu klienta; admin osobno).
- Dane wrażliwe są redagowane przed krokiem „na zewnątrz” (nawet gdy kolejny krok to mock) - potwierdzone testami.
- Nowa osoba w projekcie może przejść historię ustaleń przez listę i podgląd dostępnych jej spotkań (bez asystenta Q&A w v1).
- Całość da się uruchomić lokalnie i przepuścić demo spotkania bez dostępu do prawdziwych nagrań firmy.

## Mapowanie na inne dokumenty

- Architektura: `architektura.md`
- Frontend (UI v1): `frontend.md`
- LLM / asystent: `llm_i_asystent.md`
- Plan etapów: `plan_wdrozenia_etapy.md`
- RODO: `bezpieczenstwo_i_rodo.md`
- Koszty: `koszty_i_warianty.md`
- Słownik: `dictionary.md`
- Spis docs: `README.md`
