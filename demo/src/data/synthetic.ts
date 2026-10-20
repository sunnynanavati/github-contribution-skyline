import type { ContributionDay } from '../../../src/core/types';

/** Illustrative data only. Never derived from a GitHub account or API response. */
export function createDemoContributions(): ContributionDay[] {
  const start = Date.UTC(2025, 0, 5);
  return Array.from({ length: 371 }, (_, index) => {
    const wave = (Math.sin(index / 19) + 1) / 2;
    const variation = ((index * 37 + 11) % 101) / 100;
    const count = index % 5 === 0 ? 0 : Math.round(1 + 29 * wave * variation);
    return { date: new Date(start + index * 86_400_000).toISOString().slice(0, 10), count };
  });
}
