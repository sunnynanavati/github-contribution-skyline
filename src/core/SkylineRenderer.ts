import { calculateSkylineGeometry, poseTimeFor, SplatPlayhead } from './animation.js';
import { SkylineScene } from './SkylineScene.js';
import { SKYLINE_DEFAULTS } from './defaults.js';
import { calculateGeometry, clamp, type SkylineGeometry } from './geometry.js';
import type { ContributionGrid, CustomSkylinePalette, NormalizedContributionDay, SkylineView } from './types.js';

export interface SkylineRendererOptions {
  grid: ContributionGrid;
  palette: CustomSkylinePalette;
  heightScale: number;
  buildingDetail: boolean;
  transparentBackground: boolean;
  showLabels: boolean;
  maxDevicePixelRatio: number;
  initialView: SkylineView;
  reducedMotion: boolean;
  locale?: string;
  weekStartsOn?: 0 | 1;
  onViewChange?: (view: SkylineView) => void;
  onError?: (error: Error) => void;
}

export class CanvasUnavailableError extends Error {}

export class SkylineRenderer {
  private readonly context: CanvasRenderingContext2D;
  private grid: ContributionGrid;
  private palette: CustomSkylinePalette;
  private heightScale: number;
  private buildingDetail: boolean;
  private transparentBackground: boolean;
  private showLabels: boolean;
  private maxDevicePixelRatio: number;
  private reducedMotion: boolean;
  private onViewChange?: (view: SkylineView) => void;
  private readonly onError?: (error: Error) => void;
  private locale: string;
  private weekStartsOn: 0 | 1;
  private labels: Array<{ text: string; x: number; y: number }> = [];
  private failed = false;
  private width = 0;
  private height = 0;
  private geometry: SkylineGeometry = calculateGeometry(1, 1, 1);
  private readonly clock = new SplatPlayhead();
  private scene: SkylineScene | null = null;
  private raf: number | null = null;
  private lastFrame = 0;
  private inView = true;
  private disposed = false;
  private ratio = 0;
  private dprMedia: MediaQueryList | null = null;
  private selectedDate: string | null = null;
  private readonly resizeObserver: ResizeObserver;
  private readonly onWindowResize = () => this.resize();
  private readonly onVisibilityChange = () => this.syncActivity();
  private readonly onDprChange = () => { this.resize(); this.watchDpr(); };

  private get active(): boolean { return !this.disposed && this.inView && document.visibilityState !== 'hidden'; }
  private get progress(): number { return this.clock.time / this.clock.duration; }

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly container: HTMLElement,
    options: SkylineRendererOptions,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new CanvasUnavailableError('Canvas 2D is unavailable.');
    this.context = context;
    this.grid = options.grid;
    this.palette = options.palette;
    this.heightScale = Number.isFinite(options.heightScale) ? clamp(options.heightScale, 0.4, 2) : SKYLINE_DEFAULTS.heightScale;
    this.buildingDetail = options.buildingDetail;
    this.transparentBackground = options.transparentBackground;
    this.showLabels = options.showLabels;
    this.maxDevicePixelRatio = Number.isFinite(options.maxDevicePixelRatio) ? clamp(options.maxDevicePixelRatio, 1, 4) : 2;
    this.reducedMotion = options.reducedMotion;
    this.onViewChange = options.onViewChange;
    this.onError = options.onError;
    this.locale = options.locale ?? 'en-US';
    this.weekStartsOn = options.weekStartsOn ?? 0;
    this.clock.seek(options.initialView === 'graph' ? this.clock.duration : 0);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    window.addEventListener('resize', this.onWindowResize, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.watchDpr();
    this.resize();
  }

