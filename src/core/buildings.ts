import type { ContributionDay } from './types';
import { SKYLINE_DEFAULTS } from './defaults';

const EMPTY_HEIGHT = 2.2;

/** Compute once per data change, never per building or animation frame. */
export function maximumContributionCount(days: readonly Pick<ContributionDay, 'count'>[]): number {
  let maximum = 0;
  for (const day of days) maximum = Math.max(maximum, day.count);
  return maximum;
}

/** Color levels stay discrete; body height follows the exact relative count. */
export function calculateBuildingHeight(count: number, maxCount: number, heightScale: number, compact: boolean): number {
  if (count <= 0 || maxCount <= 0) return EMPTY_HEIGHT;
  const maximumHeight = (compact ? 66 : 78) * heightScale;
  const minimumHeight = maximumHeight * SKYLINE_DEFAULTS.minimumHeight;
  const relativeCount = Math.min(1, count / maxCount);
  // Lift the middle of a real, uneven calendar without returning to color
  // buckets. This monotone curve keeps every distinct count distinct, retains
  // the busiest-day cap, and is invariant when all counts are multiplied.
  const heightRatio = relativeCount ** SKYLINE_DEFAULTS.heightCurve;
  return minimumHeight + (maximumHeight - minimumHeight) * heightRatio;
}
