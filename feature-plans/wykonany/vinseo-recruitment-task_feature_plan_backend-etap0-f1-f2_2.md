# Vinseo Recruitment Task — feature plan (backend etap 0, plik 2/2)

**Lokalizacja:** `feature-plans/vinseo-recruitment-task_feature_plan_backend-etap0-f1-f2_2.md`  
**Zestaw:** plik `_1` = FAZA 1 (zatwierdzony); ten plik = **FAZA 2**.  
**Kotwica major:** `vinseo-recruitment-task-backend_major-plan.md` — Faza 2 (pełna) → MILESTONE „Pipeline etapu 0 działa”.  
**Wymaga:** zaimplementowanej FAZY 1 z pliku `_1` (monorepo, Prisma, szkielety, Compose).  
**Źródła:** `docs/data_flow.md`, `docs/dokumentacja_komunikacji.md`, `docs/llm_i_asystent.md`, `SPEC-PIPELINE`, `SPEC-LLM`, `SPEC-KOMUNIKACJA` (job / źródło), `SPEC-TESTY` (T-7…T-9), `SPEC-DANE`.  
**Pass rozwojowy (sesja):** redakcja + unit testy przed orkiestracją; `LlmClient` mock przed summarize; enqueue DX z `api` bez sesji cookie (`POST /demo/run-meeting` → major Faza 3).

**Statusy kroków feature:** `NIE_ROZPOCZĘTY` | `W_TRAKCIE` | `WYKONANY`

---

## Meta

| Pole | Wartość |
|------|---------|
| Wycinek (ten plik) | Pipeline `meeting.process`: mock źródła → redact → mock LLM → Zod → persist; idempotencja; enqueue DX z `api`; demo + testy |
| Major | Faza 2, kroki 2.1–2.4 → milestone „Pipeline etapu 0 działa” |
| Poza zakresem | Auth cookie / ACL / SSE / `POST /demo/run-meeting` (Faza 3); CI / Część A; pełne UI |
| Ustalenie enqueue DX | Endpoint deweloperski w `api` **bez** sesji; w `production` **nie** rejestrujemy trasy |
| Po implementacji (informacyjnie) | Major: Faza 2 → `WYKONANY`; MILESTONE „Pipeline etapu 0 działa” → `OSIĄGNIĘTY` — **edycja major poza tym skillem** |

---

## Założenia

- Stack i katalogi z FAZY 1 + `SPEC-ARCHITEKTURA` (porty w workerze, enqueue tylko z `api`, brak `prisma` w redakcji).
- Kolejka: **pg-boss** w tej samej Postgres (`MEETING_PROCESS_JOB_NAME` z `@vinseo/contracts`) — Context7: `start` → `createQueue` → `send` / `work`.
- Zod **wyłącznie** w `apps/worker` i `apps/api` (walidacja źródła / summary) — nie w `packages/`.
- Mock LLM: zero HTTP do API modelu; tryby happy / invalid (`SPEC-LLM` L-9).
- Brak trwałego zapisu transcript/summary **przed** wywołaniem `LlmClient` (`SPEC-PIPELINE` P-9).

---

## FAZA 2 — Pipeline spotkania

### KROK 1 — Port źródła i atrapa materiałów

**Status:** `WYKONANY`

**Cel:** Pobranie mockowego materiału po `externalMeetingId` / `fixtureKey`; kanon **bez** `summary.*` vendora — major 2.1, `SPEC-PIPELINE` P-3, `SPEC-KOMUNIKACJA` K-12…K-14.

**Artefakty:**

- Nowe (worker):  
  `apps/worker/src/adapters/meeting-source/meeting-source.port.ts`  
  `apps/worker/src/adapters/meeting-source/meeting-source.zod.ts`  
  `apps/worker/src/adapters/meeting-source/mock-meeting-source.adapter.ts`  
  `apps/worker/src/adapters/meeting-source/fixtures/demo-client-budget-pl.json`  
  `apps/worker/src/adapters/meeting-source/meeting-source.module.ts`
- Nowe (api, walidacja kształtu przy DX — później KROK 4):  
  `apps/api/src/meetings/meeting-source.zod.ts` (ten sam kontrakt Zod — **skopiowany** / współdzielony wyłącznie jako typ z contracts; schemat Zod osobno w obu appach)

#### Nowy plik — port

`apps/worker/src/adapters/meeting-source/meeting-source.port.ts`:

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

#### Nowy plik — Zod źródła (worker)

`apps/worker/src/adapters/meeting-source/meeting-source.zod.ts`:

```typescript
import { z } from 'zod';

export const sourceParticipantSchema = z.object({
  email: z.string().email().nullable(),
  displayName: z.string().min(1),
  internal: z.boolean(),
});

export const sourceSegmentSchema = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1),
  startMs: z.number().int().nonnegative(),
});

export const meetingSourcePayloadSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  startedAt: z.string().datetime({ offset: true }),
  participants: z.array(sourceParticipantSchema).min(1),
  segments: z.array(sourceSegmentSchema).min(1),
});

export type MeetingSourcePayloadParsed = z.infer<
  typeof meetingSourcePayloadSchema
>;
```

