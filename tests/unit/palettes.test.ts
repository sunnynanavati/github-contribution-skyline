import { describe, expect, it } from 'vitest';

import { resolvePalette, SKYLINE_PALETTES, validatePalette } from '../../src/core/palettes';

describe('palettes', () => {
  it('provides six complete built-in palettes', () => {
    expect(Object.keys(SKYLINE_PALETTES)).toEqual(['green', 'red', 'mono', 'orange', 'blue', 'yellow']);
    for (const palette of Object.values(SKYLINE_PALETTES)) expect(palette.levels).toHaveLength(5);
  });

  it('resolves named and custom palettes', () => {
    expect(resolvePalette('red')).toBe(SKYLINE_PALETTES.red);
    expect(validatePalette({ ...SKYLINE_PALETTES.blue, name: 'custom' }).name).toBe('custom');
  });

  it('rejects malformed custom colors', () => {
    expect(() => validatePalette({ ...SKYLINE_PALETTES.blue, surface: 'blue' })).toThrow('six-digit hexadecimal');
    expect(() => resolvePalette('missing' as never)).toThrow('Unknown skyline palette');
  });

  it('keeps text and focus colors at WCAG AA contrast against every surface', () => {
    for (const palette of Object.values(SKYLINE_PALETTES)) {
      expect(contrast(palette.surface, palette.ink)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.surface, palette.muted)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.surface, palette.focus)).toBeGreaterThanOrEqual(3);
    }
  });
});

function contrast(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
      .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
