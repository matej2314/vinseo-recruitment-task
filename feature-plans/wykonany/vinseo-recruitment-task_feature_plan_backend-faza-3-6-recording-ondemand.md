# Vinseo Recruitment Task - feature plan: backend Faza 3.6 (on-demand recording mock)

**Kotwica major:** Faza 3.6 - Szkielet on-demand linku nagrania (mock) · kroki 3.6.1–3.6.3  
**Major:** `vinseo-recruitment-task-backend_major-plan.md`  
**Źródła:** `docs/dokumentacja_komunikacji.md` (1.2a), `docs/data_flow.md` (3a), `docs/dictionary.md`, `docs/anty_patterny.md`; `spec/SPEC-KOMUNIKACJA.md` (K-5b), `SPEC-DANE.md` (D-7b), `SPEC-AUTH_I_ACL.md` (AC-2/AC-3 recording), `SPEC-TESTY.md` (T-11a), `SPEC-ARCHITEKTURA.md` (porty/adaptery)  
**Pass rozwojowy:** brak przesunięć (kolejność 1→2→3 zatwierdzona; DTO w contracts w KROK 1 przed HTTP).

**Statusy kroków feature:** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`

**Biblioteki (Context7):** NestJS `@nestjs/common` ^12 — DI: `Symbol` + `@Inject()` dla portu-interfejsu; rejestracja `{ provide, useExisting }`; trasy parametryczne w kolejności deklaracji (wzór jak istniejące `@Sse(':id/events')` przed `@Get(':id')`). Źródło: Context7 `/nestjs/docs.nestjs.com` (dependency injection, controllers / route order).

---

## Meta

| Pole | Wartość |
|------|---------|
| Wycinek | Port resolve URL nagrania (mock) w `api`; `GET /meetings/:id/recording` → JSON `{ url }`; ACL jak detail; zakaz persist ephemeral URL; testy T-11a |
| Poza zakresem | BFF / button UI (`apps/web`, major frontu 3.6); prawdziwy klient Fireflies GraphQL; migracje Prisma pod media URL; Faza 4+ |
| Stack (odwołanie) | NestJS `api`, `@vinseo/contracts`, Prisma (bez nowych kolumn), Jest/supertest — bez redefinicji SPEC |
| Typy na granicach | `MeetingRecordingDto` (`{ url: string }`); port `resolve({ externalMeetingId })` → `MeetingRecordingDto`; branded `ExternalMeetingId` przy wejściu do portu |

---

## Założenia

- Port on-demand żyje w **`apps/api`** (nie w workerze) — osobno od `MeetingSourcePort` / pipeline transcript (`SPEC-KOMUNIKACJA` tabela portów).
- Atrapa URL v0: stała `https://example.com/demo-recording` (jak przykład w `docs/dokumentacja_komunikacji.md` 1.2a); mock **nie** woła sieci.
- ACL + deny → **404** + zapis `audit_log` `meeting.access.denied` — lustrzane wobec `GetMeetingUseCase` (`SPEC-AUTH_I_ACL` AC-3).
- Odpowiedź HTTP to **JSON 200 `{ url }`**, nigdy 302.
- Brak zmian w `prisma/schema.prisma` (D-7b: zero kolumn `audio_url` / `video_url`).
- Komentarz w porcie/adapterze: przyszły adapter FF pod tym samym portem **bez** zmiany kształtu HTTP.

---

## FAZA 1 - Szkielet on-demand linku nagrania (mock)

Mapowanie: major Faza 3.6 (3.6.1–3.6.3).

### KROK 1 - Port resolve URL + mock adapter + typ w contracts

**Status:** `WYKONANY`

**Cel:** Kontrakt DTO `{ url }` + port on-demand + mock bez sieci; gotowość pod podmianę FF (`SPEC-KOMUNIKACJA` K-5b, major 3.6.1).

**Artefakty:**

- Zmiana: `packages/contracts/src/meetings-api.ts` (dopisek DTO)
- Nowy: `apps/api/src/adapters/meeting-recording/meeting-recording.port.ts`
- Nowy: `apps/api/src/adapters/meeting-recording/mock-meeting-recording.adapter.ts`
- Nowy: `apps/api/src/adapters/meeting-recording/meeting-recording.module.ts`
- Nowy: `apps/api/src/adapters/meeting-recording/mock-meeting-recording.adapter.spec.ts`

#### Implementacja — dopisek contracts

`packages/contracts/src/meetings-api.ts` — **dopisać na końcu pliku** (po istniejących DTO / typach demo):

