import { vi } from 'vitest';

export const context2d = {
  setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(),
  beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
  strokeRect: vi.fn(), fillText: vi.fn(),
  fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '',
} as unknown as CanvasRenderingContext2D;

export function installDomMocks(): void {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context2d);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 900, height: 520, top: 0, left: 0, right: 900, bottom: 520, x: 0, y: 0, toJSON() {},
  });
}