  update(options: Partial<Omit<SkylineRendererOptions, 'initialView'>>): void {
    if (this.disposed) return;
    if (options.grid) this.grid = options.grid;
    if (options.palette) this.palette = options.palette;
    if (options.heightScale !== undefined) this.heightScale = Number.isFinite(options.heightScale) ? clamp(options.heightScale, 0.4, 2) : SKYLINE_DEFAULTS.heightScale;
    if (options.buildingDetail !== undefined) this.buildingDetail = options.buildingDetail;
    if (options.transparentBackground !== undefined) this.transparentBackground = options.transparentBackground;
    if (options.showLabels !== undefined) this.showLabels = options.showLabels;
    if (options.maxDevicePixelRatio !== undefined) this.maxDevicePixelRatio = Number.isFinite(options.maxDevicePixelRatio) ? clamp(options.maxDevicePixelRatio, 1, 4) : 2;
    if (options.reducedMotion !== undefined) this.reducedMotion = options.reducedMotion;
    if ('onViewChange' in options) this.onViewChange = options.onViewChange;
    if (options.locale !== undefined) this.locale = options.locale;
    if (options.weekStartsOn !== undefined) this.weekStartsOn = options.weekStartsOn;
    const finish = this.reducedMotion && !this.clock.settled;
    if (finish) { this.clock.seek(this.clock.target); this.cancelFrame(); }
    this.resize();
    this.startAnimation();
    if (finish) this.onViewChange?.(this.getView());
  }

  setView(view: SkylineView, immediate = false): void {
    if (this.disposed) return;
    const next = view === 'graph' ? this.clock.duration : 0;
    if (next === this.clock.target && !immediate) return;
    if (immediate || this.reducedMotion) {
      this.clock.seek(next);
      this.cancelFrame();
      this.requestDraw();
      this.onViewChange?.(view);
      return;
    }
    this.clock.retarget(next);
    if (this.clock.settled) { this.cancelFrame(); this.requestDraw(); }
    else this.startAnimation();
  }

  getView(): SkylineView { return this.clock.target === this.clock.duration ? 'graph' : 'skyline'; }
  isAnimating(): boolean { return this.raf !== null; }
  hasFailed(): boolean { return this.failed; }

  setActive(active: boolean): void {
    this.inView = active;
    this.syncActivity();
  }

  private syncActivity(): void {
    if (!this.active) this.cancelFrame();
    else if (!this.clock.settled) this.startAnimation();
    else this.requestDraw();
  }

  setSelectedDate(date: string | null): void {
    this.selectedDate = date;
    this.requestDraw();
  }

  hitTest(x: number, y: number): NormalizedContributionDay | null {
    if (!this.clock.settled || this.progress !== 1 || !this.grid.days.length) return null;
    const week = Math.floor((x - this.geometry.flatLeft) / this.geometry.flatCell);
    const weekday = Math.floor((y - this.geometry.flatTop) / this.geometry.flatCell);
    if (week < 0 || week >= this.grid.weeks || weekday < 0 || weekday > 6) return null;
    return this.grid.days.find((day) => day.weekIndex === week && day.weekday === weekday) ?? null;
  }

  destroy(): void {
    this.disposed = true;
    this.cancelFrame();
    this.scene = null;
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.dprMedia?.removeEventListener('change', this.onDprChange);
  }

  private watchDpr(): void {
    this.dprMedia?.removeEventListener('change', this.onDprChange);
    if (this.disposed || typeof window.matchMedia !== 'function') return;
    this.dprMedia = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    this.dprMedia.addEventListener('change', this.onDprChange);
  }

  private resize(): void {
    try { this.resizeScene(); } catch (error) { this.fail(error); }
  }

  private resizeScene(): void {
    if (this.disposed) return;
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, this.maxDevicePixelRatio);
    if (this.width !== rect.width || this.height !== rect.height || this.ratio !== ratio) {
      this.width = rect.width; this.height = rect.height; this.ratio = ratio;
      this.canvas.width = Math.max(1, Math.round(rect.width * ratio));
      this.canvas.height = Math.max(1, Math.round(rect.height * ratio));
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    this.geometry = calculateSkylineGeometry(this.width, this.height, this.grid.weeks, this.heightScale);
    this.scene = new SkylineScene(this.grid, this.geometry, this.palette, this.heightScale, this.buildingDetail);
    this.cacheLabels();
    this.requestDraw();
  }

  private fail(error: unknown): void {
    this.failed = true;
    this.destroy();
    this.onError?.(error instanceof Error ? error : new Error('Canvas rendering failed.'));
  }

