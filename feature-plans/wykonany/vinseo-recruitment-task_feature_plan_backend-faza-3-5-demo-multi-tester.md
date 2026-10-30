# Vinseo Recruitment Task - feature plan: backend Faza 3.5 (DEMO multi-tester)

**Kotwica major:** Faza 3.5 - Tożsamość DEMO/Test (multi-tester) · kroki 3.5.1–3.5.3  
**Major:** `vinseo-recruitment-task-backend_major-plan.md`  
**Źródła:** `docs/data_flow.md`, `docs/dokumentacja_komunikacji.md`, `docs/dictionary.md`, `docs/testy.md`; `spec/SPEC-KOMUNIKACJA.md` (K-5), `SPEC-PIPELINE.md` (P-6), `SPEC-TESTY.md` (T-9/T-10), `SPEC-DANE.md` (D-5), `SPEC-AUTH_I_ACL.md`  
**Pass rozwojowy:** brak przesunięć (kolejność 1→2→3 zatwierdzona).

**Statusy kroków feature:** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`

---

## Meta

| Pole | Wartość |
|------|---------|
| Wycinek | Katalog 10 fixture’ów; `POST /demo/run-meeting` → UUID runu + organizer sesji + losowy `fixtureKey`; testy multi-tester / idempotencja po UUID |
| Poza zakresem | UI / BFF (`apps/web`); semantyka DX `POST /dev/meetings/enqueue`; produkcja Fireflies / webhook; Faza 4+ |
| Stack (odwołanie) | NestJS `api`/`worker`, `@vinseo/contracts`, Prisma, Jest/supertest - bez redefinicji SPEC |
| Typy na granicach | `FixtureKey` / `ExternalMeetingId` (branded w contracts); input enqueue rozróżnia materiał vs tożsamość runu |

---

## Założenia

- DX: bez `externalMeetingId` w inputcie → `externalMeetingId = fixtureKey` (bez zmiany zachowania `/dev/meetings/enqueue`).
- DEMO: zawsze nowe `externalMeetingId = randomUUID()`; `fixtureKey` wylosowany z `DEMO_FIXTURE_KEYS` (długość **10**); body klienta z `fixtureKey` **ignorowane**.
- Wspólna lista kluczy w `@vinseo/contracts`, żeby `api` (losowanie) i `worker` (mapa plików) nie rozjechały się.
- Istniejący fixture `demo-client-budget-pl` zostaje **pierwszym** z 10 kluczy (kompatybilność DX / starych testów workera).

---

## FAZA 1 - Tożsamość DEMO/Test (multi-tester)

Mapowanie: major Faza 3.5 (3.5.1–3.5.3).

### KROK 1 - Katalog 10 fixture’ów + wspólna lista kluczy

**Status:** `WYKONANY`

**Cel:** Port źródła ma **10** kluczy materiału; `api` i `worker` dzielą tę samą listę (`SPEC-KOMUNIKACJA` K-5, `SPEC-TESTY` T-9, major 3.5.1).

**Artefakty:**

- Nowy: `packages/contracts/src/demo-fixtures.ts`
- Zmiana: `packages/contracts/src/index.ts`
- Zmiana: `apps/worker/src/adapters/meeting-source/mock-meeting-source.adapter.ts`
- Nowe (9 plików JSON + ewentualna kopia/rename mapowania): `apps/worker/src/adapters/meeting-source/fixtures/demo-*.json`
- Zmiana: `apps/worker/src/adapters/meeting-source/mock-meeting-source.adapter.spec.ts`

#### Nowy plik - kompletny kod

`packages/contracts/src/demo-fixtures.ts`:

```typescript
import { asFixtureKey, type FixtureKey } from './ids.js';

/**
 * Katalog materiału mocka DEMO/Test (K-5).
 * `fixtureKey` ≠ tożsamość wiersza Meeting - tylko treść za portem źródła.
 */
export const DEMO_FIXTURE_KEYS = [
  'demo-client-budget-pl',
  'demo-kickoff-agency-pl',
  'demo-retainer-review-pl',
  'demo-brand-lift-pl',
  'demo-seo-audit-pl',
  'demo-crisis-comms-pl',
  'demo-product-launch-pl',
  'demo-media-plan-pl',
  'demo-qbr-client-pl',
  'demo-influencer-brief-pl',
] as const;

export type DemoFixtureKey = (typeof DEMO_FIXTURE_KEYS)[number];

