import type { CustomSkylinePalette, SkylinePaletteName } from './types';

export const SKYLINE_PALETTES: Readonly<Record<SkylinePaletteName, CustomSkylinePalette>> = {
  green: {
    name: 'green', label: 'GitHub green', surface: '#fbfcfb', elevated: '#f5f7f5', ink: '#172019', muted: '#667069',
    border: '#d5ddd7', grid: '#e2e7e3', focus: '#268342', levels: ['#e5eae6', '#9be9a8', '#40c463', '#30a14e', '#216e39'], texture: 'none',
  },
  red: {
    name: 'red', label: 'Signal red', surface: '#1b080b', elevated: '#260d11', ink: '#ffecee', muted: '#c58f94',
    border: '#542127', grid: '#341014', focus: '#ff6568', levels: ['#351115', '#712128', '#a9333a', '#e1494d', '#ff5b5f'], texture: 'diagonal',
  },
  mono: {
    name: 'mono', label: 'Monochrome', surface: '#111213', elevated: '#1a1b1d', ink: '#f4f4f2', muted: '#a5a8ac',
    border: '#414347', grid: '#282a2d', focus: '#d7d9dc', levels: ['#282a2d', '#55585d', '#858a90', '#c0c4c8', '#f1f2ef'], texture: 'none',
  },
  orange: {
    name: 'orange', label: 'Ember orange', surface: '#1d0f08', elevated: '#28140a', ink: '#fff0e6', muted: '#c79a7d',
    border: '#56301d', grid: '#35190c', focus: '#ff9e48', levels: ['#37190b', '#753313', '#ac4c1a', '#e87324', '#ffad4a'], texture: 'none',
  },
  blue: {
    name: 'blue', label: 'Ocean blue', surface: '#071522', elevated: '#0b1d2c', ink: '#e9f6ff', muted: '#95b4c7',
    border: '#21435b', grid: '#102b3f', focus: '#58b8eb', levels: ['#102a3d', '#185176', '#207caf', '#3aa7df', '#8ad9ff'], texture: 'none',
  },
  yellow: {
    name: 'yellow', label: 'Solar yellow', surface: '#191507', elevated: '#221d09', ink: '#fff9dc', muted: '#c2b477',
    border: '#514518', grid: '#302807', focus: '#f1cd3f', levels: ['#322909', '#70590a', '#a98510', '#dcb31c', '#ffe36b'], texture: 'none',
  },
};

const colorPattern = /^#[\da-f]{6}$/i;

export function validatePalette(palette: CustomSkylinePalette): CustomSkylinePalette {
  if (!palette.name.trim() || !palette.label.trim()) throw new Error('A custom palette requires a name and label.');
  const colors = [palette.surface, palette.elevated, palette.ink, palette.muted, palette.border, palette.grid, palette.focus, ...palette.levels];
  if (palette.levels.length !== 5 || colors.some((color) => !colorPattern.test(color))) {
    throw new Error('Custom palette colors must be six-digit hexadecimal values and levels must contain exactly five colors.');
  }
  return { ...palette, levels: [...palette.levels] as CustomSkylinePalette['levels'], texture: palette.texture ?? 'none' };
}

export function resolvePalette(palette: SkylinePaletteName | CustomSkylinePalette | undefined): CustomSkylinePalette {
  if (!palette) return SKYLINE_PALETTES.green;
  if (typeof palette === 'string') {
    const resolved = SKYLINE_PALETTES[palette];
    if (!resolved) throw new Error(`Unknown skyline palette: ${palette}`);
    return resolved;
  }
  return validatePalette(palette);
}
