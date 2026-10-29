# Vinseo - Firmowy asystent spotkań

Zadanie rekrutacyjne: **Mid Fullstack Developer** (Vinseo / DEKA).  
Cel produktu: po spotkaniu mieć transkrypcję (PL, mówcy), krótkie streszczenie, listę ustaleń i zadań oraz (w kolejnych etapach) pytania do historii spotkań ze wskazaniem źródła - przy kontroli dostępu i ograniczeniu wynoszenia danych klientów.

> Stan: **szkielet zamierzony / w budowie**. Poniższy opis to docelowa architektura i stack. Komendy i zachowanie będą uzupełniane w miarę realizacji.

---

## Założenie produktowe

Budujemy **własny** system pamięci spotkań (model danych, uprawnienia, pipeline, API).  
**Nie** zastępujemy produktu firmowym Notebookiem zewnętrznego notetakera.

| Warstwa | Rola |
|---------|------|
| Google Workspace + Meet | Kalendarz / spotkania w organizacji |
| Fireflies.ai | Adapter pozyskania nagrania/transkrypcji (w kodzie MVP: **mock** o tym samym kontrakcie) |
| Nasza aplikacja | Normalizacja, redakcja, streszczenie/zadania, ACL, retencja, API + panel |

---

## Stack (docelowy)

| Obszar | Wybór | Uzasadnienie (skrót) |
|--------|--------|----------------------|
| API | NestJS (`api/`) | Zgodność z profilem stanowiska; moduły, DI, testowalność |
| Worker | Osobny proces Nest (`worker/`) | Oddzielenie HTTP od długich jobów |
| Frontend | Next.js (`web/`) + BFF | Panel i cienka warstwa przed API; MVP: sidebar (tabela+Test+SSE + mock wyszukiwarki) |
| DB | PostgreSQL | Relacje uczestników, uprawnień, zadań |
| Kolejka | **pg-boss** | Kolejka w Postgresie - **mniej kontenerów i ruchomych części** niż Redis + BullMQ |
| DTO / HTTP | `class-validator` + `class-transformer` | Walidacja na granicy API |
| Kontrakt AI / summary | Zod | Ścisły kształt wyniku streszczenia; reject przy niepoprawnym payloadzie |
| Transkrypcja / LLM w MVP | Mocki | Realny kształt portów; **bez** wychodzących requestów do vendorów |
| Testy | Jest | Jednolity runner w monorepo |
| Lokalnie | Docker Compose (Postgres) | Powtarzalne środowisko |
| Prod | VPS | Prosty hosting pod Compose / reverse proxy |
| CI/CD | GitHub Actions | Testy na PR; ręczne odpalenie testów z wyborem brancha; `main` bez bezpośredniego pusha |

---

## Architektura (wysoki poziom)

```text
[Mock Fireflies / docelowo webhook Fireflies]
                    │
                    ▼
              [pg-boss job]
     fetch → normalize → redact → summarize(mock+Zod) → persist
                    │
                    ▼
              [PostgreSQL]
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
     [api - ACL]         [worker]
          │
          ▼
   [web - BFF + sidebar (tabela/Test + mock search)]
```

- **API** egzekwuje dostęp do spotkań i streszczeń.  
- **Worker** przetwarza kolejkę; ponowne uruchomienie / awaria w połowie nie mogą tworzyć duplikatów ani gubić spotkań.  
- Przed „wywołaniem zewnętrznym” (w MVP: wejście do mocka summarizera) działa **redakcja** wrażliwych danych - z testami.

Szczegółowy diagram, RODO, koszty i plan wdrożenia: dokument Części A (TODO poniżej).

---

## Struktura repozytorium (docelowa)

```text
api/       # NestJS - HTTP, ACL
worker/    # osobny proces - joby pg-boss
web/       # Next.js - BFF + sidebar (tabela+Test / mock wyszukiwarka)
packages/  # (opcjonalnie) wspólne typy / contracts (bez Zod w packages)
docker-compose.yml
.github/workflows/
```