export const DEMO_FIXTURE_CATALOG_SIZE = DEMO_FIXTURE_KEYS.length;

export function isDemoFixtureKey(value: string): value is DemoFixtureKey {
  return (DEMO_FIXTURE_KEYS as readonly string[]).includes(value);
}

export function asDemoFixtureKey(value: string): FixtureKey {
  if (!isDemoFixtureKey(value)) {
    throw new Error(`Unknown demo fixture key: ${value}`);
  }
  return asFixtureKey(value);
}

/**
 * Losowy klucz z katalogu 10. `random` wstrzykiwalny pod testy (0 ≤ r < 1).
 */
export function pickRandomDemoFixtureKey(
  random: () => number = Math.random,
): FixtureKey {
  const r = random();
  const clamped = Number.isFinite(r) ? Math.min(Math.max(r, 0), 0.999_999) : 0;
  const index = Math.floor(clamped * DEMO_FIXTURE_KEYS.length);
  const key = DEMO_FIXTURE_KEYS[index];
  if (key === undefined) {
    throw new Error('DEMO_FIXTURE_KEYS is empty');
  }
  return asFixtureKey(key);
}
```

#### Refaktor - `teraz` → `zamień na`

Plik: `packages/contracts/src/index.ts`

**Teraz:**

```typescript
export * from './ids.js';
export * from './processing-status.js';
export * from './client-link-status.js';
export * from './meeting-source.js';
export * from './jobs.js';
export * from './auth-api.js';
export * from './meetings-api.js';
export * from './http-error.js';
```

**Zamień na:**

```typescript
export * from './ids.js';
export * from './processing-status.js';
export * from './client-link-status.js';
export * from './meeting-source.js';
export * from './demo-fixtures.js';
export * from './jobs.js';
export * from './auth-api.js';
export * from './meetings-api.js';
export * from './http-error.js';
```

---

Plik: `apps/worker/src/adapters/meeting-source/mock-meeting-source.adapter.ts`

**Teraz:**

```typescript
const FIXTURES: Record<string, string> = {
  'demo-client-budget-pl': 'demo-client-budget-pl.json',
};
```

**Zamień na:**

```typescript
import { DEMO_FIXTURE_KEYS } from '@vinseo/contracts';

