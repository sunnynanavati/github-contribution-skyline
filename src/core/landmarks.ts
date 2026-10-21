import { calculateBuildingHeight, maximumContributionCount } from './buildings.js';
import type { ContributionGrid, NormalizedContributionDay } from './types.js';
import { buildings, type Building, type LandmarkId } from './landmark-models.js';

export interface Landmark { index: number; model: Building; heightRatio: number; }

function hash(date: string): number {
  let value = 2166136261;
  for (let i = 0;i < date.length;i++) value = Math.imul(value ^ date.charCodeAt(i), 16777619);
  return (value >>> 0) / 4294967295;
}

/** Count-based selection, independent of color levels, theme, and viewport size. */
export function selectLandmarks(grid: ContributionGrid): Landmark[] {
  const maximum = maximumContributionCount(grid.days);
  const active = grid.days.filter(day => day.count > 0);
  if (maximum < 4 || !active.length) return [];
  const sortedCounts = active.map(day => day.count).sort((a, b) => a - b);
  const upperQuartile = sortedCounts[Math.floor((sortedCounts.length - 1) * .75)]!;
  const tallest = calculateBuildingHeight(maximum, maximum, 1, false);
  const candidates = grid.days.map((day, index) => ({
    day, index,
    heightRatio: calculateBuildingHeight(day.count, maximum, 1, false) / tallest,
  })).filter(({ day, heightRatio }) => day.count >= Math.max(4, upperQuartile) && heightRatio >= .48);
  const budget = Math.min(28, Math.max(1, Math.round(active.length * .09)), Math.ceil(candidates.length * .8));
  const selected: typeof candidates = [];
  const distance = (a: NormalizedContributionDay, b: NormalizedContributionDay) =>
    Math.hypot(a.weekIndex - b.weekIndex, a.weekday - b.weekday);

  while (selected.length < budget) {
    let winner: typeof candidates[number] | undefined;
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      if (selected.includes(candidate)) continue;
      const nearest = selected.length ? Math.min(...selected.map(other => distance(candidate.day, other.day))) : 12;
      // Landmarks cannot occupy neighboring cells. Prefer different districts,
      // while keeping the very highest contribution days in contention.
      if (nearest < Math.sqrt(5)) continue;
      const score = candidate.heightRatio * .52 + Math.min(nearest / 12, 1) * .34
        + hash(candidate.day.date) * .10 + candidate.day.weekday / 6 * .04;
      if (score > bestScore) { winner = candidate; bestScore = score; }
    }
    if (!winner) break;
    selected.push(winner);
  }

  // Taller, narrower crowns belong on the largest days. The less slender
  // pyramid/lantern shapes can also suit the lower end of the eligible range.
  selected.sort((a, b) => b.heightRatio - a.heightRatio || a.day.date.localeCompare(b.day.date));
  const preference: LandmarkId[] = ['deco', 'faceted', 'blade', 'pyramid', 'lantern'];
  const minimum: Record<LandmarkId, number> = { deco: .62, faceted: .54, blade: .50, pyramid: .48, lantern: .48 };
  const usage = new Map<LandmarkId, number>();
  const landmarks = selected.map(candidate => {
    const eligible = preference.filter(id => candidate.heightRatio >= minimum[id]);
    eligible.sort((a, b) => (usage.get(a) ?? 0) - (usage.get(b) ?? 0));
    const id = eligible[0]!;
    usage.set(id, (usage.get(id) ?? 0) + 1);
    return { index: candidate.index, heightRatio: candidate.heightRatio, model: buildings.find(building => building.id === id)! };
  });

  // Emphasize two additional tall sites with Deco crowns, without changing heights.
  // Preserve their count-derived height, spacing, and the other design families.
  const deco = buildings.find(building => building.id === 'deco')!;
  let addedNeedles = 0;
  for (const landmark of landmarks) {
    const id = landmark.model.id;
    if (id === 'deco' || landmark.heightRatio < .58 || (usage.get(id) ?? 0) <= 1) continue;
    landmark.model = deco;
    usage.set(id, usage.get(id)! - 1);
    if (++addedNeedles === 2) break;
  }
  return landmarks;
}
