import { EnqueueMeetingProcessUseCase } from './enqueue-meeting-process.use-case.js';

describe('EnqueueMeetingProcessUseCase', () => {
  it('upserts one meeting and enqueues job', async () => {
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

  it('idempotent upsert: same fixtureKey updates in place', async () => {
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