```typescript
/**
 * Odpowiedź `GET /meetings/:id/recording` (K-5b).
 * Ephemeral media URL — wyłącznie w odpowiedzi HTTP; nie w modelu Meeting.
 */
export interface MeetingRecordingDto {
  readonly url: string;
}
```

(`packages/contracts/src/index.ts` już re-eksportuje `./meetings-api.js` — bez zmiany, o ile DTO jest w tym pliku.)

#### Nowy plik — kompletny kod

`apps/api/src/adapters/meeting-recording/meeting-recording.port.ts`:

```typescript
import type { ExternalMeetingId, MeetingRecordingDto } from '@vinseo/contracts';

export const MEETING_RECORDING_PORT = Symbol('MEETING_RECORDING_PORT');

export interface ResolveMeetingRecordingInput {
  readonly externalMeetingId: ExternalMeetingId;
}

/**
 * Port on-demand URL nagrania (poza pipeline transcript / MeetingSourcePort).
 * v0: mock; później: adapter Fireflies — ten sam kontrakt wyjścia { url }.
 */
export interface MeetingRecordingPort {
  resolve(
    input: ResolveMeetingRecordingInput,
  ): Promise<MeetingRecordingDto>;
}
```

`apps/api/src/adapters/meeting-recording/mock-meeting-recording.adapter.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import type { MeetingRecordingDto } from '@vinseo/contracts';

import type {
  MeetingRecordingPort,
  ResolveMeetingRecordingInput,
} from './meeting-recording.port.js';

/** Atrapa v0 — zgodna z docs 1.2a / K-5b; bez HTTP do vendora. */
export const MOCK_RECORDING_URL = 'https://example.com/demo-recording';

/**
 * Mock resolve on-demand. `externalMeetingId` jest częścią kontraktu portu
 * (tożsamość źródła); w v0 atrapa jest stała niezależnie od id.
 * Podmiana: FirefliesMeetingRecordingAdapter za MEETING_RECORDING_PORT —
 * bez zmiany kształtu MeetingRecordingDto / HTTP.
 */
@Injectable()
export class MockMeetingRecordingAdapter implements MeetingRecordingPort {
  async resolve(
    _input: ResolveMeetingRecordingInput,
  ): Promise<MeetingRecordingDto> {
    return { url: MOCK_RECORDING_URL };
  }
}
```

`apps/api/src/adapters/meeting-recording/meeting-recording.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { MEETING_RECORDING_PORT } from './meeting-recording.port.js';
import { MockMeetingRecordingAdapter } from './mock-meeting-recording.adapter.js';

@Module({
  providers: [
    MockMeetingRecordingAdapter,
    {
      provide: MEETING_RECORDING_PORT,
      useExisting: MockMeetingRecordingAdapter,
    },
  ],
  exports: [MEETING_RECORDING_PORT],
})
export class MeetingRecordingModule {}
```

`apps/api/src/adapters/meeting-recording/mock-meeting-recording.adapter.spec.ts`:

```typescript
import { asExternalMeetingId } from '@vinseo/contracts';

import {
  MOCK_RECORDING_URL,
  MockMeetingRecordingAdapter,
} from './mock-meeting-recording.adapter.js';

describe('MockMeetingRecordingAdapter', () => {
  it('returns example.com atrapa without depending on externalMeetingId', async () => {
    const adapter = new MockMeetingRecordingAdapter();
    const result = await adapter.resolve({
      externalMeetingId: asExternalMeetingId('any-source-id'),
    });
    expect(result).toEqual({ url: MOCK_RECORDING_URL });
    expect(result.url.startsWith('https://example.com/')).toBe(true);
  });
});
```

**Testy (krok):** unit mocka jak wyżej — zero sieci.

**DoD kroku:**

- Port + Symbol DI + mock zwraca atrapę `https://example.com/...`.
- `MeetingRecordingDto` w contracts.
- Adnotacja pod przyszły adapter FF obecna w kodzie portu/adaptera.
- Unit spec mocka przechodzi.

---

### KROK 2 - Use case + GET /meetings/:id/recording (ACL, bez persist)

**Status:** `WYKONANY`

**Cel:** Endpoint sesyjny z ACL jak detail; JSON `{ url }`; zero zapisu URL do Postgres (`SPEC-KOMUNIKACJA` K-5b, `SPEC-DANE` D-7b, `SPEC-AUTH_I_ACL` AC-2/AC-3, major 3.6.2).

**Artefakty:**

- Nowy: `apps/api/src/meetings/get-meeting-recording.use-case.ts`
- Zmiana: `apps/api/src/meetings/meetings.controller.ts`
- Zmiana: `apps/api/src/meetings/meetings.module.ts`

#### Nowy plik — kompletny kod

`apps/api/src/meetings/get-meeting-recording.use-case.ts`:

```typescript
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  asExternalMeetingId,
  type MeetingRecordingDto,
} from '@vinseo/contracts';

import { MeetingAccessService } from '../access/meeting-access.service.js';
import {
  MEETING_RECORDING_PORT,
  type MeetingRecordingPort,
} from '../adapters/meeting-recording/meeting-recording.port.js';
import { AuditWriterService } from '../audit/audit-writer.service.js';
import type { AuthenticatedUser } from '../auth/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class GetMeetingRecordingUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MeetingAccessService,
    private readonly audit: AuditWriterService,
    @Inject(MEETING_RECORDING_PORT)
    private readonly recording: MeetingRecordingPort,
  ) {}

  async execute(
    user: AuthenticatedUser,
    meetingId: string,
  ): Promise<MeetingRecordingDto> {
    const decision = await this.access.canReadMeeting(user, meetingId);
    if (decision === 'deny') {
      await this.audit.write({
        eventType: 'meeting.access.denied',
        userId: user.id,
        resourceId: meetingId,
        resultCode: 'DENY',
      });
      throw new NotFoundException({
        statusCode: 404,
        message: 'Meeting not found',
        code: 'MEETING_NOT_FOUND',
      });
    }

    const m = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, externalMeetingId: true },
    });
    if (!m) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Meeting not found',
        code: 'MEETING_NOT_FOUND',
      });
    }

    // Świadomie: brak prisma.*.update / create z polem URL — D-7b.
    return this.recording.resolve({
      externalMeetingId: asExternalMeetingId(m.externalMeetingId),
    });
  }
}
```

#### Refaktor — controller

`apps/api/src/meetings/meetings.controller.ts`:

**teraz** (fragment klasy — konstruktor + kolejność handlerów):

```typescript
export class MeetingsController {
  constructor(
    private readonly listMeetings: ListMeetingsUseCase,
    private readonly getMeeting: GetMeetingUseCase,
    private readonly events: MeetingEventsService,
  ) {}

  @Get()
  list(/* … */) { /* … */ }

  @Sse(':id/events')
  async eventsStream(/* … */) { /* … */ }

  @Get(':id')
  detail(/* … */) { /* … */ }
}
```

**zamień na:**

```typescript
export class MeetingsController {
  constructor(
    private readonly listMeetings: ListMeetingsUseCase,
    private readonly getMeeting: GetMeetingUseCase,
    private readonly getMeetingRecording: GetMeetingRecordingUseCase,
    private readonly events: MeetingEventsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMeetingsQueryDto,
  ) {
    return this.listMeetings.execute(user, query.page, query.limit);
  }

  @Sse(':id/events')
  async eventsStream(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Observable<MessageEvent>> {
    return this.events.stream(user, id);
  }

  /** K-5b — deklaracja przed `@Get(':id')` (spójnie z `:id/events`). */
  @Get(':id/recording')
  recording(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.getMeetingRecording.execute(user, id);
  }

  @Get(':id')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.getMeeting.execute(user, id);
  }
}
```

Dopisz import:

```typescript
import { GetMeetingRecordingUseCase } from './get-meeting-recording.use-case.js';
```

#### Refaktor — module

`apps/api/src/meetings/meetings.module.ts`:

**teraz:**

```typescript
import { AccessModule } from '../access/access.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
// … use case’y …
@Module({
  imports: [JobsModule, PrismaModule, AccessModule, AuthModule, AuditModule],
  providers: [
    EnqueueMeetingProcessUseCase,
    ListMeetingsUseCase,
    GetMeetingUseCase,
    MeetingEventsService,
  ],
  controllers: [MeetingsController],
  exports: [EnqueueMeetingProcessUseCase],
})
export class MeetingsModule {}
```

**zamień na:**

```typescript
import { AccessModule } from '../access/access.module.js';
import { MeetingRecordingModule } from '../adapters/meeting-recording/meeting-recording.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EnqueueMeetingProcessUseCase } from './enqueue-meeting-process.use-case.js';
import { GetMeetingRecordingUseCase } from './get-meeting-recording.use-case.js';
import { GetMeetingUseCase } from './get-meeting.use-case.js';
import { ListMeetingsUseCase } from './list-meetings.use-case.js';
import { MeetingEventsService } from './meeting-events.service.js';
import { MeetingsController } from './meetings.controller.js';

@Module({
  imports: [
    JobsModule,
    PrismaModule,
    AccessModule,
    AuthModule,
    AuditModule,
    MeetingRecordingModule,
  ],
  providers: [
    EnqueueMeetingProcessUseCase,
    ListMeetingsUseCase,
    GetMeetingUseCase,
    GetMeetingRecordingUseCase,
    MeetingEventsService,
  ],
  controllers: [MeetingsController],
  exports: [EnqueueMeetingProcessUseCase],
})
export class MeetingsModule {}
```

