/**
 * Integracja na Postgres `vinseo_test` (SPEC-TESTY T-3 / T-9).
 *
 * Uruchomienie: `pnpm test:integration` (root lub `@vinseo/worker`).
 * Wymaga: `pnpm db:up` albo `pnpm dev:stack:up` (oba tworzą `vinseo_test`),
 * potem: `DATABASE_URL="$DATABASE_URL_TEST" pnpm db:migrate:deploy`
 *
 * Nie wchodzi w domyślne `pnpm test` (unit).
 */
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import type { LlmClientPort } from '../adapters/llm/llm-client.port.js';
import { LLM_CLIENT_PORT } from '../adapters/llm/llm-client.port.js';
import { MockLlmAdapter } from '../adapters/llm/mock-llm.adapter.js';
import type { MeetingSourcePort } from '../adapters/meeting-source/meeting-source.port.js';
import { MEETING_SOURCE_PORT } from '../adapters/meeting-source/meeting-source.port.js';
import { MockMeetingSourceAdapter } from '../adapters/meeting-source/mock-meeting-source.adapter.js';
import { validateWorkerEnv } from '../config/env.schema.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MeetingProcessOrchestrator } from './meeting-process.orchestrator.js';
import { MeetingRepository } from './meeting-repository.js';
import { SummarizeMeetingUseCase } from './summarize-meeting.use-case.js';

describe('MeetingProcessOrchestrator (integration)', () => {
  let orchestrator: MeetingProcessOrchestrator;
  let prisma: PrismaService;
  let source: MeetingSourcePort;
  let meetings: MeetingRepository;

  const payload = {
    externalMeetingId: 'demo-client-budget-pl',
    source: 'mock' as const,
    fixtureKey: 'demo-client-budget-pl',
  };

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
        {
          provide: MEETING_SOURCE_PORT,
          useExisting: MockMeetingSourceAdapter,
        },
        MockLlmAdapter,
        { provide: LLM_CLIENT_PORT, useExisting: MockLlmAdapter },
      ],
    }).compile();

    orchestrator = moduleRef.get(MeetingProcessOrchestrator);
    prisma = moduleRef.get(PrismaService);
    source = moduleRef.get(MEETING_SOURCE_PORT);
    meetings = moduleRef.get(MeetingRepository);
  });

  beforeEach(async () => {
    await prisma.meeting.deleteMany();
    await prisma.client.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('idempotent happy path with unmatched client link', async () => {
    await orchestrator.run(payload);
    await orchestrator.run(payload);

    const rows = await prisma.meeting.findMany({
      where: { externalMeetingId: 'demo-client-budget-pl' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.processingStatus).toBe('completed');
    expect(rows[0]?.summary).toBeTruthy();
    expect(rows[0]?.clientLinkStatus).toBe('unmatched');
    expect(rows[0]?.clientId).toBeNull();

    const externals = rows[0]?.externalParticipants as
      | Array<{ email: string; displayName: string }>
      | null;
    expect(externals?.some((p) => p.email.includes('client-x.example'))).toBe(
      true,
    );

    const segments = rows[0]?.transcriptSegments as Array<{ text: string }>;
    expect(segments.some((s) => s.text.includes('[REDACTED_EMAIL]'))).toBe(
      true,
    );
  });

  it('matches Client by external email domain', async () => {
    await prisma.client.create({
      data: {
        name: 'Client X',
        emailDomain: 'client-x.example',
      },
    });

    await orchestrator.run(payload);

    const row = await prisma.meeting.findUnique({
      where: { externalMeetingId: 'demo-client-budget-pl' },
    });
    expect(row?.processingStatus).toBe('completed');
    expect(row?.clientLinkStatus).toBe('matched');
    expect(row?.clientId).not.toBeNull();
  });

  it('marks failed without canonical summary when LLM invalid', async () => {
    const llm: LlmClientPort = {
      summarizeMeeting: jest
        .fn()
        .mockResolvedValueOnce({ shortSummary: 123, decisions: 'nope' })
        .mockResolvedValueOnce({ broken: true }),
    };
    const failOrchestrator = new MeetingProcessOrchestrator(
      source,
      meetings,
      new SummarizeMeetingUseCase(llm),
    );

    await failOrchestrator.run(payload);

    const row = await prisma.meeting.findUnique({
      where: { externalMeetingId: 'demo-client-budget-pl' },
    });
    expect(row?.processingStatus).toBe('failed');
    expect(row?.summary).toBeNull();
    expect(row?.failureReason).toBe('SUMMARY_VALIDATION_FAILED_AFTER_RETRY');
  });
});
