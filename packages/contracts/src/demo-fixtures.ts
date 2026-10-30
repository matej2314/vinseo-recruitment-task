import { asFixtureKey, type FixtureKey } from "./ids.js";

/**
 * Katalog materiału mocka DEMO/Test (K-5).
 * `fixtureKey` ≠ tożsamość wiersza Meeting - tylko treść za portem źródła.
 */
export const DEMO_FIXTURE_KEYS = [
  "demo-client-budget-pl",
  "demo-kickoff-agency-pl",
  "demo-retainer-review-pl",
  "demo-brand-lift-pl",
  "demo-seo-audit-pl",
  "demo-crisis-comms-pl",
  "demo-product-launch-pl",
  "demo-media-plan-pl",
  "demo-qbr-client-pl",
  "demo-influencer-brief-pl",
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
    throw new Error("DEMO_FIXTURE_KEYS is empty");
  }
  return asFixtureKey(key);
}