*(Jeśli Zod 4 wymaga innej opcji datetime — użyj `z.string().min(1)` + parse `Date` w normalize; ważne: walidacja w aplikacji, nie w contracts.)*

#### Nowy plik — fixture

`apps/worker/src/adapters/meeting-source/fixtures/demo-client-budget-pl.json`:

```json
{
  "externalId": "demo-client-budget-pl",
  "title": "Budżet kampanii Q4 — Client X",
  "startedAt": "2026-10-15T09:00:00.000Z",
  "participants": [
    {
      "email": "anna.kowalska@vinseo.example",
      "displayName": "Anna Kowalska",
      "internal": true
    },
    {
      "email": "jan.nowak@client-x.example",
      "displayName": "Jan Nowak",
      "internal": false
    }
  ],
  "segments": [
    {
      "speaker": "Anna Kowalska",
      "text": "Cześć, ustalmy budget na kampanię Brand Lift. Mój mail roboczy to anna.budget@vinseo.example na wszelki wypadek.",
      "startMs": 0
    },
    {
      "speaker": "Jan Nowak",
      "text": "OK. Jak coś, dzwońcie pod +48 600 100 200. PESEL testowy do formalności: 44051401359.",
      "startMs": 12000
    },
    {
      "speaker": "Anna Kowalska",
      "text": "Dzięki. Karta firmowa do refundacji testowej: 4111111111111111 — nie używać w prod.",
      "startMs": 24000
    },
    {
      "speaker": "Jan Nowak",
      "text": "Final decision: budget 50k PLN na Brand Lift w listopadzie. Action: Anna przygotuje brief do piątku.",
      "startMs": 36000
    }
  ],
  "summary": {
    "overview": "VENDOR SUMMARY — MUST BE IGNORED",
    "action_items": ["ignore-me"]
  }
}
```

**Uwaga:** pole `summary` jest **tylko** w surowym JSON fixture (kształt „jak vendor”). Adapter **nie** mapuje go na `MeetingSourcePayload` — po Zod porcie tego pola nie ma.

#### Nowy plik — adapter mock

`apps/worker/src/adapters/meeting-source/mock-meeting-source.adapter.ts`:

```typescript
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Injectable, NotFoundException } from '@nestjs/common';
import type { MeetingSourcePayload } from '@vinseo/contracts';

import type {
  FetchMeetingSourceInput,
  MeetingSourcePort,
} from './meeting-source.port.js';
import { meetingSourcePayloadSchema } from './meeting-source.zod.js';

const FIXTURES: Record<string, string> = {
  'demo-client-budget-pl': 'demo-client-budget-pl.json',
};

@Injectable()
export class MockMeetingSourceAdapter implements MeetingSourcePort {
  async fetch(input: FetchMeetingSourceInput): Promise<MeetingSourcePayload> {
    const key = input.fixtureKey ?? input.externalMeetingId;
    const fileName = FIXTURES[key];
    if (!fileName) {
      throw new NotFoundException(`Unknown meeting fixture: ${key}`);
    }

    const here = dirname(fileURLToPath(import.meta.url));
    const raw = JSON.parse(
      await readFile(join(here, 'fixtures', fileName), 'utf8'),
    ) as Record<string, unknown>;

    // Anti-corruption: drop vendor summary before validation/persist path
    const { summary: _ignoredVendorSummary, ...rest } = raw;

    const parsed = meetingSourcePayloadSchema.safeParse(rest);
    if (!parsed.success) {
      throw new Error(
        `Invalid meeting source fixture ${key}: ${parsed.error.message}`,
      );
    }

    return parsed.data;
  }
}
```

#### Nowy plik — moduł

`apps/worker/src/adapters/meeting-source/meeting-source.module.ts`:

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

#### Biblioteki

- Kontrakt K-12; Zod w workerze (K-13).
- Ignorowanie `summary` vendora — P-3 / L-5.

#### Testy (szkic w tym kroku; pełne redakcji w KROK 2)

- Unit: adapter dla `demo-client-budget-pl` zwraca payload **bez** klucza `summary`; `externalId` = fixture key.

#### DoD (krok)

- Da się pobrać fixture po kluczu.
- Ścieżka nie opiera się na `summary.*` vendora jako źródle prawdy.

---

### KROK 2 — Redakcja E+T+P+K (pure) + unit testy

**Status:** `WYKONANY`

**Cel:** Czysta redakcja przed LLM; testy jednostkowe — major 2.2.1 + część 2.4; `SPEC-PIPELINE` P-10…P-12; `SPEC-TESTY` T-7.

**Artefakty:**

