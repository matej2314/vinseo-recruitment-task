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
