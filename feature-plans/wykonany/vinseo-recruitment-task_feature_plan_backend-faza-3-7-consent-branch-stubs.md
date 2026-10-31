# Vinseo Recruitment Task - feature plan: backend Faza 3.7 (zaślepka portów gałęzi braku zgody)

**Kotwica major:** Faza 3.7 - Zaślepka portów gałęzi braku zgody (Calendar + Gemini Notes) · kroki 3.7.1–3.7.3  
**Major:** `vinseo-recruitment-task-backend_major-plan.md`  
**Źródła:** `docs/bezpieczenstwo_i_rodo.md`, `docs/architektura.md`, `docs/architektura_katalogi_pliki.md`, `docs/dokumentacja_komunikacji.md`, `docs/dictionary.md`, `docs/anty_patterny.md`, `docs/plan_wdrozenia_etapy.md`; `spec/SPEC-PIPELINE.md` (P-2a/P-2b), `SPEC-KOMUNIKACJA.md` (port metadane vs treść, K-7, K-12/K-12a), `SPEC-DANE.md` (D-7c), `SPEC-TESTY.md` (T-11b), `SPEC-AUTH_I_ACL.md` (zakaz ekspansji grup Calendar)  
**Pass rozwojowy:** brak przesunięć (kolejność 1→2→3; typy metadanych w KROK 1 przed stubem Calendar; `MeetingSourcePort` już istnieje przed stubem `gemini-notes`).

**Statusy kroków feature:** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`

**Biblioteki (Context7):** NestJS `@nestjs/common` ^12 — DI: `Symbol` + `@Inject()` dla portu-interfejsu; rejestracja `{ provide, useExisting }` / `useClass`; alias `useExisting` gdy token portu wskazuje konkretną klasę. Wyjątek zaślepki: `NotImplementedException`. Źródło: Context7 `/nestjs/docs.nestjs.com` (dependency injection — Symbol token, useExisting).

---

## Meta

| Pole | Wartość |
|------|---------|
| Wycinek | Port metadanych (Calendar) + adapter treści `gemini-notes` jako **zaślepki** w `apps/worker/src/adapters/`; happy-path nadal mock; adnotacja etap 1+; lekkie testy T-11b v0 |
| Poza zakresem | OAuth Google; prawdziwy Calendar / Meet / Notes API; egzekucja zgody / wybór `fireflies`\|`gemini-notes` w orchestratorze; migracje Prisma D-7c; zmiany Fazy 3.6 (recording K-5b); Faza 4+; BFF/UI |
| Stack (odwołanie) | NestJS `worker`, `@vinseo/contracts`, Jest — bez redefinicji SPEC |
| Typy na granicach | `MeetingMetadataPayload` (bez segmentów); treść nadal `MeetingSourcePayload` + `MeetingSourcePort`; branded `ExternalMeetingId` na wejściu portu metadanych |

---

## Założenia

- Port **metadanych** (Calendar) jest **osobny** od portu **treści** (`MeetingSourcePort`) i od on-demand recording w `api` (K-5b) — `SPEC-PIPELINE` P-2a, `SPEC-KOMUNIKACJA` tabela portów.
- Zaślepki żyją wyłącznie w **`apps/worker`** — **nie** wołać z BFF/`api` (K-7).
- Happy-path `meeting.process`: `MEETING_SOURCE_PORT` → nadal `MockMeetingSourceAdapter`; orchestrator **nie** wstrzykuje portu Calendar ani `gemini-notes` w tej fazie.
- Stub rzuca `NotImplementedException` przy wywołaniu — **bez** sieci / credentiali Google.
- **Zakaz** fat-adaptera Calendar+FF+Notes; **zakaz** ekspansji grup Workspace; **zakaz** traktowania Calendar / Notes jako audio / recording FF.
- `MeetingSourceKind` w jobs pozostaje `"mock"` — rozszerzenie unii o `fireflies` \| `gemini-notes` = etap 1+ (adnotacja, nie migracja payloadu joba w tej fazie).
- Brak migracji Prisma / kolumn zgody / `contentSource` (D-7c: norma logiczna; kod DB przy adapterach prod).

---

## FAZA 1 - Zaślepka portów gałęzi braku zgody (Calendar + Gemini Notes)

Mapowanie: major Faza 3.7 (3.7.1–3.7.3).

### KROK 1 - Port metadanych (Calendar) — zaślepka

**Status:** `WYKONANY`

**Cel:** Powierzchnia portu metadanych faktu callu pod przyszły Google Calendar API; zaślepka bez sieci (`SPEC-PIPELINE` P-2b, `SPEC-KOMUNIKACJA` K-12, major 3.7.1).

**Artefakty:**

- Nowy: `packages/contracts/src/meeting-metadata.ts`
- Zmiana: `packages/contracts/src/index.ts` (re-eksport)
- Nowy: `apps/worker/src/adapters/meeting-metadata/meeting-metadata.port.ts`
- Nowy: `apps/worker/src/adapters/meeting-metadata/stub-calendar-meeting-metadata.adapter.ts`
- Nowy: `apps/worker/src/adapters/meeting-metadata/meeting-metadata.module.ts`
- Nowy: `apps/worker/src/adapters/meeting-metadata/stub-calendar-meeting-metadata.adapter.spec.ts`
- Zmiana: `apps/worker/src/pipeline/pipeline.module.ts` (import modułu — powierzchnia w grafie DI; **bez** wstrzykiwania do orchestratora)

#### Implementacja — nowy plik contracts

`packages/contracts/src/meeting-metadata.ts`:

```typescript
/**
 * Port metadanych Calendar (K-12) — fakt callu / uczestnicy indywidualni.
 * Bez segmentów transcriptu i bez media URL (≠ MeetingSourcePayload, ≠ recording).
 */