- Nowe:  
  `apps/worker/src/pipeline/redaction/redact-text.ts`  
  `apps/worker/src/pipeline/redaction/redact-segments.ts`  
  `apps/worker/src/pipeline/redaction/redact-text.spec.ts`  
  `apps/worker/src/pipeline/redaction/redact-segments.spec.ts`

#### Nowy plik — `redact-text.ts`

```typescript
const PLACEHOLDERS = {
  email: '[REDACTED_EMAIL]',
  phone: '[REDACTED_PHONE]',
  nationalId: '[REDACTED_NATIONAL_ID]',
  card: '[REDACTED_CARD]',
} as const;

/** E — adresy e-mail */
const EMAIL_RE =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

/** T — telefony (PL / międzynarodowe uproszczone) */
const PHONE_RE =
  /(?:\+|00)?\d{1,3}[\s-]?(?:\(?\d{2,3}\)?[\s-]?)?\d{3}[\s-]?\d{2,4}[\s-]?\d{2,4}/g;

/** P — PESEL (11 cyfr) / numer dowodu (3 litery + 6 cyfr) */
const PESEL_RE = /\b\d{11}\b/g;
const ID_CARD_RE = /\b[A-Z]{3}\s?\d{6}\b/gi;

/** K — PAN karty (13–19 cyfr, z Separators); Luhn sprawdzamy opcjonalnie przy matchu ciągłym */
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;

function luhnOk(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function redactText(input: string): string {
  let out = input.replace(EMAIL_RE, PLACEHOLDERS.email);
  out = out.replace(PHONE_RE, PLACEHOLDERS.phone);
  out = out.replace(PESEL_RE, PLACEHOLDERS.nationalId);
  out = out.replace(ID_CARD_RE, PLACEHOLDERS.nationalId);
  out = out.replace(CARD_RE, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return match;
    if (!luhnOk(digits)) return match;
    return PLACEHOLDERS.card;
  });
  return out;
}

export function redactTextIdempotent(input: string): string {
  return redactText(redactText(input));
}
```

*(Regex telefonu jest świadomie uproszczony pod fixture PL; DoD = maskowanie klas z fixture + idempotencja na już zredagowanym tekście. Doprecyzuj wzorce w testach, jeśli false-positive na „50k” — wyklucz krótkie liczby bez separatorów telefonu.)*

**Doprecyzowanie telefonu (zalecane w implementacji):** użyj węższego wzorca pod `+48 …` / `600 100 200`, żeby nie maskować „50k” / lat. Testy są źródłem prawdy zachowania.

Przykład węższego `PHONE_RE` do preferowania w kodzie:

```typescript
const PHONE_RE =
  /(?:\+|00)\d{1,3}(?:[\s-]?\d{2,4}){2,5}|\b\d{3}[\s-]\d{3}[\s-]\d{3}\b/g;
```

#### Nowy plik — `redact-segments.ts`

```typescript
import type { SourceSegment } from '@vinseo/contracts';

import { redactText } from './redact-text.js';

export function redactSegments(
  segments: readonly SourceSegment[],
): SourceSegment[] {
  return segments.map((segment) => ({
    speaker: segment.speaker,
    startMs: segment.startMs,
    text: redactText(segment.text),
  }));
}
```

#### Nowy plik — `redact-text.spec.ts`

```typescript
import { redactText, redactTextIdempotent } from './redact-text.js';

describe('redactText E+T+P+K', () => {
  it('masks email (E)', () => {
    expect(redactText('mail anna.budget@vinseo.example end')).toContain(
      '[REDACTED_EMAIL]',
    );
    expect(redactText('mail anna.budget@vinseo.example end')).not.toContain(
      'anna.budget@vinseo.example',
    );
  });

  it('masks phone (T)', () => {
    const out = redactText('dzwoń +48 600 100 200 proszę');
    expect(out).toContain('[REDACTED_PHONE]');
    expect(out).not.toContain('600 100 200');
  });

  it('masks PESEL-like (P)', () => {
    const out = redactText('PESEL 44051401359');
    expect(out).toContain('[REDACTED_NATIONAL_ID]');
    expect(out).not.toContain('44051401359');
  });

  it('masks Luhn-valid card (K)', () => {
    const out = redactText('karta 4111111111111111');
    expect(out).toContain('[REDACTED_CARD]');
    expect(out).not.toContain('4111111111111111');
  });

  it('is idempotent on already redacted text', () => {
    const once = redactText(
      'a@b.co +48 600 100 200 44051401359 4111111111111111',
    );
    expect(redactTextIdempotent(once)).toBe(once);
  });
});
```

#### Nowy plik — `redact-segments.spec.ts`