Obecnie w workspace jest m.in. scaffold `api/` (Nest). Reszta monorepo - w trakcie składania.

---

## Uruchomienie

> TODO: finalne komendy po złożeniu workspaces i Compose.

Planowany przepływ:

```bash
# 1. Zależności (root monorepo)
pnpm install   # lub npm/yarn - TBD po ustaleniu workspaces

# 2. Infrastruktura
docker compose up -d

# 3. Migracje / seed
# TODO: np. pnpm --filter api migrate && pnpm demo:seed

# 4. Procesy (osobno)
pnpm --filter api start:dev
pnpm --filter worker start:dev
pnpm --filter web dev

# 5. Demo: przykładowe spotkanie przez pipeline
# TODO: pnpm demo:process-meeting
```

### Co powinno działać po MVP kodu (Część B)

- Model danych spotkań, uczestników, transkrypcji, streszczeń, zadań, uprawnień.
- Pipeline od mocka źródła do zapisanego, zwalidowanego streszczenia.
- Idempotencja jobów; obsługa niepoprawnego wyniku „modelu”.
- Redakcja przed zewnętrznym krokiem + testy.
- ACL na API + testy reguł.
- Uruchomienie Compose + demo jedną lub kilkoma komendami.

---

## Co działa / atrapa / poza zakresem

> TODO (wypełnić przed oddaniem):

| Element | Status | Uwagi |
|---------|--------|--------|
| Model danych + migracje | TODO | |
| Pipeline + pg-boss | TODO | |
| Mock źródła (Fireflies) | TODO | atrapa |
| Mock summarizera (kontrakt pod LLM) | TODO | bez requestów sieciowych |
| Redakcja + testy | TODO | |
| ACL + testy | TODO | |
| API | TODO | |
| Next.js BFF + sidebar (tabela+Test+SSE, mock wyszukiwarki) | TODO | nie pełny UI produktu; bez osobnej strony detail |
| Prawdziwa integracja Google / Fireflies | poza MVP | zaślepka / opis w Części A |
| Q&A ze źródłami / RAG | poza MVP | architektura przewidziana w Części A |
| Powiadomienia | poza MVP | |
| Produkcyjny deploy na VPS | TODO / opis | Actions + checklista |

---

## CI/CD (zamierzone)

> TODO: dodać pliki workflow i włączyć branch protection na GitHubie.

- **Pull request** → instalacja zależności, lint (jeśli jest), **testy Jest**.
- **workflow_dispatch** → ręczne uruchomienie testów z **wyborem brancha**.
- Branch **`main`**: brak bezpośredniego pusha (tylko PR); reguły w ustawieniach repozytorium GitHub.

Deploy na **VPS** (docelowo z Actions po merge) - szczegóły w Części A / TODO w tej sekcji.

---

## Dokumentacja decyzyjna (Część A)

> TODO: dodać plik (np. `docs/ARCHITEKTURA.md` lub PDF), maks. ~5 stron, dla osoby decyzyjnej:

1. Źródło nagrań/transkrypcji i minimalne uprawnienia Google / Fireflies  
2. Bezpieczeństwo, zgody, RODO, retencja, dane u vendorów, edge case’y  
3. Model dostępu i ochrona przed wyciekiem przez wyszukiwanie/asystenta  
4. Wybór narzędzi STT / diarization / summary (jakość PL, koszt, prywatność)  
5. Koszt miesięczny - ≥2 warianty z obliczeniami  
6. Architektura, przepływ, awarie kroków  
7. Środowiska bez prawdziwych nagrań firmy  
8. Plan wdrożenia etapami i kryteria sukcesu  
9. Ryzyka i pytania do firmy  

---

## Użycie AI przy zadaniu

> TODO (wymagane na oddanie): jak korzystano z AI (np. Cursor), co model zaproponował, **co trzeba było poprawić** i za co odpowiadasz jako autor kodu.

---

## Licencja / oddanie

Repozytorium zadania rekrutacyjnego. Oddanie: link do repo (publiczne lub prywatne z dostępem dla wskazanego użytkownika) + dokument Części A w repo lub PDF.
