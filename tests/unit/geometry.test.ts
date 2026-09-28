import { describe, expect, it } from 'vitest';

import { animationStep } from '../../src/core/animation';
import { calculateBuildingHeight } from '../../src/core/buildings';
import { calculateGeometry, clampTooltipPosition, flatCorners, isoPoint } from '../../src/core/geometry';

describe('geometry and animation', () => {
  it('fits desktop and compact viewports without negative cell sizes', () => {
    const desktop = calculateGeometry(1180, 620, 53);
    const mobile = calculateGeometry(360, 450, 53);
    expect(desktop.compact).toBe(false);
    expect(mobile.compact).toBe(true);
    expect(mobile.flatCell).toBeGreaterThanOrEqual(4);
    expect(desktop.flatLeft).toBeGreaterThanOrEqual(0);
  });

  it('returns stable isometric and flat points', () => {
    const geometry = calculateGeometry(1000, 600, 53);
    expect(isoPoint(0, 0, 0, geometry)).toEqual({ x: geometry.isoCenterX, y: geometry.isoCenterY });
    expect(flatCorners(0, 0, geometry)).toHaveLength(4);
  });

  it('settles an event-driven transition', () => {
    let value = 0;
    for (let frame = 0; frame < 100; frame += 1) value = animationStep(value, 1, 16.67);
    expect(value).toBe(1);
  });

  it('scales building heights and clamps tooltips inside the surface', () => {
    expect(calculateBuildingHeight(4, 1.4, false)).toBeCloseTo(109.2);
    expect(calculateBuildingHeight(0, 2, false)).toBe(2.2);
    expect(clampTooltipPosition(-20, 900, 500, 420)).toEqual({ x: 80, y: 404 });
  });
});