```typescript
import { redactSegments } from './redact-segments.js';

describe('redactSegments', () => {
  it('redacts only text, keeps speaker and startMs', () => {
    const result = redactSegments([
      {
        speaker: 'Anna',
        startMs: 0,
        text: 'Kontakt: anna@x.example',
      },
    ]);
    expect(result[0]?.speaker).toBe('Anna');
    expect(result[0]?.startMs).toBe(0);
    expect(result[0]?.text).toContain('[REDACTED_EMAIL]');
  });
});
```

Dodaj w `apps/worker/jest.config.cjs` (jak w api z FAZY 1) oraz skrypt `test` — jeśli jeszcze nie było w `_1` dla worker unitów, uzupełnij tu.

#### DoD (krok)

- Redakcja bez I/O (brak Prisma/HTTP/kolejki).
- Testy E+T+P+K + idempotencja przechodzą.

---

### KROK 3 — LlmClient mock, Zod UC1, orkiestracja `meeting.process`

**Status:** `WYKONANY`

**Cel:** Happy path → `completed` z kanonem po Zod; fail-closed; brak pół-sukcesu w DB przed LLM — major 2.2 / 2.2.2; `SPEC-PIPELINE` P-1…P-9; `SPEC-LLM`.

**Artefakty:**

- Nowe:  
  `apps/worker/src/adapters/llm/llm-client.port.ts`  
  `apps/worker/src/adapters/llm/mock-llm.adapter.ts`  
  `apps/worker/src/adapters/llm/llm.module.ts`  
  `apps/worker/src/pipeline/summary.zod.ts`  
  `apps/worker/src/pipeline/summarize-meeting.use-case.ts`  
  `apps/worker/src/pipeline/meeting-process.orchestrator.ts`  
  `apps/worker/src/pipeline/meeting-repository.ts`  
  `apps/worker/src/pipeline/pipeline.module.ts`  
  `apps/worker/src/jobs/pg-boss.service.ts`  
  `apps/worker/src/jobs/meeting-process.worker.ts`  
  `apps/worker/src/jobs/jobs.module.ts`
- Zmiana: `apps/worker/src/config/env.schema.ts` (LLM_MOCK_MODE), `apps/worker/src/app.module.ts`, `apps/worker/src/main.ts`, `apps/worker/package.json` (+ `pg-boss`)

#### Env — dopisek do `workerEnvSchema`

```typescript
LLM_MOCK_MODE: z.enum(['happy', 'invalid']).default('happy'),
```

#### Port LLM

`apps/worker/src/adapters/llm/llm-client.port.ts`:

```typescript
import type { SourceSegment } from '@vinseo/contracts';

export const LLM_CLIENT_PORT = Symbol('LLM_CLIENT_PORT');

export interface SummarizeMeetingInput {
  readonly segments: readonly SourceSegment[];
  readonly repairPass?: boolean;
}

export interface LlmClientPort {
  summarizeMeeting(input: SummarizeMeetingInput): Promise<unknown>;
}
```

#### Zod summary

`apps/worker/src/pipeline/summary.zod.ts`:

```typescript
import { z } from 'zod';

export const actionItemSchema = z.object({
  assignee: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.string().date().nullable(),
});

export const meetingSummarySchema = z.object({
  shortSummary: z.string().min(1),
  decisions: z.array(z.string()),
  actionItems: z.array(actionItemSchema),
});

export type MeetingSummary = z.infer<typeof meetingSummarySchema>;
```

*(Jeśli `z.string().date()` niedostępne w użytej Zod 4 — `z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])`.)*

#### Mock LLM

`apps/worker/src/adapters/llm/mock-llm.adapter.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { WorkerEnv } from '../../config/env.schema.js';
import type {
  LlmClientPort,
  SummarizeMeetingInput,
} from './llm-client.port.js';

@Injectable()
export class MockLlmAdapter implements LlmClientPort {
  constructor(private readonly config: ConfigService<WorkerEnv, true>) {}

  async summarizeMeeting(input: SummarizeMeetingInput): Promise<unknown> {
    const mode = this.config.get('LLM_MOCK_MODE', { infer: true });

    if (mode === 'invalid' && !input.repairPass) {
      return { shortSummary: 123, decisions: 'nope' };
    }

    if (mode === 'invalid' && input.repairPass) {
      // drugi pass nadal zły → fail-closed po jednym retry
      return { broken: true };
    }

    return {
      shortSummary:
        'Ustalono budżet 50k PLN na kampanię Brand Lift w listopadzie.',
      decisions: [
        'Budget 50k PLN na Brand Lift w listopadzie',
      ],
      actionItems: [
        {
          assignee: 'Anna Kowalska',
          description: 'Przygotować brief kampanii',
          dueDate: '2026-10-18',
        },
      ],
    };
  }
}
```

Dla happy path: `repairPass` nieużywane; zawsze poprawny JSON.  
Dla testów fail-closed ustaw `LLM_MOCK_MODE=invalid`.

#### Use case summarize