const FIXTURES: Record<string, string> = Object.fromEntries(
  DEMO_FIXTURE_KEYS.map((key) => [key, `${key}.json`]),
);
```

*(Import `@vinseo/contracts` dołączyć do istniejących importów wartości; zachować resztę adaptera - `fetch` nadal: `key = input.fixtureKey ?? input.externalMeetingId`.)*

---

#### Nowe pliki fixture (katalog 10)

Zachowaj istniejący `demo-client-budget-pl.json` bez zmian treści.

Dla każdego z pozostałych 9 kluczy utwórz plik  
`apps/worker/src/adapters/meeting-source/fixtures/<key>.json`  
o kształcie `MeetingSourcePayload` (+ opcjonalne vendor `summary` do odrzucenia w adapterze).  
`externalId` w JSON = ten sam string co klucz pliku (materiał; **nie** UUID runu joba).

Wzorzec (podstaw pod każdy klucz - zmień `externalId`, `title`, treść segmentów):

`apps/worker/src/adapters/meeting-source/fixtures/demo-kickoff-agency-pl.json`:

```json
{
  "externalId": "demo-kickoff-agency-pl",
  "title": "Kickoff agencji - Client Y",
  "startedAt": "2026-10-16T10:00:00.000Z",
  "participants": [
    {
      "email": "ola.nowak@vinseo.example",
      "displayName": "Ola Nowak",
      "internal": true
    },
    {
      "email": "pm@client-y.example",
      "displayName": "Piotr Manager",
      "internal": false
    }
  ],
  "segments": [
    {
      "speaker": "Ola Nowak",
      "text": "Cel kickoffu: scope Q4 i SLA raportowania. Kontakt awaryjny +48 501 200 300.",
      "startMs": 0
    },
    {
      "speaker": "Piotr Manager",
      "text": "Decision: start 1 listopada. Action: Ola wysyła brief do środy.",
      "startMs": 15000
    }
  ],
  "summary": {
    "overview": "VENDOR SUMMARY - MUST BE IGNORED",
    "action_items": ["ignore-me"]
  }
}
```

`apps/worker/src/adapters/meeting-source/fixtures/demo-retainer-review-pl.json`:

```json
{
  "externalId": "demo-retainer-review-pl",
  "title": "Retainer review - Client Z",
  "startedAt": "2026-10-17T11:00:00.000Z",
  "participants": [
    { "email": "marek.lis@vinseo.example", "displayName": "Marek Lis", "internal": true },
    { "email": "cfo@client-z.example", "displayName": "Ewa CFO", "internal": false }
  ],
  "segments": [
    { "speaker": "Marek Lis", "text": "Retainer 40k PLN miesięcznie - karta testowa 5500000000000004 tylko do dema.", "startMs": 0 },
    { "speaker": "Ewa CFO", "text": "Decision: przedłużamy na Q1. Action: Marek wysyła aneks.", "startMs": 12000 }
  ],
  "summary": { "overview": "VENDOR SUMMARY - MUST BE IGNORED", "action_items": ["ignore-me"] }
}
```

`apps/worker/src/adapters/meeting-source/fixtures/demo-brand-lift-pl.json`:

```json
{
  "externalId": "demo-brand-lift-pl",
  "title": "Brand Lift sync",
  "startedAt": "2026-10-18T08:30:00.000Z",
  "participants": [
    { "email": "kasia.brand@vinseo.example", "displayName": "Kasia Brand", "internal": true },
    { "email": "insights@client-x.example", "displayName": "Insights Lead", "internal": false }
  ],
  "segments": [
    { "speaker": "Kasia Brand", "text": "Próbka Brand Lift: uplift +4.2 pp. Mail roboczy kasia.lift@vinseo.example.", "startMs": 0 },
    { "speaker": "Insights Lead", "text": "Decision: skalujemy TV+OLV. Action: Kasia dostarcza deck do czwartku.", "startMs": 18000 }
  ],
  "summary": { "overview": "VENDOR SUMMARY - MUST BE IGNORED", "action_items": ["ignore-me"] }
}
```

`apps/worker/src/adapters/meeting-source/fixtures/demo-seo-audit-pl.json`:

```json
{
  "externalId": "demo-seo-audit-pl",
  "title": "SEO audit wrap-up",
  "startedAt": "2026-10-19T13:00:00.000Z",
  "participants": [
    { "email": "tomek.seo@vinseo.example", "displayName": "Tomek SEO", "internal": true },
    { "email": "web@client-y.example", "displayName": "Web Owner", "internal": false }
  ],
  "segments": [
    { "speaker": "Tomek SEO", "text": "Core Web Vitals: LCP 3.1s. Telefon techniczny +48 602 111 222.", "startMs": 0 },
    { "speaker": "Web Owner", "text": "Decision: sprint techniczny w listopadzie. Action: Tomek priorytetyzuje crawl budget.", "startMs": 14000 }
  ],
  "summary": { "overview": "VENDOR SUMMARY - MUST BE IGNORED", "action_items": ["ignore-me"] }
}
```

`apps/worker/src/adapters/meeting-source/fixtures/demo-crisis-comms-pl.json`:

```json
{
  "externalId": "demo-crisis-comms-pl",
  "title": "Crisis comms desk",
  "startedAt": "2026-10-20T07:15:00.000Z",
  "participants": [
    { "email": "ania.pr@vinseo.example", "displayName": "Ania PR", "internal": true },
    { "email": "comms@client-z.example", "displayName": "Comms Director", "internal": false }
  ],
  "segments": [
    { "speaker": "Ania PR", "text": "Szkic oświadczenia gotowy. PESEL demo do formalności: 90010112345.", "startMs": 0 },
    { "speaker": "Comms Director", "text": "Decision: publikacja o 16:00. Action: Ania koordynuje media list.", "startMs": 9000 }
  ],
  "summary": { "overview": "VENDOR SUMMARY - MUST BE IGNORED", "action_items": ["ignore-me"] }
}
```

`apps/worker/src/adapters/meeting-source/fixtures/demo-product-launch-pl.json`:

```json
{
  "externalId": "demo-product-launch-pl",
  "title": "Product launch war room",
  "startedAt": "2026-10-21T09:45:00.000Z",
  "participants": [
    { "email": "bartek.pm@vinseo.example", "displayName": "Bartek PM", "internal": true },
    { "email": "product@client-x.example", "displayName": "Product Owner", "internal": false }
  ],
  "segments": [
    { "speaker": "Bartek PM", "text": "Go-live 28 października. Hotline +48 503 444 555.", "startMs": 0 },
    { "speaker": "Product Owner", "text": "Decision: soft launch PL-only. Action: Bartek zamyka checklistę QA.", "startMs": 11000 }
  ],
  "summary": { "overview": "VENDOR SUMMARY - MUST BE IGNORED", "action_items": ["ignore-me"] }
}
```

`apps/worker/src/adapters/meeting-source/fixtures/demo-media-plan-pl.json`:

```json
{
  "externalId": "demo-media-plan-pl",
  "title": "Media plan Q1",
  "startedAt": "2026-10-22T14:00:00.000Z",
  "participants": [
    { "email": "zuza.media@vinseo.example", "displayName": "Zuza Media", "internal": true },
    { "email": "marketing@client-y.example", "displayName": "Marketing Lead", "internal": false }
  ],
  "segments": [
    { "speaker": "Zuza Media", "text": "Mix: 60% video, 40% display. Budget draft 120k PLN.", "startMs": 0 },
    { "speaker": "Marketing Lead", "text": "Decision: akceptujemy mix. Action: Zuza wysyła IO do domu mediowego.", "startMs": 16000 }
  ],
  "summary": { "overview": "VENDOR SUMMARY - MUST BE IGNORED", "action_items": ["ignore-me"] }
}
```

`apps/worker/src/adapters/meeting-source/fixtures/demo-qbr-client-pl.json`:

```json
{
  "externalId": "demo-qbr-client-pl",
  "title": "QBR Client Alpha",
  "startedAt": "2026-10-23T12:00:00.000Z",
  "participants": [
    { "email": "igor.am@vinseo.example", "displayName": "Igor AM", "internal": true },
    { "email": "ceo@client-alpha.example", "displayName": "CEO Alpha", "internal": false }
  ],
  "segments": [
    { "speaker": "Igor AM", "text": "Q3 ROI +18%. Slajdy na igor.qbr@vinseo.example.", "startMs": 0 },
    { "speaker": "CEO Alpha", "text": "Decision: zwiększamy retainer o 10%. Action: Igor przygotuje propozycję.", "startMs": 20000 }
  ],
  "summary": { "overview": "VENDOR SUMMARY - MUST BE IGNORED", "action_items": ["ignore-me"] }
}
```

`apps/worker/src/adapters/meeting-source/fixtures/demo-influencer-brief-pl.json`:

```json
{
  "externalId": "demo-influencer-brief-pl",
  "title": "Influencer brief",
  "startedAt": "2026-10-24T16:30:00.000Z",
  "participants": [
    { "email": "nina.social@vinseo.example", "displayName": "Nina Social", "internal": true },
    { "email": "creator@client-z.example", "displayName": "Creator Manager", "internal": false }
  ],
  "segments": [
    { "speaker": "Nina Social", "text": "Brief: 3 role TikTok + 1 YT. Fee cap 25k PLN. Karta testowa 4111111111111111.", "startMs": 0 },
    { "speaker": "Creator Manager", "text": "Decision: idziemy w short-form. Action: Nina finalizuje shortlistę.", "startMs": 13000 }
  ],
  "summary": { "overview": "VENDOR SUMMARY - MUST BE IGNORED", "action_items": ["ignore-me"] }
}
```

#### Testy (krok)

Rozszerz `mock-meeting-source.adapter.spec.ts`:

```typescript
import { DEMO_FIXTURE_CATALOG_SIZE, DEMO_FIXTURE_KEYS } from '@vinseo/contracts';

