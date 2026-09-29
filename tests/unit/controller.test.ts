import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSkyline } from '../../src/core/SkylineController';
import { installDomMocks } from './setup';

describe('skyline controller', () => {
  beforeEach(() => installDomMocks());

  it('renders semantic data and accessible controls', () => {
    const host = document.createElement('div');
    const controller = createSkyline(host, {
      contributions: [{ date: '2026-09-26', count: 7 }],
      username: 'sunny',
      reducedMotion: true,
    });
    expect(host.shadowRoot?.querySelector('[role="region"]')?.getAttribute('aria-label')).toBe('GitHub contribution skyline');
    expect(host.shadowRoot?.querySelector('table')?.textContent).toContain('7 contributions');
    expect(host.shadowRoot?.querySelectorAll('[role="radio"]')).toHaveLength(6);
    controller.destroy();
  });

  it('defaults to a bare transparent presentation and can switch to the complete card', () => {
    const host = document.createElement('div');
    const controller = createSkyline(host, {
      contributions: [{ date: '2026-09-26', count: 7 }],
      reducedMotion: true,
    });
    const shell = host.shadowRoot!.querySelector<HTMLElement>('.shell')!;
    const details = host.shadowRoot!.querySelector<HTMLButtonElement>('.details-toggle')!;
    const legend = host.shadowRoot!.querySelector<HTMLElement>('.legend')!;

    expect(shell.dataset.variant).toBe('bare');
    expect(details.hidden).toBe(true);
    expect(legend.hidden).toBe(true);

    controller.update({ variant: 'card' });
    expect(shell.dataset.variant).toBe('card');
    expect(details.hidden).toBe(false);
    expect(legend.hidden).toBe(false);
    controller.destroy();
  });

  it('supports palette controls, settings focus, and Escape', () => {
    const host = document.createElement('div');
    const onPaletteChange = vi.fn();
    const onBuildingDetailChange = vi.fn();
    const onHeightScaleChange = vi.fn();
    const controller = createSkyline(host, {
      contributions: [{ date: '2026-09-26', count: 7 }],
      onPaletteChange,
      onBuildingDetailChange,
      onHeightScaleChange,
      reducedMotion: true,
    });
    const details = host.shadowRoot!.querySelector<HTMLButtonElement>('.details-toggle')!;
    details.click();
    expect(details.getAttribute('aria-expanded')).toBe('true');
    host.shadowRoot!.querySelector<HTMLButtonElement>('[data-palette="blue"]')!.click();
    expect(onPaletteChange).toHaveBeenCalledWith('blue');
    const selectedPalette = host.shadowRoot!.querySelector<HTMLButtonElement>('[data-palette="blue"]')!;
    selectedPalette.focus();
    selectedPalette.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(onPaletteChange).toHaveBeenLastCalledWith('yellow');
    const detail = host.shadowRoot!.querySelector<HTMLInputElement>('input[name="buildingDetail"]')!;
    detail.checked = false;
    detail.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onBuildingDetailChange).toHaveBeenCalledWith(false);
    const height = host.shadowRoot!.querySelector<HTMLInputElement>('input[name="heightScale"]')!;
    height.value = '125';
    height.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onHeightScaleChange).toHaveBeenCalledWith(1.25);
    host.shadowRoot!.querySelector('.shell')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(details.getAttribute('aria-expanded')).toBe('false');
    controller.destroy();
  });

  it('exposes immediate keyboard-safe view control', () => {
    const host = document.createElement('div');
    const controller = createSkyline(host, {
      contributions: [{ date: '2026-09-26', count: 7 }],
      reducedMotion: true,
    });
    controller.setView('graph');
    expect(controller.getView()).toBe('graph');
    expect(controller.isAnimating()).toBe(false);
    controller.destroy();
  });
});