export interface MeetingMetadataParticipant {
  readonly email: string | null;
  readonly displayName: string;
  readonly internal: boolean;
}

export interface MeetingMetadataPayload {
  readonly externalId: string;
  readonly title: string;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly participants: readonly MeetingMetadataParticipant[];
}
```

`packages/contracts/src/index.ts` — **dopisać** re-eksport (kolejność jak sąsiednie eksporty kontraktów domenowych):

```typescript
export * from './meeting-metadata.js';
```

(umieścić po `./meeting-source.js` albo w tej samej grupie eksportów I/O.)

#### Nowy plik — kompletny kod (worker)

`apps/worker/src/adapters/meeting-metadata/meeting-metadata.port.ts`:

```typescript
import type {
  ExternalMeetingId,
  MeetingMetadataPayload,
} from '@vinseo/contracts';

export const MEETING_METADATA_PORT = Symbol('MEETING_METADATA_PORT');

export interface FetchMeetingMetadataInput {
  readonly externalMeetingId: ExternalMeetingId;
}

/**
 * Port metadanych faktu callu (Google Calendar w etapie 1+).
 * v0: zaślepka — bez OAuth / Calendar API.
 * Oddzielony od MeetingSourcePort (treść) i od MeetingRecordingPort (api / K-5b).
 * Zakaz: ekspansja grup Workspace; Calendar ≠ magazyn audio.
 *
 * Etap 1+: GoogleCalendarMeetingMetadataAdapter za MEETING_METADATA_PORT —
 * ten sam kształt MeetingMetadataPayload; uczestnicy wyłącznie indywidualni.
 */
export interface MeetingMetadataPort {
  fetch(input: FetchMeetingMetadataInput): Promise<MeetingMetadataPayload>;
}
```

`apps/worker/src/adapters/meeting-metadata/stub-calendar-meeting-metadata.adapter.ts`:

```typescript
import { Injectable, NotImplementedException } from '@nestjs/common';
import type { MeetingMetadataPayload } from '@vinseo/contracts';

import type {
  FetchMeetingMetadataInput,
  MeetingMetadataPort,
} from './meeting-metadata.port.js';

/**
 * Zaślepka v0 portu metadanych (Calendar).
 * Happy-path pipeline **nie** woła tego adaptera.
 * Etap 1+: podmiana na prawdziwy klient Calendar API (ten sam port).
 */
@Injectable()
export class StubCalendarMeetingMetadataAdapter implements MeetingMetadataPort {
  async fetch(
    _input: FetchMeetingMetadataInput,
  ): Promise<MeetingMetadataPayload> {
    throw new NotImplementedException(
      'Calendar meeting metadata adapter is a v0 stub; Google Calendar API lands in stage 1+',
    );
  }
}
```

`apps/worker/src/adapters/meeting-metadata/meeting-metadata.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { MEETING_METADATA_PORT } from './meeting-metadata.port.js';
import { StubCalendarMeetingMetadataAdapter } from './stub-calendar-meeting-metadata.adapter.js';

