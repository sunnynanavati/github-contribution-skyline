import { describe, expect, it } from 'vitest';
import { calculateSkylineGeometry, splatCamera } from '../../src/core/animation';
import { calculateBuildingHeight } from '../../src/core/buildings';
import { normalizeContributions } from '../../src/core/data';
import { SKYLINE_PALETTES } from '../../src/core/palettes';
import { SkylineScene } from '../../src/core/SkylineScene';

describe('responsive city proportions', () => {
  it('scales height and footprint together, independent of card shape or compact breakpoint', () => {
    for (const weeks of [1, 13, 52, 53, 54]) for (const heightScale of [.4, 1, 1.4, 2]) {
      const reference = calculateSkylineGeometry(1118, 620, weeks, heightScale);
      for (const [width, height] of [[280, 300], [350, 310], [375, 520], [638, 400], [640, 400], [760, 400], [1118, 480]]) {
        const g = calculateSkylineGeometry(width!, height!, weeks, heightScale);
        for (const count of [0, 1, 13, 14, 15, 100]) {
          const modelHeight = calculateBuildingHeight(count, 100, heightScale, false);
          expect(modelHeight * g.elevationScale / g.isoW).toBeCloseTo(modelHeight * reference.elevationScale / reference.isoW, 10);
        }
        const camera = splatCamera(800, g, weeks);
        expect(camera.xx).toBe(g.flatCell);
        expect(camera.xy).toBeCloseTo(0);
        expect(camera.yy).toBe(g.flatCell);
        expect(camera.z).toBe(0);
      }
    }
  });

  it('does not jump in scale as a container crosses the compact boundary', () => {
    const a = calculateSkylineGeometry(639, 520, 53, 2);
    const b = calculateSkylineGeometry(640, 520, 53, 2);
    expect(Math.abs(a.elevationScale - b.elevationScale)).toBeLessThan(.003);
    expect(Math.abs(a.isoCenterY - b.isoCenterY)).toBeLessThan(.3);
  });

  it('contains dense tall buildings and landmarks throughout the splat at phone sizes', () => {
    // A maximum-height building on every day is the worst-case roof envelope.
    const grid = normalizeContributions(Array.from({ length: 366 }, (_, i) => ({
      date: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10), count: 100,
    })));
    for (const [width, height] of [[280, 300], [350, 310], [375, 520], [760, 360]]) for (const detail of [false, true]) {
      const g = calculateSkylineGeometry(width!, height!, grid.weeks, 2);
      const scene = new SkylineScene(grid, g, SKYLINE_PALETTES.red, 2, detail);
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      const point = (x: number, y: number) => {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      };
      const noop = () => {};
      const context = { moveTo: point, lineTo: point, beginPath: noop, closePath: noop, fill: noop, stroke: noop } as unknown as CanvasRenderingContext2D;
      for (let time = 0; time <= 800; time += 20) scene.draw(context, time);
      expect(left).toBeGreaterThanOrEqual(0); expect(right).toBeLessThanOrEqual(width!);
      expect(top).toBeGreaterThanOrEqual(40); expect(bottom).toBeLessThanOrEqual(height! - 20);
    }
  }, 20_000);
});
