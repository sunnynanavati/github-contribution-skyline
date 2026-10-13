import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { createSkyline } from '../../src/core/SkylineController';
import { deriveContributionLevels, fromGitHubContributionCalendar, normalizeContributions } from '../../src/core/data';
import { resolvePalette, SKYLINE_PALETTES, validatePalette } from '../../src/core/palettes';
import { SkylineRenderer } from '../../src/core/SkylineRenderer';
import { calculateSkylineGeometry } from '../../src/core/animation';
import { GitHubSkyline } from '../../src/react';
import { defineGitHubSkyline } from '../../src/element';
import { context2d, installDomMocks } from './setup';

const days = [{ date: '2026-09-01', count: 5 }, { date: '2026-09-03', count: 7 }];
beforeEach(() => {
  for (const value of Object.values(context2d)) if (vi.isMockFunction(value)) value.mockReset();
  installDomMocks();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('rejects unsafe counts, malformed adapters, inherited levels, and invalid week starts', () => {
  for (const count of [NaN, Infinity, -1, .5, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => normalizeContributions([{ date: days[0]!.date, count }])).toThrow();
    expect(() => deriveContributionLevels([count])).toThrow();
  }
  expect(() => normalizeContributions([null as never])).toThrow('day object');
  expect(() => normalizeContributions(days, 7 as never)).toThrow('weekStartsOn');
  expect(() => normalizeContributions([{ ...days[0]!, count: Number.MAX_SAFE_INTEGER }, days[1]!])).toThrow('safe integer');
  expect(() => fromGitHubContributionCalendar({ weeks: [null as never] })).toThrow('week');
  expect(() => fromGitHubContributionCalendar({ weeks: [{ contributionDays: [{ date: days[0]!.date, contributionCount: 2, contributionLevel: '__proto__' }] }] })).toThrow('level');
  expect(() => fromGitHubContributionCalendar({ weeks: [{ contributionDays: [{ date: '2026-02-30', contributionCount: 1 }] }] })).toThrow('date');
  expect(normalizeContributions([{ date: '2000-01-01', count: 1 }, { date: '2000-12-31', count: 1 }]).weeks).toBe(54);
});

it('rejects malformed themes and prototype-property names, and freezes built-ins', () => {
  for (const name of ['__proto__', 'constructor', 'toString']) expect(() => resolvePalette(name as never)).toThrow('Unknown');
  expect(() => validatePalette(null as never)).toThrow('name');
  expect(() => validatePalette({ ...SKYLINE_PALETTES.red, levels: null as never })).toThrow('levels');
  expect(() => validatePalette({ ...SKYLINE_PALETTES.red, texture: 'url(x)' as never })).toThrow('texture');
  expect(Object.isFrozen(SKYLINE_PALETTES.red.levels)).toBe(true);
});

it('displays recoverable configuration/data errors instead of throwing through React', () => {
  const host = document.createElement('div');
  const controller = createSkyline(host, { contributions: days, palette: '__proto__' as never });
  expect(host.shadowRoot!.querySelector('.state')!.textContent).toContain('Invalid');
  controller.update({ palette: 'red', locale: 'bad_locale' });
  expect(host.shadowRoot!.querySelector<HTMLElement>('.state')!.hidden).toBe(false);
  controller.update({ locale: 'en-US' });
  expect(host.shadowRoot!.querySelector<HTMLElement>('.state')!.hidden).toBe(true);
  expect(host.shadowRoot!.querySelectorAll('tbody tr')).toHaveLength(7);
  controller.update({ contributions: [] });
  expect(host.shadowRoot!.querySelector('.state')!.textContent).toContain('No contributions');
  controller.destroy();
});

it('isolates controls from graph keys and safely handles unusual custom names', () => {
  const host = document.createElement('div');
  const controller = createSkyline(host, { contributions: days, variant: 'card', reducedMotion: true,
    palette: { ...SKYLINE_PALETTES.red, name: 'custom"][broken' } });
  const shadow = host.shadowRoot!;
  const button = shadow.querySelector<HTMLButtonElement>('.details-toggle')!;
  button.click(); controller.setView('graph');
  const selected = shadow.querySelector<HTMLButtonElement>('[aria-checked="true"]')!;
  expect(() => selected.click()).not.toThrow();
  shadow.querySelector('input[type="range"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  expect(shadow.querySelector('#gcs-live')!.textContent).toBe('');
  controller.update({ showControls: false });
  expect(button.getAttribute('aria-expanded')).toBe('false');
  controller.update({ flattenMode: 'never' }); expect(controller.getView()).toBe('skyline');
  controller.update({ flattenMode: 'always' }); expect(controller.getView()).toBe('graph');
  controller.destroy();
});

it('stops rendering on Canvas failure, preserves accessible data, and can recover', () => {
  const host = document.createElement('div');
  const controller = createSkyline(host, { contributions: days });
  const draw = vi.spyOn(context2d, 'clearRect').mockImplementation(() => { throw new Error('driver failed'); });
  controller.setView('graph', true);
  expect(controller.isAnimating()).toBe(false);
  expect(host.shadowRoot!.querySelector('.state')!.textContent).toContain('renderer stopped');
  expect(host.shadowRoot!.querySelectorAll('tbody tr')).toHaveLength(7);
  draw.mockRestore(); controller.update({ palette: 'blue' });
  expect(host.shadowRoot!.querySelector<HTMLElement>('.state')!.hidden).toBe(true);
  controller.destroy();
});

it('does not rebuild the renderer on unrelated React renders and honors controlled inputs', () => {
  const changed = vi.fn();
  const view = render(<StrictMode><GitHubSkyline contributions={days} variant="card" heightScale={1.4} onHeightScaleChange={changed} /></StrictMode>);
  const host = view.container.firstElementChild as HTMLElement;
  const height = host.shadowRoot!.querySelector<HTMLInputElement>('input[type="range"]')!;
  act(() => { height.value = '190'; height.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(changed).toHaveBeenCalledWith(1.9);
  expect(height.value).toBe('140');
  const updates = vi.spyOn(SkylineRenderer.prototype, 'update');
  view.rerender(<StrictMode><GitHubSkyline contributions={days} variant="card" heightScale={1.4} onHeightScaleChange={changed} className="changed-host" /></StrictMode>);
  expect(updates).not.toHaveBeenCalled();
  view.rerender(<StrictMode><GitHubSkyline contributions={days} variant="card" heightScale={1.8} onHeightScaleChange={changed} /></StrictMode>);
  expect(height.value).toBe('180');
});

it('retains uncontrolled settings across parent rerenders', () => {
  const view = render(<GitHubSkyline contributions={days} variant="card" />);
  const host = view.container.firstElementChild as HTMLElement;
  const height = host.shadowRoot!.querySelector<HTMLInputElement>('input[type="range"]')!;
  act(() => { height.value = '175'; height.dispatchEvent(new Event('input', { bubbles: true })); });
  view.rerender(<GitHubSkyline contributions={days} variant="card" username="updated" />);
  expect(height.value).toBe('175');
});

it('registers multiple custom-element names safely and upgrades pre-set data', () => {
  const element = document.createElement('release-test-skyline') as HTMLElement & { contributions: typeof days };
  element.contributions = days; document.body.append(element);
  defineGitHubSkyline('release-test-skyline'); defineGitHubSkyline('release-test-skyline-alias');
  expect(element.shadowRoot!.querySelectorAll('tbody tr')).toHaveLength(7);
  element.remove(); expect(element.shadowRoot!.childElementCount).toBe(0);
});

it('pauses offscreen and hidden, resizes with a capped DPR, and finishes immediately for reduced motion', () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  const disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = disconnect; });
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const canvas = document.createElement('canvas');
  const renderer = new SkylineRenderer(canvas, document.createElement('div'), {
    grid: normalizeContributions(days), palette: SKYLINE_PALETTES.red, heightScale: 1.4,
    buildingDetail: true, transparentBackground: true, showLabels: true,
    maxDevicePixelRatio: 2, initialView: 'skyline', reducedMotion: false,
  });
  renderer.setView('graph'); expect(frames.size).toBe(1);
  renderer.setActive(false); expect(frames.size).toBe(0);
  renderer.setActive(true); expect(frames.size).toBe(1);
  visibility.mockReturnValue('hidden'); document.dispatchEvent(new Event('visibilitychange'));
  expect(frames.size).toBe(0);
  visibility.mockReturnValue('visible'); document.dispatchEvent(new Event('visibilitychange'));
  expect(frames.size).toBe(1);
  vi.stubGlobal('devicePixelRatio', 3);
  window.dispatchEvent(new Event('resize'));
  expect(canvas.width).toBe(1800); expect(canvas.height).toBe(1040);
  renderer.update({ reducedMotion: true });
  expect(renderer.getView()).toBe('graph'); expect(frames.size).toBe(0);
  renderer.destroy(); expect(disconnect).toHaveBeenCalledOnce();
  window.dispatchEvent(new Event('resize')); document.dispatchEvent(new Event('visibilitychange'));
  expect(frames.size).toBe(0);
});

it('does not reattach DPR listeners after a rendering failure during a display change', () => {
  const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => media);
  const renderer = new SkylineRenderer(document.createElement('canvas'), document.createElement('div'), {
    grid: normalizeContributions(days), palette: SKYLINE_PALETTES.red, heightScale: 1.4,
    buildingDetail: true, transparentBackground: true, showLabels: false,
    maxDevicePixelRatio: 2, initialView: 'skyline', reducedMotion: false,
  });
  const onDprChange = media.addEventListener.mock.calls[0]![1] as () => void;
  vi.spyOn(context2d, 'clearRect').mockImplementation(() => { throw new Error('lost context'); });
  onDprChange();
  expect(renderer.hasFailed()).toBe(true);
  expect(media.addEventListener).toHaveBeenCalledOnce();
  expect(media.removeEventListener).toHaveBeenCalled();
});

it('localizes graph labels and aligns weekdays with Monday-first data', () => {
  const fillText = vi.mocked(context2d.fillText); fillText.mockClear();
  const grid = normalizeContributions(days, 1);
  const renderer = new SkylineRenderer(document.createElement('canvas'), document.createElement('div'), {
    grid, palette: SKYLINE_PALETTES.red, heightScale: 1.4,
    buildingDetail: true, transparentBackground: true, showLabels: true,
    maxDevicePixelRatio: 2, initialView: 'graph', reducedMotion: true,
    locale: 'fr-FR', weekStartsOn: 1,
  });
  const geometry = calculateSkylineGeometry(900, 520, grid.weeks, 1.4);
  expect(fillText).toHaveBeenCalledWith('lun.', geometry.flatLeft - 30, geometry.flatTop + geometry.flatCell - 1);
  renderer.destroy();
});