@Module({
  providers: [
    StubCalendarMeetingMetadataAdapter,
    {
      provide: MEETING_METADATA_PORT,
      useExisting: StubCalendarMeetingMetadataAdapter,
    },
  ],
  exports: [MEETING_METADATA_PORT, StubCalendarMeetingMetadataAdapter],
})
export class MeetingMetadataModule {}
```

#### Refaktor — `pipeline.module.ts`

**teraz:**

```typescript
import { Module } from '@nestjs/common';

import { LlmModule } from '../adapters/llm/llm.module.js';
import { MeetingSourceModule } from '../adapters/meeting-source/meeting-source.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MeetingProcessOrchestrator } from './meeting-process.orchestrator.js';
import { MeetingRepository } from './meeting-repository.js';
import { SummarizeMeetingUseCase } from './summarize-meeting.use-case.js';

@Module({
  imports: [PrismaModule, MeetingSourceModule, LlmModule],
  providers: [
    MeetingRepository,
    SummarizeMeetingUseCase,
    MeetingProcessOrchestrator,
  ],
  exports: [MeetingProcessOrchestrator],
})
export class PipelineModule {}
```

**zamień na:**

```typescript
import { Module } from '@nestjs/common';

import { LlmModule } from '../adapters/llm/llm.module.js';
import { MeetingMetadataModule } from '../adapters/meeting-metadata/meeting-metadata.module.js';
import { MeetingSourceModule } from '../adapters/meeting-source/meeting-source.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MeetingProcessOrchestrator } from './meeting-process.orchestrator.js';
import { MeetingRepository } from './meeting-repository.js';
import { SummarizeMeetingUseCase } from './summarize-meeting.use-case.js';

@Module({
  imports: [
    PrismaModule,
    MeetingSourceModule,
    MeetingMetadataModule,
    LlmModule,
  ],
  providers: [
    MeetingRepository,
    SummarizeMeetingUseCase,
    MeetingProcessOrchestrator,
  ],
  exports: [MeetingProcessOrchestrator],
})
export class PipelineModule {}
```

**Uwaga:** `MeetingProcessOrchestrator` **bez zmian** — nie wstrzykuje `MEETING_METADATA_PORT`.

#### Testy (unit stub)

`apps/worker/src/adapters/meeting-metadata/stub-calendar-meeting-metadata.adapter.spec.ts`:

```typescript
import { NotImplementedException } from '@nestjs/common';
import { asExternalMeetingId } from '@vinseo/contracts';

import { StubCalendarMeetingMetadataAdapter } from './stub-calendar-meeting-metadata.adapter.js';

describe('StubCalendarMeetingMetadataAdapter', () => {
  const adapter = new StubCalendarMeetingMetadataAdapter();

  it('throws NotImplementedException (T-11b v0 stub)', async () => {
    await expect(
      adapter.fetch({
        externalMeetingId: asExternalMeetingId('cal-stub-1'),
      }),
    ).rejects.toBeInstanceOf(NotImplementedException);
  });
});
```

**DoD kroku:**

- Katalog `adapters/meeting-metadata/` z portem + stub + module.
- `MeetingMetadataPayload` w contracts (bez segmentów / media).
- `PipelineModule` importuje `MeetingMetadataModule`; orchestrator nie woła Calendar.
- Unit: stub → `NotImplementedException`; brak wywołań sieciowych.

---

### KROK 2 - Adapter treści `gemini-notes` — zaślepka

**Status:** `WYKONANY`

**Cel:** Adapter treści `gemini-notes` na kontrakcie `MeetingSourcePort` (obok mock); nie łamie happy-path; nie serwuje audio FF (`SPEC-PIPELINE` P-2a/P-2b, major 3.7.2).

**Artefakty:**

- Nowy: `apps/worker/src/adapters/meeting-source/gemini-notes-meeting-source.adapter.ts`
- Nowy: `apps/worker/src/adapters/meeting-source/gemini-notes-meeting-source.adapter.spec.ts`
- Zmiana: `apps/worker/src/adapters/meeting-source/meeting-source.port.ts` (adnotacja etap 1+ / gałęzie)
- Zmiana: `apps/worker/src/adapters/meeting-source/meeting-source.module.ts` (rejestracja klasy stub; token portu nadal mock)
- Zmiana (opcjonalna, zalecana): `packages/contracts/src/meeting-source.ts` — krótki komentarz JSDoc przy `MeetingSourceKind` / `MeetingSourcePayload` o przyszłych wartościach (bez zmiany unii runtime w tej fazie)

#### Refaktor — adnotacja na porcie treści

`meeting-source.port.ts` — **teraz** (cały plik / nagłówek bez opisu gałęzi):

```typescript
import type { MeetingSourcePayload } from '@vinseo/contracts';