**DoD kroku:**

- `GET /meetings/:id/recording` z sesją; brak ACL → 404; z ACL → `{ url }` z mocka.
- Brak 302; brak zapisu URL (use case nie woła update z polem media).
- Schemat Prisma bez kolumn ephemeral media (bez migracji w tym kroku).

---

### KROK 3 - Testy recording (T-11a)

**Status:** `WYKONANY`

**Cel:** Integracja API pokrywa T-11a — ACL, mock, bez sieci FF, bez asercji kolumny URL (`SPEC-TESTY` T-11a, major 3.6.3).

**Artefakty:**

- Zmiana: `apps/api/test/auth-acl.e2e-spec.ts` (dopisek scenariuszy) **albo** nowy `apps/api/test/recording.e2e-spec.ts` — preferuj **dopisek** do istniejącego e2e auth/ACL (ten sam bootstrap `AppModule` / cookie / cleanup), o ile plik nie puchnie nieczytelnie; w przeciwnym razie osobny plik z tym samym `beforeAll`/`beforeEach` wzorcem.

#### Implementacja — scenariusze e2e (szkic pełny do wklejenia)

Dopisać w `describe` e2e (ten sam `agent` / `prisma` / cleanup):

```typescript
  it('GET /meetings/:id/recording without ACL → 404 (T-11a)', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'rec-owner@example.com', password: 'Password1!abcd' });
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: 'rec-owner@example.com' },
    });
    const meeting = await prisma.meeting.create({
      data: {
        externalMeetingId: 'rec-ext-1',
        organizerId: owner.id,
        processingStatus: 'completed',
      },
    });

    const stranger = request.agent(app.getHttpServer());
    await stranger
      .post('/auth/register')
      .send({ email: 'rec-other@example.com', password: 'Password1!abcd' });

    await stranger.get(`/meetings/${meeting.id}/recording`).expect(404);
  });

  it('GET /meetings/:id/recording with ACL → { url } mock (T-11a)', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'rec-ok@example.com', password: 'Password1!abcd' });
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'rec-ok@example.com' },
    });
    const meeting = await prisma.meeting.create({
      data: {
        externalMeetingId: 'rec-ext-ok',
        organizerId: user.id,
        processingStatus: 'completed',
      },
    });

    const res = await agent
      .get(`/meetings/${meeting.id}/recording`)
      .expect(200);

    expect(res.body).toEqual({
      url: 'https://example.com/demo-recording',
    });
    expect(res.status).not.toBe(302);
    expect(res.headers.location).toBeUndefined();

    // D-7b / T-11a: nie asertujemy kolumny media URL — odczyt tylko pól kanonu.
    const row = await prisma.meeting.findUniqueOrThrow({
      where: { id: meeting.id },
    });
    expect(row.externalMeetingId).toBe('rec-ext-ok');
    expect(row).not.toHaveProperty('audio_url');
    expect(row).not.toHaveProperty('video_url');
  });
```

**DoD kroku:**

- Scenariusze T-11a przechodzą w zakresie DoD.
- Brak asercji na prawdziwe API FF / sieć.
- Brak oczekiwania trwałego pola URL w DB.

---

#### Propozycja commit message

```text
feat(api): add on-demand meeting recording link via mock port

Expose GET /meetings/:id/recording with detail ACL and JSON { url },
keeping ephemeral media URLs out of Postgres for a later Fireflies adapter.
```

---

## Weryfikacja wycinka

| Kryterium | Oczekiwanie |
|-----------|-------------|
| K-5b | Sesja + ACL → `{ url }` mock; bez ACL → 404; nie 302 |
| D-7b | Brak migracji / kolumn media URL na `Meeting` |
| AC-2/AC-3 | Ta sama decyzja ACL co detail; recording w ścieżce deny→404 |
| T-11a | e2e + unit mock; bez FF / bez asercji kolumny URL |
| Architektura | Port w `api`; cienki controller; use case nie zna vendora |
| Poza zakresem | Brak zmian `apps/web` / BFF w tym pliku |

## Ślad do major (tylko informacyjnie — po implementacji)

Po spełnieniu DoD implementacji (poza tą sesją):

- Faza 3.6 → `WYKONANY`
- Kroki 3.6.1, 3.6.2, 3.6.3 → `WYKONANY`
- `MILESTONE - Szkielet on-demand nagrania (API)` → `OSIĄGNIĘTY` (gdy prowadzący zaakceptuje przejście)

Ten feature plan **nie** zmienia pliku major.
