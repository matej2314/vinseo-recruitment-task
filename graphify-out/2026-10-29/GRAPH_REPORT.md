# Graph Report - vinseo-recruitment-task  (2026-10-29)

## Corpus Check
- 74 files · ~44,947 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 6, .example 2, .tsbuildinfo 2)

## Summary
- 1016 nodes · 1007 edges · 63 communities (56 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `32762002`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KROK 3 — LlmClient mock, Zod UC1, orkiestracja `meeting.process`
- api/package.json
- web/package.json
- KROK 3 — Szkielety Nest `api` + `worker`, stub `web`, Jest
- Vinseo Recruitment Task — major plan (backend)
- SPEC-README.md
- Anty-patterny
- Vinseo Recruitment Task — major plan (frontend)
- FAZA 2 — Szkielet powierzchni UI i BFF
- ids.ts
- package.json
- Dokumentacja komunikacji (kontrakty I/O)
- Observability
- compilerOptions
- Plan wdrożenia - etapy
- Strategia testów
- devDependencies
- compilerOptions
- worker/package.json
- SPEC — Frontend (`apps/web`)
- SPEC — Observability
- SPEC — Pipeline spotkania
- Architektura - Firmowy asystent spotkań
- SPEC — Komunikacja (powierzchnie I/O)
- SPEC — Testy
- Bezpieczeństwo i RODO
- Frontend
- scripts
- Dokumentacja koncepcyjna - Firmowy asystent spotkań
- SPEC — LLM i streszczenie (UC1)
- contracts/package.json
- Vinseo - Firmowy asystent spotkań
- Wdrożenie i środowiska
- Koszty i warianty
- compilerOptions
- api/README.md
- compilerOptions
- dependencies
- Przepływy danych
- LLM i asystent
- .oxlintrc.json
- tsconfig.build.json
- Architektura katalogów i plików
- Słownik
- nest-cli.json
- web/README.md
- Dokumentacja - Firmowy asystent spotkań
- api/AGENTS.md
- web/AGENTS.md
- eslint.config.mjs
- compilerOptions
- api/src/app.module.ts
- vinseo-recruitment-task_feature_plan_backend-etap0-f1-f2_1.md
- worker/src/app.module.ts
- dependencies
- devDependencies
- HealthController
- worker/nest-cli.json
- scripts
- nestjs-config-shim.cjs

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 20 edges
3. `KROK 3 — Szkielety Nest `api` + `worker`, stub `web`, Jest` - 19 edges
4. `compilerOptions` - 16 edges
5. `compilerOptions` - 14 edges
6. `Vinseo Recruitment Task — major plan (frontend)` - 14 edges
7. `Architektura - Firmowy asystent spotkań` - 13 edges
8. `Bezpieczeństwo i RODO` - 13 edges
9. `Vinseo Recruitment Task — major plan (backend)` - 13 edges
10. `Wdrożenie i środowiska` - 12 edges

## Surprising Connections (you probably didn't know these)
- `MeetingProcessJobPayload` --references--> `ExternalMeetingId`  [EXTRACTED]
  packages/contracts/src/jobs.ts → packages/contracts/src/ids.ts
- `MeetingProcessJobPayload` --references--> `FixtureKey`  [EXTRACTED]
  packages/contracts/src/jobs.ts → packages/contracts/src/ids.ts
- `MeetingProcessJobPayload` --references--> `RequestId`  [EXTRACTED]
  packages/contracts/src/jobs.ts → packages/contracts/src/ids.ts
- `MeetingProcessJobPayload` --references--> `MeetingSourceKind`  [EXTRACTED]
  packages/contracts/src/jobs.ts → packages/contracts/src/meeting-source.ts

## Import Cycles
- None detected.

## Communities (63 total, 4 thin omitted)

### Community 0 - "KROK 3 — LlmClient mock, Zod UC1, orkiestracja `meeting.process`"
Cohesion: 0.04
Nodes (46): Biblioteki, Demo (README) — fragment do dopisania, DoD (krok), DoD (krok), DoD (krok), DoD (krok), DoD (krok), DTO + controller DX (+38 more)

### Community 1 - "api/package.json"
Cohesion: 0.06
Nodes (33): jest, @nestjs/cli, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/schematics, pg, @prisma/adapter-pg (+25 more)

### Community 2 - "web/package.json"
Cohesion: 0.05
Nodes (37): geistMono, geistSans, metadata, nextConfig, dependencies, next, react, react-dom (+29 more)

### Community 3 - "KROK 3 — Szkielety Nest `api` + `worker`, stub `web`, Jest"
Cohesion: 0.04
Nodes (46): Biblioteki / API, Biblioteki / API, Biblioteki / API, Biblioteki / API, DoD (krok), DoD (krok), DoD (krok), DoD (krok) (+38 more)

### Community 4 - "Vinseo Recruitment Task — major plan (backend)"
Cohesion: 0.05
Nodes (36): Faza 1 — Fundament monorepo i szkielet procesów, Faza 2 — Pipeline spotkania, Faza 3 — Auth, ACL i kontrakty API pod UI, Faza 4 — Część A + CI, Faza 5 — Domknięcie oddania (backend / etap 0), Krok 1.1 — Struktura całego repozytorium, Krok 1.2 — Lokalne środowisko danych i kolejki, Krok 1.3 — Szkielety procesów Nest oraz stub frontu (+28 more)

### Community 5 - "SPEC-README.md"
Cohesion: 0.04
Nodes (45): Cel / zakres, Konfiguracja — reguły, Kryteria akceptacji (review / weryfikacja), Nie wolno, Norma: wzorce i struktura, Powiązanie ze stylem z docs, Poza zakresem, SPEC — Architektura (monolit, procesy, warstwy) (+37 more)

### Community 6 - "Anty-patterny"
Cohesion: 0.06
Nodes (34): 403 vs 404 przy cudzym zasobie, ACL, bezpieczeństwo, dane, ACL tylko na froncie / w BFF, Anty-patterny, BFF jako drugi backend domenowy, Brak idempotencji jobów, Czytanie `process.env` głęboko w domenie, Drugi vendor LLM „tylko do asystenta” (+26 more)

### Community 7 - "Vinseo Recruitment Task — major plan (frontend)"
Cohesion: 0.07
Nodes (29): Faza 1 — Odbiór fundamentu i stubu `web`, Faza 2 — Szkielet powierzchni UI i BFF, Faza 3 — UI v1: sesja, tabela + Test + SSE, mock wyszukiwarki, Faza 4 — Wkład frontu w bramkę jakości / oddanie, Faza 5 — Domknięcie UI etapu 0, Krok 1.1 — Potwierdzenie gotowości stubu po fundamencie backendu, Krok 1.2 — Mapa widoków v1 i granic BFF, Krok 1.3 — Gotowość warstwy web do rozbudowy (+21 more)

### Community 8 - "FAZA 2 — Szkielet powierzchni UI i BFF"
Cohesion: 0.07
Nodes (26): FAZA 1 — Odbiór fundamentu i stubu `web`, FAZA 2 — Szkielet powierzchni UI i BFF, KROK 1 — Bazowy layout roboczy i tooling UI, KROK 1 — Potwierdzenie gotowości stubu, KROK 2 — Mapa widoków v1 i granic BFF, KROK 2 — Placeholdery auth, sidebar i widoków, KROK 3 — Gotowość warstwy web do rozbudowy, KROK 3 — Szkielet BFF (proxy) (+18 more)

### Community 9 - "ids.ts"
Cohesion: 0.10
Nodes (16): ClientId, ExternalMeetingId, FixtureKey, JobId, MeetingId, ProjectId, RequestId, UserId (+8 more)

### Community 10 - "package.json"
Cohesion: 0.08
Nodes (25): dependencies, @prisma/client, description, devDependencies, prisma, typescript, engines, node (+17 more)

### Community 11 - "Dokumentacja komunikacji (kontrakty I/O)"
Cohesion: 0.09
Nodes (21): 1.1 Auth, 1.2 Spotkania, 1.3 Demo - uruchomienie pipeline (przycisk Test), 1.3a SSE — status spotkania, 1.4 Envelope błędów, 1. HTTP API (`apps/api`), 2. BFF (`apps/web`, App Router `app/api/*`), 3. Kolejka pg-boss (+13 more)

### Community 12 - "Observability"
Cohesion: 0.09
Nodes (21): Alerty v1, Anty-patterny observability, API, Audyt biznesowy: tabela `audit_log`, Cel, Correlation id, Gdzie powstają sygnały, Health (obowiązkowe) (+13 more)

### Community 13 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, incremental, isolatedModules (+12 more)

### Community 14 - "Plan wdrożenia - etapy"
Cohesion: 0.10
Nodes (19): Czego świadomie nie ma w etapie 0, Etap 0 - Szkielet (oddanie rekrutacyjne / fundament), Etap 1 - Pilot (callе z klientem), Etap 2 - Rozszerzenie, Etap 3 - Cała firma, Jest, Kryteria „etap 0 działa”, Kryteria sukcesu etapu 1 (+11 more)

### Community 15 - "Strategia testów"
Cohesion: 0.10
Nodes (19): Anty-patterny testowe (skrót), Audyt (`audit_log`), Baza testowa, Cele, CI i reguła zespołu, Czego nie testujemy w v1 (świadomie), Integracja - API (supertest), Integracja - pipeline (+11 more)

### Community 16 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, jest, @nestjs/cli, @nestjs/schematics, @nestjs/testing, oxlint, oxlint-tsgolint, prettier (+9 more)

### Community 17 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 18 - "worker/package.json"
Cohesion: 0.08
Nodes (23): jest, @nestjs/cli, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/schematics, pg, @prisma/adapter-pg (+15 more)

### Community 19 - "SPEC — Frontend (`apps/web`)"
Cohesion: 0.12
Nodes (16): Bezpieczeństwo UI, BFF, Cel / zakres, Kryteria akceptacji, Nie wolno, Norma: wzorce, Powiązanie ze stylem z docs, Poza tą wersją (+8 more)

### Community 20 - "SPEC — Observability"
Cohesion: 0.12
Nodes (16): Audyt (`audit_log`), Cel / zakres, Correlation, Health, Katalog `eventType` (v1), Kryteria akceptacji, Logger (pino), Metryki lekkie (+8 more)

### Community 21 - "SPEC — Pipeline spotkania"
Cohesion: 0.12
Nodes (16): Cel / zakres, Fail-closed i retry, Idempotencja, Kryteria akceptacji, Nie wolno, Norma: wzorce, Orkiestracja, Persistencja (Prisma) (+8 more)

### Community 22 - "Architektura - Firmowy asystent spotkań"
Cohesion: 0.12
Nodes (16): Anty-patterny, których unikamy (architektonicznie), Architektura - Firmowy asystent spotkań, Autoryzacja (ACL), Dane i kolejka, Granica „na zewnątrz” i redakcja, Integracje zewnętrzne, Mapowanie na inne dokumenty, Pipeline spotkania (+8 more)

### Community 23 - "SPEC — Komunikacja (powierzchnie I/O)"
Cohesion: 0.12
Nodes (15): BFF (`apps/web`, `app/api/*`), Cel / zakres, Envelope błędów, HTTP API (`apps/api`), Kolejka pg-boss, Kryteria akceptacji, Nie wolno, Norma: wzorce (+7 more)

### Community 24 - "SPEC — Testy"
Cohesion: 0.12
Nodes (15): Cel / zakres, CI, Frontend, Integracja — obowiązkowe, Kryteria akceptacji, Narzędzia i izolacja, Nie wolno, Norma: wzorce (+7 more)

### Community 25 - "Bezpieczeństwo i RODO"
Cohesion: 0.13
Nodes (15): Bezpieczeństwo i RODO, Cele ochrony, Dostęp (ACL) a prywatność, Edge case’y (checklista operacyjna), Mapowanie na inne dokumenty, Offboarding pracownika, Pytania do firmy (nie blokują architektury v1), Redakcja przed „wyjściem” (+7 more)

### Community 26 - "Frontend"
Cohesion: 0.13
Nodes (14): 1. Strona główna `/` — auth, 2. Layout po zalogowaniu — sidebar, 3. Widok domyślny — tabela + Test, 4. Wyszukiwarka (mock), BFF (`app/api/*`), Cel warstwy web, Frontend, Mapowanie na inne dokumenty (+6 more)

### Community 27 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, lint, start, start:dev, start:prod, test, test:e2e (+1 more)

### Community 28 - "Dokumentacja koncepcyjna - Firmowy asystent spotkań"
Cohesion: 0.14
Nodes (13): Cel produktu, Dla kogo jest system, Dokumentacja koncepcyjna - Firmowy asystent spotkań, Główne założenia, Kryteria sukcesu v1, Mapowanie na inne dokumenty, Poza zakresem v1, Produktowo (pierwsza wersja firmowa) (+5 more)

### Community 29 - "SPEC — LLM i streszczenie (UC1)"
Cohesion: 0.14
Nodes (13): Cel / zakres, Kryteria akceptacji, Nie wolno, Norma: wzorce, Port i adaptery, Powiązanie ze stylem z docs, Poza tą wersją, Prywatność i obserwowalność (norma LLM) (+5 more)

### Community 30 - "contracts/package.json"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, exports, typescript, main, name, private, scripts (+4 more)

### Community 31 - "Vinseo - Firmowy asystent spotkań"
Cohesion: 0.15
Nodes (12): Architektura (wysoki poziom), CI/CD (zamierzone), Co działa / atrapa / poza zakresem, Co powinno działać po MVP kodu (Część B), Dokumentacja decyzyjna (Część A), Licencja / oddanie, Stack (docelowy), Struktura repozytorium (docelowa) (+4 more)

### Community 32 - "Wdrożenie i środowiska"
Cohesion: 0.17
Nodes (12): Backup, CI (GitHub Actions) - v1, Deploy na VPS - checklista (TODO operacyjne), Lokalny start (skrót), Mapowanie na inne dokumenty, Migracje i rollback (zasady), Retencja `audit_log`, Topologia produkcji (docelowa) (+4 more)

### Community 33 - "Koszty i warianty"
Cohesion: 0.17
Nodes (11): Fireflies (seaty), Koszt LLM miesięcznie (pełne 400 spotkań), Koszt LLM na jedno spotkanie, Koszty i warianty, Mapowanie na inne dokumenty, Porównanie (orientacyjne), Rekomendacja decyzyjna (skrót), Wariant A - Fireflies (pełny coverage) + GPT-5.2 + VPS (+3 more)

### Community 34 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, incremental, isolatedModules (+13 more)

### Community 35 - "api/README.md"
Cohesion: 0.18
Nodes (10): Compile and run the project, Deployment, Description, License, Observability, Project setup, Resources, Run tests (+2 more)

### Community 36 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, declaration, isolatedModules, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 37 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, bcrypt, class-transformer, class-validator, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/platform-express (+7 more)

### Community 38 - "Przepływy danych"
Cohesion: 0.20
Nodes (10): 1. Pipeline spotkania (happy path, mock), 2. Przycisk Test (PoC na froncie), 3. Odczyt spotkania (z ACL), 4. Auth (login i sesja), 5. Awaria w połowie i idempotencja, 6. Docelowe wejście Fireflies (poza mockiem v1), 7. Asystent Q&A (koncepcja, etap 2+), Mapowanie na inne dokumenty (+2 more)

### Community 39 - "LLM i asystent"
Cohesion: 0.25
Nodes (8): Jedna integracja, dwa use case’y, Kryteria wyboru modelu (na przyszłą podmianę), LLM i asystent, Mapowanie na inne dokumenty, Podział odpowiedzialności, Prywatność, UC1 - summarizeMeeting (obowiązkowe w architekturze oddania), UC2 - answerQuestion (przyszłe usprawnienie)

### Community 40 - ".oxlintrc.json"
Cohesion: 0.29
Nodes (6): env, node, rules, typescript/no-explicit-any, typescript/no-floating-promises, $schema

### Community 41 - "tsconfig.build.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 42 - "Architektura katalogów i plików"
Cohesion: 0.29
Nodes (6): Architektura katalogów i plików, Drzewo, Konwencje nazewnictwa (katalogi), Mapowanie na inne dokumenty, Odzwierciedlenie stylu architektury, Zasady rozmieszczenia

### Community 43 - "Słownik"
Cohesion: 0.29
Nodes (6): Aplikacja i infrastruktura, Integracje (słownik skrótowy), Mapowanie na inne dokumenty, Produkt i domena, Przetwarzanie i jakość danych, Słownik

### Community 44 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 46 - "web/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 47 - "Dokumentacja - Firmowy asystent spotkań"
Cohesion: 0.50
Nodes (4): Dokumentacja - Firmowy asystent spotkań, Jak czytać, Mapowanie temat → plik (skrót), Spis plików

### Community 52 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, isolatedModules, module (+7 more)

### Community 53 - "api/src/app.module.ts"
Cohesion: 0.19
Nodes (9): AppModule, Module, AppConfigModule, Module, ApiEnv, apiEnvSchema, validateApiEnv(), @nestjs/testing (+1 more)

### Community 54 - "vinseo-recruitment-task_feature_plan_backend-etap0-f1-f2_1.md"
Cohesion: 0.14
Nodes (13): 1. Zależności, 2. Env, 3. Postgres, 4. Prisma, 5. Procesy (osobne terminale), (dev iteracyjny) pnpm db:migrate, DoD (krok), Meta (+5 more)

### Community 55 - "worker/src/app.module.ts"
Cohesion: 0.21
Nodes (7): AppModule, Module, AppConfigModule, Module, validateWorkerEnv(), WorkerEnv, workerEnvSchema

### Community 56 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, @nestjs/common, @nestjs/config, @nestjs/core, pg, @prisma/adapter-pg, @prisma/client, reflect-metadata (+3 more)

### Community 57 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, jest, @nestjs/cli, @nestjs/schematics, ts-jest, @types/jest, @types/node, @types/pg (+1 more)

### Community 58 - "HealthController"
Cohesion: 0.29
Nodes (5): HealthController, HealthModule, Module, Controller, Get

### Community 59 - "worker/nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 60 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, start, start:dev, start:prod, test

## Knowledge Gaps
- **778 isolated node(s):** `$schema`, `typescript/no-explicit-any`, `typescript/no-floating-promises`, `node`, `$schema` (+773 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 804 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `$schema`, `typescript/no-explicit-any`, `typescript/no-floating-promises` to the rest of the system?**
  _778 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `KROK 3 — LlmClient mock, Zod UC1, orkiestracja `meeting.process`` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `api/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `KROK 3 — Szkielety Nest `api` + `worker`, stub `web`, Jest` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `Vinseo Recruitment Task — major plan (backend)` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `SPEC-README.md` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._