export const MEETING_SOURCE_PORT = Symbol('MEETING_SOURCE_PORT');

export interface FetchMeetingSourceInput {
  readonly externalMeetingId: string;
  readonly fixtureKey?: string;
}

export interface MeetingSourcePort {
  fetch(input: FetchMeetingSourceInput): Promise<MeetingSourcePayload>;
}
```

**zamień na:**

```typescript
import type { MeetingSourcePayload } from '@vinseo/contracts';

export const MEETING_SOURCE_PORT = Symbol('MEETING_SOURCE_PORT');

export interface FetchMeetingSourceInput {
  readonly externalMeetingId: string;
  readonly fixtureKey?: string;
}

/**
 * Port źródła **treści** (K-12) — mock \| fireflies \| gemini-notes.
 * v0 happy-path: MockMeetingSourceAdapter za MEETING_SOURCE_PORT.
 * v0 powierzchnia: GeminiNotesMeetingSourceAdapter (zaślepka; nie domyślny token).
 * Etap 1+: wybór adaptera wg zgody — fireflies (ze zgodą) \| gemini-notes (bez);
 * UC1 gdy tekst; metadata-only gdy brak materiału (P-4a). Oddzielony od
 * MEETING_METADATA_PORT (Calendar) i od recording K-5b (tylko gałąź ze zgodą).
 */
export interface MeetingSourcePort {
  fetch(input: FetchMeetingSourceInput): Promise<MeetingSourcePayload>;
}
```

#### Nowy plik — kompletny kod

`apps/worker/src/adapters/meeting-source/gemini-notes-meeting-source.adapter.ts`:

```typescript
import { Injectable, NotImplementedException } from '@nestjs/common';
import type { MeetingSourcePayload } from '@vinseo/contracts';

import type {
  FetchMeetingSourceInput,
  MeetingSourcePort,
} from './meeting-source.port.js';

/**
 * Zaślepka v0 adaptera treści `gemini-notes` (Notes by Gemini / Meet).
 * Nie jest domyślnym MEETING_SOURCE_PORT — happy-path pozostaje na mocku.
 * Zakaz: audio / recording FF; fat-adapter z Calendar.
 *
 * Etap 1+: prawdziwy klient Notes — ten sam MeetingSourcePort / MeetingSourcePayload;
 * wybór vs fireflies wg zgody (P-2a); puste Notes → metadata-only (P-4a).
 */
@Injectable()
export class GeminiNotesMeetingSourceAdapter implements MeetingSourcePort {
  async fetch(_input: FetchMeetingSourceInput): Promise<MeetingSourcePayload> {
    throw new NotImplementedException(
      'gemini-notes meeting source is a v0 stub; Google Meet / Notes API lands in stage 1+',
    );
  }
}
```

#### Refaktor — `meeting-source.module.ts`

**teraz:**

```typescript
import { Module } from '@nestjs/common';

import { MEETING_SOURCE_PORT } from './meeting-source.port.js';
import { MockMeetingSourceAdapter } from './mock-meeting-source.adapter.js';

@Module({
  providers: [
    MockMeetingSourceAdapter,
    { provide: MEETING_SOURCE_PORT, useExisting: MockMeetingSourceAdapter },
  ],
  exports: [MEETING_SOURCE_PORT],
})
export class MeetingSourceModule {}
```

**zamień na:**

```typescript
import { Module } from '@nestjs/common';

import { GeminiNotesMeetingSourceAdapter } from './gemini-notes-meeting-source.adapter.js';
import { MEETING_SOURCE_PORT } from './meeting-source.port.js';
import { MockMeetingSourceAdapter } from './mock-meeting-source.adapter.js';

