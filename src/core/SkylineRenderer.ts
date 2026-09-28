import { animationStep, isAnimationSettled } from './animation';
import { drawBuilding } from './buildings';
import { calculateGeometry, clamp, type SkylineGeometry } from './geometry';
import type { ContributionGrid, CustomSkylinePalette, NormalizedContributionDay, SkylineView } from './types';

export interface SkylineRendererOptions {
  grid: ContributionGrid;
  palette: CustomSkylinePalette;
  heightScale: number;
  buildingDetail: boolean;
  showLabels: boolean;
  maxDevicePixelRatio: number;
  initialView: SkylineView;
  reducedMotion: boolean;
  onViewChange?: (view: SkylineView) => void;
}

export class SkylineRenderer {
  private readonly context: CanvasRenderingContext2D;
  private grid: ContributionGrid;
  private palette: CustomSkylinePalette;
  private heightScale: number;
  private buildingDetail: boolean;
  private showLabels: boolean;
  private maxDevicePixelRatio: number;
  private reducedMotion: boolean;
  private onViewChange?: (view: SkylineView) => void;
  private width = 0;
  private height = 0;
  private geometry: SkylineGeometry = calculateGeometry(1, 1, 1);
  private progress: number;
  private target: number;
  private raf: number | null = null;
  private lastFrame = 0;
  private active = true;
  private selectedDate: string | null = null;
  private readonly sortedDays: NormalizedContributionDay[] = [];
  private readonly resizeObserver: ResizeObserver;
  private readonly onWindowResize = () => this.resize();
  private readonly onVisibilityChange = () => this.setActive(document.visibilityState !== 'hidden');

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly container: HTMLElement,
    options: SkylineRendererOptions,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable.');
    this.context = context;
    this.grid = options.grid;
    this.palette = options.palette;
    this.heightScale = options.heightScale;
    this.buildingDetail = options.buildingDetail;
    this.showLabels = options.showLabels;
    this.maxDevicePixelRatio = options.maxDevicePixelRatio;
    this.reducedMotion = options.reducedMotion;
    this.onViewChange = options.onViewChange;
    this.progress = options.initialView === 'graph' ? 1 : 0;
    this.target = this.progress;
    this.rebuildOrder();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    window.addEventListener('resize', this.onWindowResize, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.resize();
  }

  update(options: Partial<Omit<SkylineRendererOptions, 'initialView'>>): void {
    if (options.grid) { this.grid = options.grid; this.rebuildOrder(); }
    if (options.palette) this.palette = options.palette;
    if (options.heightScale !== undefined) this.heightScale = clamp(options.heightScale, 0.4, 2);
    if (options.buildingDetail !== undefined) this.buildingDetail = options.buildingDetail;
    if (options.showLabels !== undefined) this.showLabels = options.showLabels;
    if (options.maxDevicePixelRatio !== undefined) this.maxDevicePixelRatio = clamp(options.maxDevicePixelRatio, 1, 4);
    if (options.reducedMotion !== undefined) this.reducedMotion = options.reducedMotion;
    if (options.onViewChange !== undefined) this.onViewChange = options.onViewChange;
    this.geometry = calculateGeometry(this.width, this.height, this.grid.weeks);
    this.requestDraw();
  }

  setView(view: SkylineView, immediate = false): void {
    const next = view === 'graph' ? 1 : 0;
    if (next === this.target && !immediate) return;
    this.target = next;
    if (immediate || this.reducedMotion) {
      this.progress = next;
      this.cancelFrame();
      this.draw();
      this.onViewChange?.(view);
      return;
    }
    this.startAnimation();
  }

  getView(): SkylineView { return this.target === 1 ? 'graph' : 'skyline'; }
  isAnimating(): boolean { return this.raf !== null; }

  setActive(active: boolean): void {
    this.active = active && document.visibilityState !== 'hidden';
    if (!this.active) this.cancelFrame();
    else if (!isAnimationSettled(this.progress, this.target)) this.startAnimation();
    else this.requestDraw();
  }

  setSelectedDate(date: string | null): void {
    this.selectedDate = date;
    this.requestDraw();
  }

  hitTest(x: number, y: number): NormalizedContributionDay | null {
    if (this.progress < 0.88 || !this.grid.days.length) return null;
    const week = Math.floor((x - this.geometry.flatLeft) / this.geometry.flatCell);
    const weekday = Math.floor((y - this.geometry.flatTop) / this.geometry.flatCell);
    if (week < 0 || week >= this.grid.weeks || weekday < 0 || weekday > 6) return null;
    return this.grid.days.find((day) => day.weekIndex === week && day.weekday === weekday) ?? null;
  }

  destroy(): void {
    this.cancelFrame();
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private rebuildOrder(): void {
    this.sortedDays.length = 0;
    this.sortedDays.push(...this.grid.days);
    this.sortedDays.sort((a, b) => (a.weekIndex + a.weekday) - (b.weekIndex + b.weekday));
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, this.maxDevicePixelRatio);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.max(1, Math.round(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.round(rect.height * ratio));
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.geometry = calculateGeometry(this.width, this.height, this.grid.weeks);
    this.requestDraw();
  }

  private requestDraw(): void {
    if (!this.active) return;
    this.draw();
  }

  private startAnimation(): void {
    if (!this.active || this.raf !== null) return;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame((time) => this.frame(time));
  }

  private frame(time: number): void {
    const elapsed = time - this.lastFrame;
    this.lastFrame = time;
    this.progress = animationStep(this.progress, this.target, elapsed);
    this.draw();
    if (isAnimationSettled(this.progress, this.target)) {
      this.progress = this.target;
      this.raf = null;
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
    if (!this.width || !this.height) return;
    const context = this.context;
    context.clearRect(0, 0, this.width, this.height);
    context.fillStyle = this.palette.surface;
    context.fillRect(0, 0, this.width, this.height);
    if (this.palette.texture === 'diagonal') this.drawTexture();
    for (const day of this.sortedDays) {
      drawBuilding(context, day, {
        progress: this.progress,
        heightScale: this.heightScale,
        buildingDetail: this.buildingDetail,
        palette: this.palette,
        geometry: this.geometry,
      });
    }
    if (this.showLabels && this.progress > 0.7) this.drawLabels((this.progress - 0.7) / 0.3);
    if (this.selectedDate && this.progress > 0.88) this.drawSelection();
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
    let priorMonth = -1;
    for (const day of this.grid.days) {
      if (day.weekday !== 0) continue;
      const month = new Date(day.dateValue).getUTCMonth();
      if (month === priorMonth) continue;
      priorMonth = month;
      const label = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(day.dateValue);
      context.fillText(label, this.geometry.flatLeft + day.weekIndex * this.geometry.flatCell, this.geometry.flatTop - 10);
    }
    if (!this.geometry.compact) {
      context.fillText('Mon', this.geometry.flatLeft - 30, this.geometry.flatTop + this.geometry.flatCell * 2 - 1);
      context.fillText('Wed', this.geometry.flatLeft - 30, this.geometry.flatTop + this.geometry.flatCell * 4 - 1);
      context.fillText('Fri', this.geometry.flatLeft - 30, this.geometry.flatTop + this.geometry.flatCell * 6 - 1);
    }
    context.restore();
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