import { MockMeetingSourceAdapter } from './mock-meeting-source.adapter.js';

describe('MockMeetingSourceAdapter', () => {
  const adapter = new MockMeetingSourceAdapter();

  it('exposes catalog of 10 fixture keys', () => {
    expect(DEMO_FIXTURE_CATALOG_SIZE).toBe(10);
    expect(DEMO_FIXTURE_KEYS).toHaveLength(10);
  });

  it('loads every catalog key via fixtureKey', async () => {
    for (const key of DEMO_FIXTURE_KEYS) {
      const payload = await adapter.fetch({
        externalMeetingId: `run-uuid-unrelated-${key}`,
        fixtureKey: key,
      });
      expect(payload.externalId).toBe(key);
      expect(payload).not.toHaveProperty('summary');
    }
  });

  it('returns fixture payload without vendor summary', async () => {
    const payload = await adapter.fetch({
      externalMeetingId: 'demo-client-budget-pl',
    });
    expect(payload.externalId).toBe('demo-client-budget-pl');
    expect(payload.title).toContain('Budżet');
    expect(payload.segments.length).toBeGreaterThan(0);
    expect(payload).not.toHaveProperty('summary');
  });

  it('throws for unknown fixture key', async () => {
    await expect(
      adapter.fetch({ externalMeetingId: 'missing-fixture' }),
    ).rejects.toThrow(/Unknown meeting fixture/);
  });
});
```

Dodaj lekki test jednostkowy w contracts (opcjonalnie plik `packages/contracts/src/demo-fixtures.spec.ts` **tylko jeśli** w monorepo jest runner dla contracts; w przeciwnym razie pokryj `pickRandomDemoFixtureKey` testem w `apps/api` w KROK 2):

```typescript
import {
  DEMO_FIXTURE_KEYS,
  pickRandomDemoFixtureKey,
} from './demo-fixtures.js';