  private requestDraw(): void {
    if (!this.active) return;
    try { this.draw(); } catch (error) { this.fail(error); }
  }

  private startAnimation(): void {
    if (!this.active || this.raf !== null || this.clock.settled) return;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame((time) => this.frame(time));
  }

  private frame(time: number): void {
    this.raf = null;
    if (!this.active) return;
    const elapsed = time - this.lastFrame;
    this.lastFrame = time;
    this.clock.advance(elapsed);
    this.requestDraw();
    if (this.disposed) return;
    if (this.clock.settled) {
      this.onViewChange?.(this.getView());
      return;
    }
    this.raf = requestAnimationFrame((next) => this.frame(next));
  }

  private cancelFrame(): void {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  private draw(): void {
    if (!this.width || !this.height || !this.scene) return;
    const context = this.context;
    context.clearRect(0, 0, this.width, this.height);
    if (!this.transparentBackground) {
      context.fillStyle = this.palette.surface;
      context.fillRect(0, 0, this.width, this.height);
      if (this.palette.texture === 'diagonal') this.drawTexture();
    }
    this.scene.draw(context, poseTimeFor(this.clock.time));
    if (this.showLabels && this.progress > 0.76) this.drawLabels((this.progress - 0.76) / 0.24);
    if (this.selectedDate && this.clock.settled && this.progress === 1) this.drawSelection();
  }

  private drawTexture(): void {
    this.context.save();
    this.context.globalAlpha = 0.14;
    this.context.strokeStyle = '#5b1d22';
    this.context.lineWidth = 1;
    for (let x = -this.height; x < this.width + this.height; x += 8) {
      this.context.beginPath();
      this.context.moveTo(x, 0);
      this.context.lineTo(x - this.height, this.height);
      this.context.stroke();
    }
    this.context.restore();
  }

  private drawLabels(alpha: number): void {
    const context = this.context;
    context.save();
    context.fillStyle = this.palette.muted;
    context.globalAlpha = alpha;
    context.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    for (const label of this.labels) context.fillText(label.text, label.x, label.y);
    context.restore();
  }

  private cacheLabels(): void {
    this.labels = [];
    const monthFormatter = new Intl.DateTimeFormat(this.locale, { month: 'short', timeZone: 'UTC' });
    const weekdayFormatter = new Intl.DateTimeFormat(this.locale, { weekday: 'short', timeZone: 'UTC' });
    let priorMonth = -1;
    for (const day of this.grid.days) {
      if (day.weekday !== 0) continue;
      const month = new Date(day.dateValue).getUTCMonth();
      if (month === priorMonth) continue;
      priorMonth = month;
      const text = monthFormatter.format(day.dateValue);
      const x = this.geometry.flatLeft + day.weekIndex * this.geometry.flatCell;
      const previous = this.labels.at(-1);
      if (!previous || x - previous.x >= previous.text.length * 6 + 4) this.labels.push({ text, x, y: this.geometry.flatTop - 10 });
    }
    if (!this.geometry.compact) {
      for (const weekday of [1, 3, 5]) this.labels.push({
        text: weekdayFormatter.format(Date.UTC(2026, 0, 4 + weekday)),
        x: this.geometry.flatLeft - 30,
        y: this.geometry.flatTop + this.geometry.flatCell * ((weekday - this.weekStartsOn + 7) % 7 + 1) - 1,
      });
    }
  }

  private drawSelection(): void {
    const day = this.grid.days.find((item) => item.date === this.selectedDate);
    if (!day) return;
    const x = this.geometry.flatLeft + day.weekIndex * this.geometry.flatCell + (this.geometry.flatCell - this.geometry.flatSize) / 2;
    const y = this.geometry.flatTop + day.weekday * this.geometry.flatCell + (this.geometry.flatCell - this.geometry.flatSize) / 2;
    this.context.save();
    this.context.strokeStyle = this.palette.focus;
    this.context.lineWidth = 2;
    this.context.strokeRect(x - 2, y - 2, this.geometry.flatSize + 4, this.geometry.flatSize + 4);
    this.context.restore();
  }
}