@Module({
  providers: [
    MockMeetingSourceAdapter,
    GeminiNotesMeetingSourceAdapter,
    { provide: MEETING_SOURCE_PORT, useExisting: MockMeetingSourceAdapter },
  ],
  exports: [MEETING_SOURCE_PORT, GeminiNotesMeetingSourceAdapter],
})
export class MeetingSourceModule {}
```

#### Dopisek contracts (JSDoc, bez zmiany unii)

`packages/contracts/src/meeting-source.ts` — **teraz:**

```typescript
export type MeetingSourceKind = "mock";
```

**zamień na:**

```typescript
/**
 * v0: wyłącznie `mock` w payloadzie joba.
 * Etap 1+: rozszerzenie o `fireflies` | `gemini-notes` przy egzekucji zgody
 * (bez zmiany nazwy joba `meeting.process` — K-12a / P-2).
 */
export type MeetingSourceKind = 'mock';
```

(Reszta pliku — `MeetingSourcePayload` itd. — bez zmian kształtu.)

#### Testy

`apps/worker/src/adapters/meeting-source/gemini-notes-meeting-source.adapter.spec.ts`:

```typescript
import { NotImplementedException } from '@nestjs/common';

import { GeminiNotesMeetingSourceAdapter } from './gemini-notes-meeting-source.adapter.js';

describe('GeminiNotesMeetingSourceAdapter', () => {
  const adapter = new GeminiNotesMeetingSourceAdapter();

  it('throws NotImplementedException (T-11b v0 stub)', async () => {
    await expect(
      adapter.fetch({ externalMeetingId: 'notes-stub-1' }),
    ).rejects.toBeInstanceOf(NotImplementedException);
  });
});
```

**DoD kroku:**

- Klasa `GeminiNotesMeetingSourceAdapter` zarejestrowana w module; `MEETING_SOURCE_PORT` → nadal mock.
- Stub rzuca `NotImplementedException`; brak sieci Google / audio FF.
- Orchestrator / job path bez zmian zachowania.

---

### KROK 3 - Adnotacja etap 1+ i testy stub (T-11b v0)

**Status:** `WYKONANY`

**Cel:** Domknięcie adnotacji etap 0 vs 1+ oraz lekkich testów rejestracji / „stub nie na happy-path” bez Google w CI (`SPEC-TESTY` T-11b, major 3.7.3).

**Artefakty:**

- Nowy: `apps/worker/src/adapters/README.md` (krótka mapa portów v0 vs etap 1+)
- Nowy: `apps/worker/src/adapters/meeting-source/meeting-source.module.spec.ts` (DI: token = mock; klasa gemini zarejestrowana)
- Nowy: `apps/worker/src/adapters/meeting-metadata/meeting-metadata.module.spec.ts` (DI: token = stub Calendar)
- Bez zmian: `meeting-process.orchestrator.ts` / istniejące testy orchestratora — regresja happy-path mock

#### Nowy plik — README adapterów

`apps/worker/src/adapters/README.md`:

```markdown
# Adaptery workera (I/O)

## Obecna wersja (etap 0 / v0)

| Port | Token / klasa | Implementacja |
|------|---------------|---------------|
| Treść | `MEETING_SOURCE_PORT` | `MockMeetingSourceAdapter` (happy-path demo) |
| Treść (powierzchnia) | `GeminiNotesMeetingSourceAdapter` | zaślepka `NotImplemented` — **nie** domyślny token |
| Metadane | `MEETING_METADATA_PORT` | `StubCalendarMeetingMetadataAdapter` — zaślepka; **nie** wołana z orchestratora |
| LLM | `LLM_CLIENT_PORT` | mock |

On-demand nagranie FF (K-5b) żyje w **`apps/api`**, nie tutaj. Gałąź **bez zgody** nie używa mechanizmu nagrania FF.

## Etap 1+ (ta sama powierzchnia portów)

