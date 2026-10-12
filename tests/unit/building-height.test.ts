import { describe, expect, it } from 'vitest';
import { BloomScene } from '../../demo/src/motion/BloomScene';
import { calculateBuildingHeight, drawBuilding, maximumContributionCount } from '../../src/core/buildings';
import { normalizeContributions } from '../../src/core/data';
import { calculateGeometry, isoPoint } from '../../src/core/geometry';
import { SKYLINE_PALETTES } from '../../src/core/palettes';
import { SplatMorph } from '../../src/core/SplatMorph';

function capture() {
  const polygons: { points: number[]; color: string }[] = [];
  let points: number[] = [];
  const context = {
    globalAlpha: 1, fillStyle: '',
    beginPath: () => { points = []; },
    moveTo: (x: number, y: number) => points.push(x, y),
    lineTo: (x: number, y: number) => points.push(x, y),
    closePath: () => {},
    fill: () => polygons.push({ points: [...points], color: String(context.fillStyle) }),
  } as unknown as CanvasRenderingContext2D;
  return { context, polygons };
}

describe('continuous contribution heights', () => {
  it('distinguishes adjacent daily counts throughout the height range', () => {
    for (const compact of [false, true]) for (const scale of [0.4, 1, 2]) {
      let previous = calculateBuildingHeight(0, 30, scale, compact);
      for (let count = 1; count <= 30; count += 1) {
        const height = calculateBuildingHeight(count, 30, scale, compact);
        expect(height).toBeGreaterThan(previous);
        previous = height;
      }
    }
  });

  it('preserves proportions for an account with ten times as many contributions', () => {
    for (const count of [0, 1, 13, 14, 15, 30]) {
      expect(calculateBuildingHeight(count * 10, 300, 1, false))
        .toBeCloseTo(calculateBuildingHeight(count, 30, 1, false), 10);
    }
  });

  it('keeps the busiest day at the existing limit, including large outliers', () => {
    for (const maximum of [1, 15, 300, 1_000_000]) for (const compact of [false, true]) {
      const limit = compact ? 66 : 78;
      expect(calculateBuildingHeight(maximum, maximum, 1, compact)).toBe(limit);
      expect(calculateBuildingHeight(maximum, maximum, 2, compact)).toBe(limit * 2);
      expect(calculateBuildingHeight(maximum * 2, maximum, 1, compact)).toBe(limit);
    }
    expect(calculateBuildingHeight(1, 1_000_000, 1, false)).toBeGreaterThan(2.2);
  });

  it('handles empty, zero, missing, and duplicate days without inventing counts', () => {
    expect(maximumContributionCount([])).toBe(0);
    expect(calculateBuildingHeight(0, 0, 1, false)).toBe(2.2);
    expect(calculateBuildingHeight(0, 15, 2, true)).toBe(2.2);
    const grid = normalizeContributions([
      { date: '2026-09-27', count: 13, level: 3 },
      { date: '2026-09-29', count: 14, level: 3 },
      { date: '2026-09-29', count: 1, level: 3 },
    ]);
    expect(maximumContributionCount(grid.days)).toBe(15);
    expect(grid.days.find(day => day.date === '2026-09-28')?.count).toBe(0);
  });

  it('renders count-based heights consistently in the component and motion previews', () => {
    const grid = normalizeContributions([
      { date: '2026-09-27', count: 13, level: 3 },
      { date: '2026-09-28', count: 14, level: 3 },
      { date: '2026-09-29', count: 15, level: 3 },
      // Explicit color level must not override body height.
      { date: '2026-09-30', count: 30, level: 1 },
    ]);
    const geometry = calculateGeometry(1118, 620, grid.weeks);
    const palette = SKYLINE_PALETTES.red;
    const scene = new BloomScene(grid, geometry, palette, 1, false);
    const baseline = new SplatMorph(grid, geometry, palette, 1, false);
    const frames = [capture(), capture(), capture(), capture(), capture()];
    for (const day of grid.days) drawBuilding(frames[0]!.context, day, {
      progress: 0, heightScale: 1, buildingDetail: false, palette, geometry, maxCount: 30,
    });
    scene.draw(frames[1]!.context, 0, 'vertical');
    scene.draw(frames[2]!.context, 0, 'elastic');
    scene.draw(frames[3]!.context, 0, 'baseline');
    baseline.draw(frames[4]!.context, 0);
    for (const frame of frames) {
      const heights = grid.days.map(day => {
        const base = isoPoint(day.weekIndex + 0.1, day.weekday + 0.1, 0, geometry);
        const top = frame.polygons.find(polygon => polygon.color === palette.levels[day.level]
          && Math.abs(polygon.points[0]! - base.x) < 0.0001);
        expect(top).toBeDefined();
        return base.y - top!.points[1]!;
      });
      expect(heights[1]).toBeGreaterThan(heights[0]!);
      expect(heights[2]).toBeGreaterThan(heights[1]!);
      expect(heights[3]).toBeCloseTo(78, 4);
      for (let index = 0; index < heights.length; index += 1) {
        expect(heights[index]).toBeCloseTo(calculateBuildingHeight(grid.days[index]!.count, 30, 1, false), 4);
      }
    }
  });
});