`apps/worker/src/pipeline/summarize-meeting.use-case.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type { SourceSegment } from '@vinseo/contracts';

import {
  LLM_CLIENT_PORT,
  type LlmClientPort,
} from '../adapters/llm/llm-client.port.js';
import {
  meetingSummarySchema,
  type MeetingSummary,
} from './summary.zod.js';

export type SummarizeResult =
  | { readonly ok: true; readonly summary: MeetingSummary }
  | { readonly ok: false; readonly reason: string };

@Injectable()
export class SummarizeMeetingUseCase {
  constructor(
    @Inject(LLM_CLIENT_PORT)
    private readonly llm: LlmClientPort,
  ) {}

  async execute(segments: readonly SourceSegment[]): Promise<SummarizeResult> {
    const first = await this.llm.summarizeMeeting({ segments });
    const parsedFirst = meetingSummarySchema.safeParse(first);
    if (parsedFirst.success) {
      return { ok: true, summary: parsedFirst.data };
    }

    const second = await this.llm.summarizeMeeting({
      segments,
      repairPass: true,
    });
    const parsedSecond = meetingSummarySchema.safeParse(second);
    if (parsedSecond.success) {
      return { ok: true, summary: parsedSecond.data };
    }

    return {
      ok: false,
      reason: 'SUMMARY_VALIDATION_FAILED_AFTER_RETRY',
    };
  }
}
```

#### Repozytorium spotkań (Prisma — infrastruktura)

`apps/worker/src/pipeline/meeting-repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import type { ProcessingStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import type { MeetingSummary } from './summary.zod.js';
import type { MeetingSourcePayloadParsed } from '../adapters/meeting-source/meeting-source.zod.js';

@Injectable()
export class MeetingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertPending(externalMeetingId: string): Promise<{ id: string }> {
    return this.prisma.meeting.upsert({
      where: { externalMeetingId },
      create: {
        externalMeetingId,
        processingStatus: 'pending',
        title: null,
      },
      update: {},
      select: { id: true },
    });
  }

  async markProcessing(externalMeetingId: string): Promise<void> {
    await this.prisma.meeting.update({
      where: { externalMeetingId },
      data: { processingStatus: 'processing' },
    });
  }

  async persistSuccess(input: {
    readonly externalMeetingId: string;
    readonly source: MeetingSourcePayloadParsed;
    readonly redactedSegments: MeetingSourcePayloadParsed['segments'];
    readonly summary: MeetingSummary;
  }): Promise<void> {
    await this.prisma.meeting.update({
      where: { externalMeetingId: input.externalMeetingId },
      data: {
        title: input.source.title,
        startedAt: new Date(input.source.startedAt),
        transcriptSegments: input.redactedSegments,
        summary: input.summary,
        processingStatus: 'completed',
        failureReason: null,
      },
    });
  }

  async markFailed(
    externalMeetingId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.meeting.update({
      where: { externalMeetingId },
      data: {
        processingStatus: 'failed' satisfies ProcessingStatus,
        failureReason: reason,
      },
    });
  }
}
```

**Invariant P-9:** `persistSuccess` wołane **tylko** po udanym Zod; przed LLM wolno jedynie `pending`→`processing` (metadane statusu), **bez** zapisu transcript/summary.

#### Orkiestrator

`apps/worker/src/pipeline/meeting-process.orchestrator.ts`:

```typescript
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MeetingProcessJobPayload } from '@vinseo/contracts';

import {
  MEETING_SOURCE_PORT,
  type MeetingSourcePort,
} from '../adapters/meeting-source/meeting-source.port.js';
import { redactSegments } from './redaction/redact-segments.js';
import { MeetingRepository } from './meeting-repository.js';
import { SummarizeMeetingUseCase } from './summarize-meeting.use-case.js';

@Injectable()
export class MeetingProcessOrchestrator {
  private readonly logger = new Logger(MeetingProcessOrchestrator.name);

  constructor(
    @Inject(MEETING_SOURCE_PORT)
    private readonly source: MeetingSourcePort,
    private readonly meetings: MeetingRepository,
    private readonly summarize: SummarizeMeetingUseCase,
  ) {}

  async run(payload: MeetingProcessJobPayload): Promise<void> {
    const externalMeetingId = String(payload.externalMeetingId);
    await this.meetings.upsertPending(externalMeetingId);
    await this.meetings.markProcessing(externalMeetingId);

    const fetched = await this.source.fetch({
      externalMeetingId,
      fixtureKey:
        payload.fixtureKey !== undefined
          ? String(payload.fixtureKey)
          : undefined,
    });

    // normalize: już kształt portu po Zod w adapterze
    const redactedSegments = redactSegments(fetched.segments);

    const summarized = await this.summarize.execute(redactedSegments);
    if (!summarized.ok) {
      await this.meetings.markFailed(externalMeetingId, summarized.reason);
      this.logger.warn(`Meeting ${externalMeetingId} failed: ${summarized.reason}`);
      return;
    }

    await this.meetings.persistSuccess({
      externalMeetingId,
      source: fetched,
      redactedSegments,
      summary: summarized.summary,
    });
  }
}
```