describe('pickRandomDemoFixtureKey', () => {
  it('maps 0 → first key and ~1 → last key', () => {
    expect(pickRandomDemoFixtureKey(() => 0)).toBe(DEMO_FIXTURE_KEYS[0]);
    expect(pickRandomDemoFixtureKey(() => 0.999)).toBe(
      DEMO_FIXTURE_KEYS[DEMO_FIXTURE_KEYS.length - 1],
    );
  });
});
```

#### Biblioteki / API

Brak nowego API zewnętrznego. `DEMO_FIXTURE_KEYS` / `pickRandomDemoFixtureKey` - czysty TS w contracts (wersja workspace). Po zmianie: `pnpm --filter @vinseo/contracts build` (jak w dotychczasowym flow monorepo).

#### DoD (krok)

- `DEMO_FIXTURE_KEYS.length === 10` eksportowane z `@vinseo/contracts`.
- Worker ładuje payload dla każdego klucza po `fixtureKey` (także gdy `externalMeetingId` ≠ klucz).
- Nieznany klucz → błąd jak dotychczas.
- Istniejący DX fixture `demo-client-budget-pl` nadal działa.

---

### KROK 2 - Demo enqueue: UUID runu, organizer sesji, losowy fixture

**Status:** `WYKONANY`

**Cel:** `POST /demo/run-meeting` zgodny z K-5 / major 3.5.2: nowe UUID, `organizerId` sesji, losowy `fixtureKey`; DX bez zmiany semantyki (`SPEC-DANE` D-5, `SPEC-PIPELINE` P-6).

**Artefakty:**

- Zmiana: `apps/api/src/meetings/enqueue-meeting-process.use-case.ts`
- Zmiana: `apps/api/src/meetings/enqueue-meeting-process.use-case.spec.ts`
- Zmiana: `apps/api/src/demo/demo.controller.ts`
- Zmiana: `apps/api/src/demo/dto/run-meeting.dto.ts`
- Bez zmian zachowania: `apps/api/src/meetings/dev-enqueue.controller.ts` (nadal tylko `fixtureKey`)

#### Refaktor - `teraz` → `zamień na`

Plik: `apps/api/src/meetings/enqueue-meeting-process.use-case.ts`

**Teraz:**

```typescript
export interface EnqueueMeetingProcessInput {
  readonly fixtureKey: string;
  readonly requestId?: string;
  /** Wymagane przy demo z sesją; DX może pominąć */
  readonly organizerId?: string;
}

// ...

async execute(
  input: EnqueueMeetingProcessInput,
): Promise<EnqueueMeetingProcessResult> {
  const externalMeetingId = input.fixtureKey;
  const requestId = input.requestId ?? randomUUID();
  // ... upsert where: { externalMeetingId }, payload.fixtureKey: input.fixtureKey
}
```

**Zamień na (pełny plik po refaktorze):**

```typescript
import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  MEETING_PROCESS_JOB_NAME,
  type MeetingProcessJobPayload,
} from '@vinseo/contracts';

import { PgBossService } from '../jobs/pg-boss.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface EnqueueMeetingProcessInput {
  readonly fixtureKey: string;
  /**
   * Tożsamość runu / spotkania.
   * DEMO: UUID nadane przez API.
   * DX (pominięte): externalMeetingId = fixtureKey.
   */
  readonly externalMeetingId?: string;
  readonly requestId?: string;
  /** Wymagane przy demo z sesją; DX może pominąć */
  readonly organizerId?: string;
}

