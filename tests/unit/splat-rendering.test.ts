import { describe, expect, it } from 'vitest';
import { normalizeContributions } from '../../src/core/data';
import { calculateGeometry, flatCorners } from '../../src/core/geometry';
import { SKYLINE_PALETTES } from '../../src/core/palettes';
import { SplatMorph } from '../../src/core/SplatMorph';

function capture() {
  const polygons: number[][] = [];
  let current: number[] = [];
  const context = {
    globalAlpha: 1,
    beginPath: () => { current = []; },
    moveTo: (x: number, y: number) => current.push(x,y),
    lineTo: (x: number, y: number) => current.push(x,y),
    closePath: () => {},
    fill: () => polygons.push([...current]),
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D;
  return { context, polygons };
}

describe('solid center-out splat geometry', () => {
  it('keeps one opaque cell per day and finishes at its exact bounds', () => {
    const grid = normalizeContributions([{date:'2026-09-27', count:10, level:4}]);
    const geometry = calculateGeometry(1118,620,grid.weeks);
    const engine = new SplatMorph(grid, geometry, SKYLINE_PALETTES.red, 1, false);
    const frame = capture();
    engine.draw(frame.context, 1);
    expect(frame.polygons).toHaveLength(grid.days.length);
    const corners = flatCorners(grid.days[0]!.weekIndex,grid.days[0]!.weekday,geometry);
    const firstDay = frame.polygons.slice(0,1);
    const x = firstDay.flatMap(points => points.filter((_,index) => index%2===0));
    const y = firstDay.flatMap(points => points.filter((_,index) => index%2===1));
    expect(Math.min(...x)).toBeCloseTo(corners[0].x,3);
    expect(Math.max(...x)).toBeCloseTo(corners[1].x,3);
    expect(Math.min(...y)).toBeCloseTo(corners[0].y,3);
    expect(Math.max(...y)).toBeCloseTo(corners[3].y,3);
    expect(frame.context.globalAlpha).toBe(1);
  });

  it('is deterministic on reversal, with finite visible geometry at intermediate frames', () => {
    const grid = normalizeContributions([{date:'2026-09-27', count:10}]);
    const engine = new SplatMorph(grid,calculateGeometry(1118,620,grid.weeks),SKYLINE_PALETTES.red,1,false);
    const first = capture(); const reverse = capture();
    engine.draw(first.context,0.45);
    engine.draw(capture().context,0.8);
    engine.draw(reverse.context,0.45);
    expect(reverse.polygons).toEqual(first.polygons);
    expect(first.polygons.flat().every(Number.isFinite)).toBe(true);
    expect(first.polygons.every(points => Math.abs(points[0]!-points[2]!) > 0.1)).toBe(true);
  });
});