#### pg-boss w workerze

`apps/worker/src/jobs/pg-boss.service.ts`:

```typescript
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MEETING_PROCESS_JOB_NAME } from '@vinseo/contracts';
import { PgBoss } from 'pg-boss';

import type { WorkerEnv } from '../config/env.schema.js';

@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name);
  private boss: PgBoss | null = null;

  constructor(private readonly config: ConfigService<WorkerEnv, true>) {}

  get client(): PgBoss {
    if (!this.boss) {
      throw new Error('PgBoss not started');
    }
    return this.boss;
  }

  async onModuleInit(): Promise<void> {
    const connectionString = this.config.get('DATABASE_URL', { infer: true });
    this.boss = new PgBoss(connectionString);
    this.boss.on('error', (err) => {
      this.logger.error(err);
    });
    await this.boss.start();
    await this.boss.createQueue(MEETING_PROCESS_JOB_NAME);
    this.logger.log(`pg-boss started; queue ${MEETING_PROCESS_JOB_NAME}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.boss?.stop();
  }
}
```

`apps/worker/src/jobs/meeting-process.worker.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  MEETING_PROCESS_JOB_NAME,
  type MeetingProcessJobPayload,
} from '@vinseo/contracts';

import { MeetingProcessOrchestrator } from '../pipeline/meeting-process.orchestrator.js';
import { PgBossService } from './pg-boss.service.js';

@Injectable()
export class MeetingProcessWorker implements OnModuleInit {
  private readonly logger = new Logger(MeetingProcessWorker.name);

  constructor(
    private readonly boss: PgBossService,
    private readonly orchestrator: MeetingProcessOrchestrator,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.boss.client.work(
      MEETING_PROCESS_JOB_NAME,
      async (jobs) => {
        for (const job of jobs) {
          const data = job.data as MeetingProcessJobPayload;
          this.logger.log(
            `Processing ${MEETING_PROCESS_JOB_NAME} job=${job.id}`,
          );
          await this.orchestrator.run(data);
        }
      },
    );
  }
}
```

*(Dostosuj sygnaturę `work` do wersji `pg-boss` z lockfile — Context7 pokazuje `work(queue, async ([job]) => …)`; przy batch size 1 to wystarczy.)*

#### Moduły — złożenie

`LlmModule`, `PipelineModule`, `JobsModule` — standardowy Nest: providers + exports; `AppModule` importuje `MeetingSourceModule`, `LlmModule`, `PipelineModule`, `JobsModule`, `PrismaModule`.

`package.json` worker — dodaj `"pg-boss": "^10.1.5"` (lub aktualna stabilna z npm przy install).

#### Testy integracyjne (szkielet — domknięcie w KROK 5)

- Happy: orchestrator + mock source + happy LLM → `completed` + summary w DB.
- Invalid LLM: `failed`, `summary` null / niekanoniczne.
- Asercja: po `markProcessing`, **przed** mock LLM, w DB brak `transcriptSegments` (można mockować LLM z opóźnieniem / spy).

#### DoD (krok)

- Happy path → `completed` z transcript + summary + action items po Zod.
- Awaria walidacji → `failed` bez kanonicznego sukcesu.
- Statusy `pending|processing|completed|failed` obserwowalne w DB.

---

### KROK 4 — Idempotencja i enqueue DX z `api`

**Status:** `WYKONANY`

**Cel:** Ten sam klucz = jedno spotkanie; enqueue ze ścieżki `api` (DX bez sesji) — major 2.3; `SPEC-PIPELINE` P-6/P-7; `SPEC-KOMUNIKACJA` K-9/K-10.  
**Nie** implementujemy `POST /demo/run-meeting` (Faza 3).

**Artefakty:**

- Nowe (api):  
  `apps/api/src/jobs/pg-boss.service.ts`  
  `apps/api/src/jobs/jobs.module.ts`  
  `apps/api/src/meetings/enqueue-meeting-process.use-case.ts`  
  `apps/api/src/meetings/dev-enqueue.dto.ts`  
  `apps/api/src/meetings/dev-enqueue.controller.ts`  
  `apps/api/src/meetings/meetings.module.ts`  
  `apps/api/src/meetings/meeting-source.zod.ts` (opcjonalna walidacja fixtureKey)
- Zmiana: `apps/api/src/app.module.ts`, `apps/api/package.json` (+ `pg-boss`), `.env.example` (`LLM_MOCK_MODE` po stronie worker)

#### Use case enqueue

`apps/api/src/meetings/enqueue-meeting-process.use-case.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import {
  MEETING_PROCESS_JOB_NAME,
  type MeetingProcessJobPayload,
} from '@vinseo/contracts';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';
import { PgBossService } from '../jobs/pg-boss.service.js';