export interface EnqueueMeetingProcessResult {
  readonly meetingId: string;
  readonly jobId: string;
  readonly processingStatus: 'pending';
  readonly externalMeetingId: string;
}

@Injectable()
export class EnqueueMeetingProcessUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boss: PgBossService,
  ) {}

  async execute(
    input: EnqueueMeetingProcessInput,
  ): Promise<EnqueueMeetingProcessResult> {
    const externalMeetingId = input.externalMeetingId ?? input.fixtureKey;
    const requestId = input.requestId ?? randomUUID();

    const meeting = await this.prisma.meeting.upsert({
      where: { externalMeetingId },
      create: {
        externalMeetingId,
        processingStatus: 'pending',
        ...(input.organizerId ? { organizerId: input.organizerId } : {}),
      },
      update: {
        processingStatus: 'pending',
        failureReason: null,
      },
      select: { id: true, externalMeetingId: true, processingStatus: true },
    });

    const payload: MeetingProcessJobPayload = {
      externalMeetingId,
      source: 'mock',
      fixtureKey: input.fixtureKey,
      requestId,
    };

    const jobId = await this.boss.client.send(
      MEETING_PROCESS_JOB_NAME,
      payload,
    );

    if (!jobId) {
      throw new Error('Failed to enqueue meeting.process');
    }

    return {
      meetingId: meeting.id,
      jobId,
      processingStatus: 'pending',
      externalMeetingId: meeting.externalMeetingId,
    };
  }
}
```

---

Plik: `apps/api/src/demo/dto/run-meeting.dto.ts`

**Teraz:**

```typescript
import { IsString, MinLength } from 'class-validator';

export class RunMeetingDto {
  @IsString()
  @MinLength(1)
  fixtureKey!: string;
}
```

**Zamień na:**

```typescript
import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Body DEMO jest opcjonalne. Nawet jeśli klient poda `fixtureKey`,
 * API demo **ignoruje** je i losuje z katalogu 10 (K-5).
 */
export class RunMeetingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  fixtureKey?: string;
}
```

---

Plik: `apps/api/src/demo/demo.controller.ts`

**Teraz:**

```typescript
  @Post('run-meeting')
  async runMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RunMeetingDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<DemoRunMeetingResponseDto> {
    // bez DEMO_ENABLED (K-5)
    const result = await this.enqueue.execute({
      fixtureKey: body.fixtureKey,
      requestId,
      organizerId: user.id,
    });
    return {
      meetingId: result.meetingId,
      jobId: result.jobId,
      status: 'pending',
    };
  }
```

**Zamień na:**

```typescript
import { randomUUID } from 'node:crypto';

import {
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  pickRandomDemoFixtureKey,
  type DemoRunMeetingResponseDto,
} from '@vinseo/contracts';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { EnqueueMeetingProcessUseCase } from '../meetings/enqueue-meeting-process.use-case.js';
import { RunMeetingDto } from './dto/run-meeting.dto.js';

@Controller('demo')
@UseGuards(JwtAuthGuard)
export class DemoController {
  constructor(private readonly enqueue: EnqueueMeetingProcessUseCase) {}

  @Post('run-meeting')
  async runMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @Body() _body: RunMeetingDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<DemoRunMeetingResponseDto> {
    // bez DEMO_ENABLED (K-5); body.fixtureKey ignorowane
    const fixtureKey = pickRandomDemoFixtureKey();
    const externalMeetingId = randomUUID();

    const result = await this.enqueue.execute({
      fixtureKey,
      externalMeetingId,
      requestId,
      organizerId: user.id,
    });

    return {
      meetingId: result.meetingId,
      jobId: result.jobId,
      status: 'pending',
    };
  }
}
```

`dev-enqueue.controller.ts` - **bez zmian** (nadal `execute({ fixtureKey, requestId })` → tożsamość = fixture).

#### Testy jednostkowe use case (aktualizacja)

`apps/api/src/meetings/enqueue-meeting-process.use-case.spec.ts` - dopisz / dostosuj:

```typescript
it('DX default: externalMeetingId equals fixtureKey when omitted', async () => {
  // jak dotychczasowy happy path - where.externalMeetingId === fixtureKey
});

