import { afterEach, describe, expect, it, vi } from 'vitest';
import { BACKGROUND_STORAGE_KEY, DEMO_BACKGROUNDS, backgroundProperties, readDemoBackground } from '../../demo/src/backgrounds';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('demo backgrounds', () => {
  it('defaults to dark and accepts only a saved light preference', () => {
    expect(readDemoBackground()).toBe('dark');
    localStorage.setItem(BACKGROUND_STORAGE_KEY, 'light');
    expect(readDemoBackground()).toBe('light');
    localStorage.setItem(BACKGROUND_STORAGE_KEY, 'invalid');
    expect(readDemoBackground()).toBe('dark');
  });

  it('works when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    expect(readDemoBackground()).toBe('dark');
  });

  it('uses the same neutral surface for the page and component, without contribution ramps', () => {
    for (const background of ['dark', 'light'] as const) {
      expect(backgroundProperties(background)).toHaveProperty('--demo-surface', DEMO_BACKGROUNDS[background].surface);
      expect(DEMO_BACKGROUNDS[background]).not.toHaveProperty('levels');
    }
  });

  it('keeps labels, icons, selected borders, and focus readable on both backgrounds', () => {
    const luminance = (hex: string) => {
      const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
      return channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722;
    };
    const contrast = (a: string, b: string) => {
      const first = luminance(a), second = luminance(b);
      return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
    };
    for (const theme of Object.values(DEMO_BACKGROUNDS)) {
      for (const surface of [theme.page, theme.surface, theme.elevated, theme.hover]) {
        expect(contrast(theme.ink, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(theme.muted, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(theme.focus, surface)).toBeGreaterThanOrEqual(3);
      }
      expect(contrast(theme.selected, theme.hover)).toBeGreaterThanOrEqual(3);
    }
  });
});