1. Calendar API za `MEETING_METADATA_PORT` (uczestnicy indywidualni; bez ekspansji grup).
2. Wybór treści wg zgody: `fireflies` (ze zgodą) \| `gemini-notes` (bez) za `MeetingSourcePort`.
3. Gdy Notes zwraca tekst → redakcja + UC1; gdy brak materiału → metadata-only (P-4a) — **sam** brak zgody ≠ metadata-only.
4. Pola zgody / `contentSource` w schemacie przy adapterach prod (`SPEC-DANE` D-7c) — nie w zaślepce v0.
5. Zakaz fat-adaptera Calendar+FF+Notes; Calendar ≠ audio.
```

#### Testy rejestracji DI

`apps/worker/src/adapters/meeting-source/meeting-source.module.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';

import { GeminiNotesMeetingSourceAdapter } from './gemini-notes-meeting-source.adapter.js';
import { MEETING_SOURCE_PORT } from './meeting-source.port.js';
import { MeetingSourceModule } from './meeting-source.module.js';
import { MockMeetingSourceAdapter } from './mock-meeting-source.adapter.js';

describe('MeetingSourceModule (T-11b v0)', () => {
  it('binds MEETING_SOURCE_PORT to mock; registers gemini-notes stub class', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MeetingSourceModule],
    }).compile();

    const port = moduleRef.get(MEETING_SOURCE_PORT);
    expect(port).toBeInstanceOf(MockMeetingSourceAdapter);
    expect(port).not.toBeInstanceOf(GeminiNotesMeetingSourceAdapter);

    const gemini = moduleRef.get(GeminiNotesMeetingSourceAdapter);
    expect(gemini).toBeInstanceOf(GeminiNotesMeetingSourceAdapter);
  });
});
```

`apps/worker/src/adapters/meeting-metadata/meeting-metadata.module.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';

import { MEETING_METADATA_PORT } from './meeting-metadata.port.js';
import { MeetingMetadataModule } from './meeting-metadata.module.js';
import { StubCalendarMeetingMetadataAdapter } from './stub-calendar-meeting-metadata.adapter.js';

describe('MeetingMetadataModule (T-11b v0)', () => {
  it('binds MEETING_METADATA_PORT to Calendar stub', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MeetingMetadataModule],
    }).compile();

    const port = moduleRef.get(MEETING_METADATA_PORT);
    expect(port).toBeInstanceOf(StubCalendarMeetingMetadataAdapter);
  });
});
```

**Regresja:** istniejące `mock-meeting-source.adapter.spec.ts` oraz testy orchestratora / integration — bez zmian; muszą nadal przechodzić (happy-path mock).

**DoD kroku:**

- README + komentarze portów opisują etap 0 vs 1+ (zgoda → FF; brak → gemini-notes; UC1 / metadata-only; D-7c przy prod).
- Testy T-11b v0: stub rzuca / token treści = mock / Calendar zarejestrowany — **bez** Google w CI.
- Brak regresji happy-path `meeting.process`.

---

#### Propozycja commit message

```text
feat(worker): stub Calendar metadata and gemini-notes content ports

Expose v0 adapter surfaces for the no-consent branch without wiring them
into meeting.process, keeping the mock happy-path and deferring Google I/O to stage 1+.
```

---

## Weryfikacja wycinka

| Kryterium | Oczekiwanie |
|-----------|-------------|
| P-2b / major 3.7 | Powierzchnie Calendar + `gemini-notes` w `apps/worker/src/adapters/` jako zaślepki |
| Happy-path | `MEETING_SOURCE_PORT` = mock; orchestrator bez Calendar / gemini |
| K-7 | Brak wywołań adapterów z BFF/`api` w tym wycinku |
| Zakazy | Brak OAuth/Google sieci; brak fat-adaptera; brak audio FF z Notes; brak ekspansji grup |
| D-7c | Brak migracji Prisma zgody/`contentSource` |
| T-11b v0 | Lekkie testy stub/DI; CI bez prawdziwego Google |
| Faza 3.6 | Recording w `api` nietknięty |
| Poza zakresem | Brak egzekucji zgody / prawdziwych adapterów prod |

## Ślad do major (tylko informacyjnie — po implementacji)

Po spełnieniu DoD implementacji (poza tą sesją):

- Faza 3.7 → `WYKONANY`
- Kroki 3.7.1, 3.7.2, 3.7.3 → `WYKONANY`
- `MILESTONE - Zaślepka portów gałęzi braku zgody` → `OSIĄGNIĘTY` (gdy prowadzący zaakceptuje przejście do Fazy 4)

Ten feature plan **nie** zmienia pliku major.
)