it('DEMO path: distinct externalMeetingId and fixtureKey', async () => {
  const prisma = {
    meeting: {
      upsert: jest.fn().mockResolvedValue({
        id: 'm-2',
        externalMeetingId: '550e8400-e29b-41d4-a716-446655440000',
        processingStatus: 'pending',
      }),
    },
  };
  const boss = { client: { send: jest.fn().mockResolvedValue('job-9') } };
  const useCase = new EnqueueMeetingProcessUseCase(
    prisma as never,
    boss as never,
  );

  await useCase.execute({
    fixtureKey: 'demo-client-budget-pl',
    externalMeetingId: '550e8400-e29b-41d4-a716-446655440000',
    organizerId: 'user-1',
  });

  expect(prisma.meeting.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        externalMeetingId: '550e8400-e29b-41d4-a716-446655440000',
      },
      create: expect.objectContaining({
        organizerId: 'user-1',
      }),
    }),
  );
  expect(boss.client.send).toHaveBeenCalledWith(
    'meeting.process',
    expect.objectContaining({
      externalMeetingId: '550e8400-e29b-41d4-a716-446655440000',
      fixtureKey: 'demo-client-budget-pl',
    }),
  );
});

it('idempotent upsert: same externalMeetingId updates in place', async () => {
  // dwa execute z tym samym externalMeetingId + (ew. różnym) fixtureKey
  // → upsert.where.externalMeetingId identyczne obu wywołań
});
```

#### Biblioteki / API

- `node:crypto.randomUUID` - Node built-in (runtime procesu `api`).
- `pickRandomDemoFixtureKey` z `@vinseo/contracts` (KROK 1).
- class-validator `@IsOptional` - już w projekcie (`dev-enqueue.dto.ts`).

#### DoD (krok)

- Dwa wywołania DEMO (nawet z tym samym wylosowanym fixture w teście z stubem random) z **różnymi** UUID → dwa wiersze `Meeting`.
- `organizerId` = user sesji przy create.
- Payload joba: `externalMeetingId` (UUID) + `fixtureKey` (katalog).
- `POST /dev/meetings/enqueue` nadal: jeden wiersz na ten sam `fixtureKey` (brak `externalMeetingId` w inputcie).
- Puste body `{}` na `/demo/run-meeting` przechodzi walidację.

---

### KROK 3 - Testy multi-user DEMO i idempotencja po UUID

**Status:** `WYKONANY`

**Cel:** Pokrycie T-9/T-10 / major 3.5.3: multi-tester, katalog 10, idempotencja po `externalMeetingId` runu - bez reguły „jeden fixture = jeden wiersz globalnie” dla UI Test.

**Artefakty:**

- Zmiana: `apps/api/test/auth-acl.e2e-spec.ts` (demo + nowe case’y multi-user)
- Opcjonalnie nowy: `apps/api/test/demo-multi-tester.e2e-spec.ts` (jeśli plik e2e auth robi się zbyt gęsty - preferuj **dopisanie** do istniejącego describe, chyba że czytelność każe wydzielić)

#### Refaktor / uzupełnienie e2e

Plik: `apps/api/test/auth-acl.e2e-spec.ts`

**Teraz (fragment demo):**

```typescript
  it('POST /demo/run-meeting enqueues with session', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'demo@example.com', password: 'Password1!abcd' });

    const res = await agent
      .post('/demo/run-meeting')
      .send({ fixtureKey: 'demo-client-budget-pl' })
      .expect(201);

    expect(res.body.meetingId).toBeTruthy();
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.status).toBe('pending');

    const m = await prisma.meeting.findUniqueOrThrow({
      where: { id: res.body.meetingId },
    });
    expect(m.organizerId).toBeTruthy();
  });
