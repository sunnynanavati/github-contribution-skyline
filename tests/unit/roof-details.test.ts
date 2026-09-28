import { describe, expect, it } from 'vitest';

import { hasRoofDetail, roofStyleFor } from '../../src/core/roof-details';

describe('roof details', () => {
  it('decorates a stable 20–30% subset of tall buildings', () => {
    const selected: Array<[number, number]> = [];

    for (let column = 0; column < 54; column += 1) {
      for (let row = 0; row < 7; row += 1) {
        if (hasRoofDetail(column, row, 4)) selected.push([column, row]);
      }
    }

    const ratio = selected.length / (54 * 7);
    expect(ratio).toBeGreaterThanOrEqual(0.2);
    expect(ratio).toBeLessThanOrEqual(0.3);
    expect(selected.every(([column, row]) => hasRoofDetail(column, row, 4))).toBe(true);
  });

  it('never decorates low-rise buildings', () => {
    for (let column = 0; column < 54; column += 1) {
      for (let row = 0; row < 7; row += 1) {
        expect(hasRoofDetail(column, row, 2)).toBe(false);
      }
    }
  });

  it('keeps true antenna roofs rare', () => {
    const selectedStyles = Array.from({ length: 54 }, (_, column) =>
      Array.from({ length: 7 }, (_, row) => ({ column, row })),
    ).flat()
      .filter(({ column, row }) => hasRoofDetail(column, row, 4))
      .map(({ column, row }) => roofStyleFor(column, row));

    const antennas = selectedStyles.filter((style) => style === 'antenna').length;
    expect(antennas / selectedStyles.length).toBeLessThan(0.15);
  });
});
