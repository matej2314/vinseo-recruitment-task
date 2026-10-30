import { MockMeetingSourceAdapter } from './mock-meeting-source.adapter.js';

describe('MockMeetingSourceAdapter', () => {
  const adapter = new MockMeetingSourceAdapter();

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