export interface EnqueueMeetingProcessInput {
  readonly fixtureKey: string;
  readonly requestId?: string;
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
    const externalMeetingId = input.fixtureKey;
    const requestId = input.requestId ?? randomUUID();

    const meeting = await this.prisma.meeting.upsert({
      where: { externalMeetingId },
      create: {
        externalMeetingId,
        processingStatus: 'pending',
      },
      update: {
        // ponowne enqueue: update in place — bez drugiego wiersza
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

#### DTO + controller DX

`apps/api/src/meetings/dev-enqueue.dto.ts`:

```typescript
import { IsOptional, IsString, MinLength } from 'class-validator';

export class DevEnqueueMeetingDto {
  @IsString()
  @MinLength(1)
  fixtureKey!: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}
```

`apps/api/src/meetings/dev-enqueue.controller.ts`:

```typescript
import { Body, Controller, Post } from '@nestjs/common';

import { DevEnqueueMeetingDto } from './dev-enqueue.dto.js';
import { EnqueueMeetingProcessUseCase } from './enqueue-meeting-process.use-case.js';

/**
 * DX-only: bez sesji cookie. Rejestrowany wyłącznie gdy NODE_ENV !== 'production'.
 * Produkcyjne demo z auth: POST /demo/run-meeting (major Faza 3).
 */
@Controller('dev/meetings')
export class DevEnqueueController {
  constructor(private readonly enqueue: EnqueueMeetingProcessUseCase) {}

  @Post('enqueue')
  enqueueMeeting(@Body() body: DevEnqueueMeetingDto) {
    return this.enqueue.execute({
      fixtureKey: body.fixtureKey,
      requestId: body.requestId,
    });
  }
}
```

#### Rejestracja warunkowa

W `MeetingsModule`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { JobsModule } from '../jobs/jobs.module.js';
import { DevEnqueueController } from './dev-enqueue.controller.js';
import { EnqueueMeetingProcessUseCase } from './enqueue-meeting-process.use-case.js';
import type { ApiEnv } from '../config/env.schema.js';

@Module({
  imports: [JobsModule, ConfigModule],
  providers: [EnqueueMeetingProcessUseCase],
  controllers: [],
})
export class MeetingsModule {
  static register() {
    return {
      module: MeetingsModule,
      controllers:
        process.env.NODE_ENV === 'production' ? [] : [DevEnqueueController],
    };
  }
}
```

W `AppModule`: `MeetingsModule.register()` zamiast `MeetingsModule`.

`PgBossService` w api — jak w workerze (`start` + `createQueue`), bez `work`.

#### DoD (krok)

- Dwukrotne enqueue tego samego `fixtureKey` → **jeden** wiersz `Meeting` (`externalMeetingId` unique).
- Enqueue osiągalny z `api` (`POST /dev/meetings/enqueue` lokalnie).
- W `production` kontroler DX nie jest zarejestrowany.

---

### KROK 5 — Demo lokalne + testy pipeline (domknięcie)

**Status:** `WYKONANY`

**Cel:** README z demo przepuszczenia spotkania; testy redakcji (już KROK 2) + integracja pipeline — major 2.4; `SPEC-TESTY` T-7…T-9.

**Artefakty:**

- Nowe:  
  `apps/worker/src/pipeline/meeting-process.orchestrator.spec.ts` (integracja z DB testową **lub** z mockami portów + Prisma test)  
  `apps/api/test/dev-enqueue.e2e-spec.ts` (opcjonalnie)
- Zmiana: root `README.md` (sekcja demo po Fazie 2)

#### Demo (README) — fragment do dopisania

```markdown
## Demo pipeline (po Fazie 2)

```bash
docker compose up -d
pnpm install
cp .env.example .env
pnpm db:generate && pnpm db:migrate:deploy

# terminal A
pnpm dev:worker

# terminal B
pnpm dev:api

# enqueue fixture (DX, bez logowania)
curl -s -X POST http://localhost:3001/dev/meetings/enqueue \
  -H 'content-type: application/json' \
  -d '{"fixtureKey":"demo-client-budget-pl"}'
```

Sprawdź w DB / Prisma Studio: jedno spotkanie, `processingStatus=completed`, `summary` z `actionItems`, segmenty **bez** surowych PII z fixture (placeholdery redakcji).

Ponowne `curl` z tym samym `fixtureKey` nie tworzy drugiego wiersza `Meeting`.
```

#### Test integracyjny orkiestratora (wzorzec)

`apps/worker/src/pipeline/meeting-process.orchestrator.integration.spec.ts`:

```typescript
/**
 * Wymaga DATABASE_URL_TEST + migracje na vinseo_test.
 * Happy path: run orchestrator → completed + summary.
 * Idempotencja: dwa runy → count Meeting where externalMeetingId = … === 1.
 * Fail-closed: LLM_MOCK_MODE=invalid → failed, summary null.
 */
describe('MeetingProcessOrchestrator (integration)', () => {
  it('completes happy path once per externalMeetingId', async () => {
    // arrange: TestingModule z prawdziwym Prisma + MockMeetingSource + MockLlm happy
    // act: orchestrator.run({ externalMeetingId, source:'mock', fixtureKey }) ×2
    // assert: meetings count === 1; status completed; summary.actionItems.length >= 1
  });

  it('marks failed without canonical summary when LLM invalid', async () => {
    // LLM_MOCK_MODE=invalid
    // assert: status failed; summary === null
  });
});
```

*(W implementacji wstaw kompletny kod z `@nestjs/testing` + cleanup tabeli `Meeting` w `beforeEach` — wzorzec powyżej jest kontraktem testu; nie zostawiaj pustego `it` w merge.)*

Pełny przykład happy-path body do wklejenia przy implementacji:

```typescript
import { Test } from '@nestjs/testing';
import { MEETING_SOURCE_PORT } from '../adapters/meeting-source/meeting-source.port.js';
import { MockMeetingSourceAdapter } from '../adapters/meeting-source/mock-meeting-source.adapter.js';
import { LLM_CLIENT_PORT } from '../adapters/llm/llm-client.port.js';
import { MockLlmAdapter } from '../adapters/llm/mock-llm.adapter.js';
import { ConfigModule } from '@nestjs/config';
import { validateWorkerEnv } from '../config/env.schema.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MeetingProcessOrchestrator } from './meeting-process.orchestrator.js';
import { MeetingRepository } from './meeting-repository.js';
import { SummarizeMeetingUseCase } from './summarize-meeting.use-case.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('MeetingProcessOrchestrator (integration)', () => {
  let orchestrator: MeetingProcessOrchestrator;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL_TEST ??
      'postgresql://vinseo:vinseo@localhost:5432/vinseo_test?schema=public';
    process.env.LLM_MOCK_MODE = 'happy';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateWorkerEnv }),
        PrismaModule,
      ],
      providers: [
        MeetingProcessOrchestrator,
        MeetingRepository,
        SummarizeMeetingUseCase,
        MockMeetingSourceAdapter,
        { provide: MEETING_SOURCE_PORT, useExisting: MockMeetingSourceAdapter },
        MockLlmAdapter,
        { provide: LLM_CLIENT_PORT, useExisting: MockLlmAdapter },
      ],
    }).compile();

    orchestrator = moduleRef.get(MeetingProcessOrchestrator);
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.meeting.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('idempotent happy path', async () => {
    const payload = {
      externalMeetingId: 'demo-client-budget-pl',
      source: 'mock' as const,
      fixtureKey: 'demo-client-budget-pl',
    };
    await orchestrator.run(payload);
    await orchestrator.run(payload);

    const rows = await prisma.meeting.findMany({
      where: { externalMeetingId: 'demo-client-budget-pl' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.processingStatus).toBe('completed');
    expect(rows[0]?.summary).toBeTruthy();
    const segments = rows[0]?.transcriptSegments as Array<{ text: string }>;
    expect(segments.some((s) => s.text.includes('[REDACTED_EMAIL]'))).toBe(
      true,
    );
  });
});
```

#### DoD (krok)

- Testy redakcji (KROK 2) zielone.
- Testy pipeline: happy, idempotencja, fail-closed — zielone na DB testowej.
- Demo opisane w README działa na Compose z FAZY 1.

#### Propozycja commit message

```text
feat(pipeline): process mock meetings through redact, summarize, and persist

