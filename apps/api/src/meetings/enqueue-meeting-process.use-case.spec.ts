import { EnqueueMeetingProcessUseCase } from './enqueue-meeting-process.use-case.js';

describe('EnqueueMeetingProcessUseCase', () => {
  it('DX default: externalMeetingId equals fixtureKey when omitted', async () => {
    const prisma = {
      meeting: {
        upsert: jest.fn().mockResolvedValue({
          id: 'm-1',
          externalMeetingId: 'demo-client-budget-pl',
          processingStatus: 'pending',
        }),
      },
    };
    const boss = {
      client: {
        send: jest.fn().mockResolvedValue('job-1'),
      },
    };

    const useCase = new EnqueueMeetingProcessUseCase(
      prisma as never,
      boss as never,
    );

    const result = await useCase.execute({
      fixtureKey: 'demo-client-budget-pl',
      requestId: 'req-1',
    });

    expect(result).toEqual({
      meetingId: 'm-1',
      jobId: 'job-1',
      processingStatus: 'pending',
      externalMeetingId: 'demo-client-budget-pl',
    });
    expect(prisma.meeting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { externalMeetingId: 'demo-client-budget-pl' },
      }),
    );
    expect(boss.client.send).toHaveBeenCalledWith(
      'meeting.process',
      expect.objectContaining({
        externalMeetingId: 'demo-client-budget-pl',
        source: 'mock',
        fixtureKey: 'demo-client-budget-pl',
        requestId: 'req-1',
      }),
    );
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
    const upsert = jest.fn().mockResolvedValue({
      id: 'm-1',
      externalMeetingId: '550e8400-e29b-41d4-a716-446655440000',
      processingStatus: 'pending',
    });
    const prisma = { meeting: { upsert } };
    const boss = { client: { send: jest.fn().mockResolvedValue('job-2') } };
    const useCase = new EnqueueMeetingProcessUseCase(
      prisma as never,
      boss as never,
    );

    const externalMeetingId = '550e8400-e29b-41d4-a716-446655440000';
    await useCase.execute({
      fixtureKey: 'demo-client-budget-pl',
      externalMeetingId,
    });
    await useCase.execute({
      fixtureKey: 'demo-kickoff-agency-pl',
      externalMeetingId,
    });

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0]?.[0].where.externalMeetingId).toBe(
      externalMeetingId,
    );
    expect(upsert.mock.calls[1]?.[0].where.externalMeetingId).toBe(
      externalMeetingId,
    );
  });

  it('idempotent upsert: same fixtureKey updates in place (DX)', async () => {
    const upsert = jest.fn().mockResolvedValue({
      id: 'm-1',
      externalMeetingId: 'demo-client-budget-pl',
      processingStatus: 'pending',
    });
    const prisma = { meeting: { upsert } };
    const boss = { client: { send: jest.fn().mockResolvedValue('job-2') } };
    const useCase = new EnqueueMeetingProcessUseCase(
      prisma as never,
      boss as never,
    );

    await useCase.execute({ fixtureKey: 'demo-client-budget-pl' });
    await useCase.execute({ fixtureKey: 'demo-client-budget-pl' });

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0]?.[0].where.externalMeetingId).toBe(
      'demo-client-budget-pl',
    );
    expect(upsert.mock.calls[1]?.[0].where.externalMeetingId).toBe(
      'demo-client-budget-pl',
    );
  });
});
