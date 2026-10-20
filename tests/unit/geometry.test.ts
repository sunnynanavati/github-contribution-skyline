import { describe, expect, it } from 'vitest';

import { SplatPlayhead } from '../../src/core/animation';
import { calculateBuildingHeight } from '../../src/core/buildings';
import { calculateGeometry, clampTooltipPosition } from '../../src/core/geometry';

describe('geometry and animation', () => {
  it('fits desktop and compact viewports without negative cell sizes', () => {
    const desktop = calculateGeometry(1180, 620, 53);
    const mobile = calculateGeometry(360, 450, 53);
    expect(desktop.compact).toBe(false);
    expect(mobile.compact).toBe(true);
    expect(mobile.flatCell).toBeGreaterThanOrEqual(4);
    expect(desktop.flatLeft).toBeGreaterThanOrEqual(0);
  });

  it('settles an event-driven transition', () => {
    const clock = new SplatPlayhead();
    clock.retarget(clock.duration);
    for (let frame = 0; frame < 100; frame += 1) clock.advance(16.67);
    expect(clock.time).toBe(clock.duration);
    expect(clock.settled).toBe(true);
  });

  it('scales building heights and clamps tooltips inside the surface', () => {
    expect(calculateBuildingHeight(4, 4, 1.4, false)).toBeCloseTo(109.2);
    expect(calculateBuildingHeight(0, 4, 2, false)).toBe(2.2);
    expect(clampTooltipPosition(-20, 900, 500, 420)).toEqual({ x: 10, y: 370 });
    expect(clampTooltipPosition(490, 200, 500, 420, 280, 40)).toEqual({ x: 210, y: 148 });
    expect(clampTooltipPosition(20, 15, 500, 420, 280, 40)).toEqual({ x: 10, y: 27 });
  });
});