Enqueue from api DX, keep a single meeting per fixture key, and reject invalid
LLM payloads without writing a canonical summary.
```

---

## Weryfikacja wycinka (ten plik + zestaw z `_1`)

- [ ] Major Faza 2 (2.1–2.4) pokryta; milestone „Pipeline etapu 0 działa” osiągalny po implementacji.
- [ ] Zgodność `SPEC-PIPELINE` / `SPEC-LLM` / K-9…K-14; brak Zod w `packages/`.
- [ ] Redakcja przed każdym wywołaniem portu LLM; brak persist transcript/summary przed LLM.
- [ ] Enqueue z `api` (DX); worker tylko konsumuje; brak `POST /demo/run-meeting` w tym wycinku.
- [ ] Nagłówki `FAZA` / `KROK`; commit message EN; statusy z trójki; major nietknięty.
- [ ] Brak odwołań do planów pomocniczych w rootcie.
- [ ] Pass rozwojowy: redakcja+testy → LLM → orkiestracja → enqueue → demo.

## Ślad do major (informacyjnie, po implementacji)

| Pozycja major | Oczekiwany status |
|---------------|-------------------|
| Faza 2 | `WYKONANY` |
| Kroki 2.1–2.4 | `WYKONANY` |
| MILESTONE — Pipeline etapu 0 działa | `OSIĄGNIĘTY` |
| Faza 3+ | bez zmian w tej sesji |
