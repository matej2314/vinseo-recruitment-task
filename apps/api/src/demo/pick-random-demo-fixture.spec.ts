import {
  DEMO_FIXTURE_KEYS,
  pickRandomDemoFixtureKey,
} from '@vinseo/contracts';

describe('pickRandomDemoFixtureKey', () => {
  it('maps 0 → first key and ~1 → last key', () => {
    expect(pickRandomDemoFixtureKey(() => 0)).toBe(DEMO_FIXTURE_KEYS[0]);
    expect(pickRandomDemoFixtureKey(() => 0.999)).toBe(
      DEMO_FIXTURE_KEYS[DEMO_FIXTURE_KEYS.length - 1],
    );
  });
});
