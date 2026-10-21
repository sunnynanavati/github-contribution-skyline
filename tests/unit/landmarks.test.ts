import { describe, expect, it } from 'vitest';
import { createDemoContributions } from '../../demo/src/data/synthetic';
import { normalizeContributions } from '../../src/core/data';
import { calculateSkylineGeometry } from '../../src/core/animation';
import { buildings, approvedIds } from '../../src/core/landmark-models';
import { selectLandmarks } from '../../src/core/landmarks';
import { SkylineScene } from '../../src/core/SkylineScene';
import { SKYLINE_PALETTES } from '../../src/core/palettes';

const days = createDemoContributions();
const dense = days.map((day, i) => ({ ...day, count: 12 + i * 17 % 49 }));
const sparse = days.map((day, i) => ({ ...day, count: i % 31 === 0 ? i % 17 + 1 : 0 }));
const outlier = days.map((day, i) => ({ ...day, count: i === days.length - 1 ? 27 : 9 + i % 4 }));

describe('architectural landmark selection', () => {
  it.each([days, dense, sparse, outlier].map(contributions => ({ contributions })))('selects bounded, spaced, tall days deterministically', ({ contributions }) => {
    const grid = normalizeContributions(contributions);
    const landmarks = selectLandmarks(grid);
    const active = grid.days.filter(day => day.count > 0);
    const counts = active.map(day => day.count).sort((a, b) => a - b);
    const quarter = counts[Math.floor((counts.length - 1) * .75)]!;
    expect(landmarks.length).toBeLessThanOrEqual(Math.min(28, Math.max(1, Math.round(active.length * .09))));
    expect(landmarks).toEqual(selectLandmarks(grid));
    expect(landmarks).toEqual(selectLandmarks(normalizeContributions([...contributions].reverse())));
    expect(landmarks).toEqual(selectLandmarks(normalizeContributions(contributions.map(day => ({ ...day, level: 1 })))));
    for (const landmark of landmarks) {
      expect(landmark.heightRatio).toBeGreaterThanOrEqual(landmark.model.id === 'deco' ? .58 : .48);
      const day = grid.days[landmark.index]!;
      expect(day.count).toBeGreaterThanOrEqual(Math.max(4, quarter));
      expect(approvedIds).toContain(landmark.model.id);
      for (const other of landmarks) if (other !== landmark) {
        const neighbor = grid.days[other.index]!;
        expect(Math.hypot(day.weekIndex - neighbor.weekIndex, day.weekday - neighbor.weekday)).toBeGreaterThanOrEqual(Math.sqrt(5));
      }
    }
  });

  it('adds two high-rise Deco accents without losing the other families', () => {
    const landmarks = selectLandmarks(normalizeContributions(outlier));
    expect(landmarks.filter(landmark => landmark.model.id === 'deco')).toHaveLength(3);
    expect(new Set(landmarks.map(landmark => landmark.model.id))).toEqual(new Set(approvedIds));
  });

  it('never invents landmarks for empty or low-activity calendars', () => {
    for (const input of [[], days.map(day => ({ ...day, count: 0 })), days.map(day => ({ ...day, count: 3 }))]) {
      expect(selectLandmarks(normalizeContributions(input))).toEqual([]);
    }
    expect(selectLandmarks(normalizeContributions([{ date: '2026-01-01', count: 4 }]))).toHaveLength(1);
  });
});

describe('architectural geometry', () => {
  it('contains only the five approved, finite, single-cell models', () => {
    expect(buildings.map(model => model.id)).toEqual(approvedIds);
    for (const model of buildings) {
      expect(model.faces.length).toBeGreaterThan(5);
      for (const face of model.faces) {
        expect(face.vertices.length).toBeGreaterThanOrEqual(3);
        for (const [x, y, z] of face.vertices) {
          expect([x, y, z].every(Number.isFinite)).toBe(true);
          expect(Math.abs(x)).toBeLessThanOrEqual(.5);
          expect(Math.abs(y)).toBeLessThanOrEqual(.5);
          expect(z).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('flattens detail on/off to identical graph cells at every palette and size', () => {
    const grid = normalizeContributions(dense);
    for (const [width, height] of [[350, 460], [1120, 620]]) for (const palette of Object.values(SKYLINE_PALETTES)) {
      const geometry = calculateSkylineGeometry(width!, height!, grid.weeks, 2);
      const draw = (detail: boolean) => {
        const points: unknown[] = [];
        const context = { globalAlpha: 1, fillStyle: '', beginPath() {}, closePath() {},
          moveTo(x: number, y: number) { points.push(['move', x, y]); },
          lineTo(x: number, y: number) { points.push(['line', x, y]); },
          fill() { points.push(['fill', this.fillStyle, this.globalAlpha]); },
        } as CanvasRenderingContext2D;
        new SkylineScene(grid, geometry, palette, 2, detail).draw(context, 800);
        return points;
      };
      expect(draw(true)).toEqual(draw(false));
    }
  });
});
