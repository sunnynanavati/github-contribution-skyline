import type { ContributionDay } from '../../src/core/types';

function random(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function makeFixture(): ContributionDay[] {
  const next = random(20260926);
  const end = Date.UTC(2026, 8, 26);
  return Array.from({ length: 365 }, (_, index) => {
    const dateValue = end - (364 - index) * 86_400_000;
    const day = new Date(dateValue).getUTCDay();
    const seasonal = Math.sin(index / 18) * 3 + (index > 225 && index < 285 ? 5 : 0);
    const count = Math.max(0, Math.round(next() * 16 + seasonal - (day === 0 || day === 6 ? 4 : 0)));
    return { date: new Date(dateValue).toISOString().slice(0, 10), count };
  });
}
