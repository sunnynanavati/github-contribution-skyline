import type { CSSProperties } from 'react';

export type DemoBackground = 'dark' | 'light';
export const BACKGROUND_STORAGE_KEY = 'skyline-demo-background';

// Demo-only neutrals. Contribution ramps, buildings, and motion are untouched.
export const DEMO_BACKGROUNDS = {
  dark: {
    page: '#080909', surface: '#111212', elevated: '#1a1c1b',
    ink: '#eef0ee', muted: '#9ba09d', border: '#3a3d3b',
    separator: '#2b2d2c', frame: '#1d1f1e', hover: '#242625',
    selected: '#929994', focus: '#c3cdc6', shadow: 'rgb(0 0 0 / .34)',
  },
  light: {
    page: '#e9ebe7', surface: '#f5f6f2', elevated: '#eff1ec',
    ink: '#242b26', muted: '#5e6861', border: '#c5cbc3',
    separator: '#d3d8d0', frame: '#d8dcd4', hover: '#e0e5dc',
    selected: '#68756b', focus: '#365e46', shadow: 'rgb(29 43 33 / .10)',
  },
} as const;

export function readDemoBackground(): DemoBackground {
  try { return localStorage.getItem(BACKGROUND_STORAGE_KEY) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

export function backgroundProperties(background: DemoBackground): CSSProperties {
  return Object.fromEntries(Object.entries(DEMO_BACKGROUNDS[background]).map(([role, value]) => [`--demo-${role}`, value]));
}