```

**Zamień na:**

```typescript
  it('POST /demo/run-meeting enqueues with session (UUID run ≠ fixture)', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'demo@example.com', password: 'Password1!abcd' });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'demo@example.com' },
    });

    const res = await agent.post('/demo/run-meeting').send({}).expect(201);

    expect(res.body.meetingId).toBeTruthy();
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.status).toBe('pending');

    const m = await prisma.meeting.findUniqueOrThrow({
      where: { id: res.body.meetingId },
    });
    expect(m.organizerId).toBe(user.id);
    // UUID runu - nie stały fixture key
    expect(m.externalMeetingId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(m.externalMeetingId).not.toBe('demo-client-budget-pl');
  });

  it('multi-tester DEMO: two users × Test → two meetings; ACL isolation', async () => {
    const agentA = request.agent(app.getHttpServer());
    await agentA
      .post('/auth/register')
      .send({ email: 'tester-a@example.com', password: 'Password1!abcd' });
    const userA = await prisma.user.findUniqueOrThrow({
      where: { email: 'tester-a@example.com' },
    });

    const agentB = request.agent(app.getHttpServer());
    await agentB
      .post('/auth/register')
      .send({ email: 'tester-b@example.com', password: 'Password1!abcd' });
    const userB = await prisma.user.findUniqueOrThrow({
      where: { email: 'tester-b@example.com' },
    });

    const resA = await agentA.post('/demo/run-meeting').send({}).expect(201);
    const resB = await agentB.post('/demo/run-meeting').send({}).expect(201);

    expect(resA.body.meetingId).not.toBe(resB.body.meetingId);

    const meetingA = await prisma.meeting.findUniqueOrThrow({
      where: { id: resA.body.meetingId },
    });
    const meetingB = await prisma.meeting.findUniqueOrThrow({
      where: { id: resB.body.meetingId },
    });

    expect(meetingA.organizerId).toBe(userA.id);
    expect(meetingB.organizerId).toBe(userB.id);
    expect(meetingA.externalMeetingId).not.toBe(meetingB.externalMeetingId);

    await agentA.get(`/meetings/${meetingA.id}`).expect(200);
    await agentA.get(`/meetings/${meetingB.id}`).expect(404);
    await agentB.get(`/meetings/${meetingB.id}`).expect(200);
    await agentB.get(`/meetings/${meetingA.id}`).expect(404);
  });

  it('same user two Tests → two Meeting rows', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'repeat@example.com', password: 'Password1!abcd' });

    const first = await agent.post('/demo/run-meeting').send({}).expect(201);
    const second = await agent.post('/demo/run-meeting').send({}).expect(201);

    expect(first.body.meetingId).not.toBe(second.body.meetingId);

    const rows = await prisma.meeting.findMany({
      where: {
        id: { in: [first.body.meetingId, second.body.meetingId] },
      },
    });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.externalMeetingId)).size).toBe(2);
  });
```

Idempotencja po UUID (T-9) - w unit use case (KROK 2) wystarczy; opcjonalnie e2e przez dwukrotne `enqueue.execute` z tym samym UUID w teście integracyjnym workera **nie** jest wymagane w tym kroku, jeśli unit pokrywa upsert. Jeśli w repo jest już orchestrator integration ze stałym `fixtureKey` jako id - **nie** zmieniaj semantyki DX w tym teście; dodaj osobny case z `externalMeetingId: uuid` + `fixtureKey` z katalogu tylko gdy test woła ścieżkę DEMO.

#### DoD (krok)

- E2E: multi-user → dwa spotkania + deny→404 wzajemnie.
- E2E: ten sam user, dwa Test → dwa wiersze.
- E2E/unit: `externalMeetingId` dema to UUID; nie wymusza równości z `fixtureKey`.
- Unit: ponowne enqueue tego samego UUID → update in place (P-6).
- Katalog 10 zweryfikowany w KROK 1; brak regresji DX w unit use case.

---

#### Propozycja commit message

```text
feat(demo): give each Test run its own meeting UUID

Separate DEMO identity from fixture material so multi-tester ACL
no longer shares one global demo row; keep DX fixtureKey upsert.
```

---

## Weryfikacja wycinka

| Kryterium | Źródło |
|-----------|--------|
| 10 kluczy za portem źródła | major 3.5.1, T-9, K-5 |
| UUID + organizer + random fixture na `/demo/run-meeting` | major 3.5.2, K-5, D-5 |
| Multi-user / rosnąca lista / idempotencja po UUID | major 3.5.3, T-10, P-6 |
| DX i produkcja nietknięte semantycznie | K-5 „poza tą zmianą”, major DoD fazy |
| UI/BFF poza wycinkiem | major backend; front może nadal wysyłać `fixtureKey` - API ignoruje |
| Nagłówki wyłącznie `FAZA` / `KROK` | ten plik |
| Statusy startowe `NIE_ROZPOCZĘTY` | ten plik |

---

## Ślad do major (informacyjnie - po implementacji, poza tą sesją)

Po spełnieniu DoD implementacji użytkownik / `/feature-implementation` **może** oznaczyć w `vinseo-recruitment-task-backend_major-plan.md`:

- Faza 3.5 → `WYKONANY`
- Krok 3.5.1, 3.5.2, 3.5.3 → `WYKONANY`
- `MILESTONE - DEMO/Test multi-tester bez kolizji ACL` → `OSIĄGNIĘTY`

Ten feature plan **nie** edytuje major.
)
