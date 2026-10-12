import { clamp, clampTooltipPosition, type SkylineGeometry } from '../../../src/core/geometry';
import type { ContributionGrid, CustomSkylinePalette, NormalizedContributionDay } from '../../../src/core/types';
import { BloomScene } from './BloomScene';
import { BLOOM_TIMING, durationFor, MotionPlayhead, poseTimeFor, studyGeometry, type MotionProfile } from './choreography';

export interface StudySettings {
  profile: MotionProfile;
  grid: ContributionGrid;
  palette: CustomSkylinePalette;
  buildingDetail: boolean;
  heightScale: number;
  speed: number;
}
export interface MotionSample { time: number; duration: number; running: boolean; reducedMotion: boolean }

/** Demo harness only. Owns its finite frame loop, observers and accessible input. */
export class MotionPlayer {
  private readonly context: CanvasRenderingContext2D;
  private readonly clock: MotionPlayhead;
  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;
  private readonly motionMedia = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly abort = new AbortController();
  private scene!: BloomScene;
  private geometry!: SkylineGeometry;
  private width = 0;
  private height = 0;
  private ratio = 1;
  private raf: number | null = null;
  private lastFrame = 0;
  private inView = true;
  private paused = false;
  private disposed = false;
  private selected: NormalizedContributionDay | null = null;
  private draws = 0;
  private dprMedia: MediaQueryList | null = null;
  private readonly onDpr = () => { this.resize(); this.watchDpr(); };
  private readonly number = new Intl.NumberFormat();
  private readonly date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });

  constructor(
    private readonly root: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly tooltip: HTMLElement,
    private readonly live: HTMLElement,
    private settings: StudySettings,
    private readonly onSample: (sample: MotionSample) => void,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable. The contribution table is still available below.');
    this.context = context;
    this.clock = new MotionPlayhead(durationFor(settings.profile));
    const { signal } = this.abort;
    root.addEventListener('pointerenter', event => {
      if (!this.paused && event.pointerType === 'mouse' && matchMedia('(hover: hover) and (pointer: fine)').matches) this.toGraph(true);
    }, { signal });
    root.addEventListener('pointerleave', event => {
      this.hideTooltip();
      if (!this.paused && event.pointerType === 'mouse') this.toGraph(false);
    }, { signal });
    root.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') this.toggle(); }, { signal });
    root.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      const box = root.getBoundingClientRect();
      this.inspect(event.clientX - box.left, event.clientY - box.top);
    }, { signal });
    root.addEventListener('keydown', event => this.onKey(event), { signal });
    root.addEventListener('blur', () => this.hideTooltip(), { signal });
    document.addEventListener('visibilitychange', () => this.syncActivity(), { signal });
    window.addEventListener('resize', () => this.resize(), { signal, passive: true });
    this.motionMedia.addEventListener('change', () => {
      if (this.motionMedia.matches) { this.clock.seek(this.clock.target >= this.clock.duration / 2 ? this.clock.duration : 0); this.stop(); }
      this.draw();
    }, { signal });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(root);
    this.intersectionObserver = new IntersectionObserver(entries => {
      this.inView = entries.some(entry => entry.isIntersecting);
      this.syncActivity();
    });
    this.intersectionObserver.observe(root);
    this.watchDpr();
    this.resize();
  }

  configure(settings: StudySettings): void {
    const fraction = this.clock.time / this.clock.duration;
    const destination = this.clock.target / this.clock.duration;
    const wasMoving = !this.clock.settled;
    this.settings = settings;
    if (this.clock.duration !== durationFor(settings.profile)) {
      this.clock.duration = durationFor(settings.profile);
      this.clock.seek(fraction * this.clock.duration);
      if (wasMoving) this.clock.retarget(destination * this.clock.duration);
    }
    this.hideTooltip(); this.rebuild(); this.draw(); this.start();
  }
  toGraph(graph: boolean): void {
    this.paused = false;
    this.hideTooltip();
    const target = graph ? this.clock.duration : 0;
    if (this.motionMedia.matches) { this.clock.seek(target); this.stop(); this.draw(); }
    else { this.clock.retarget(target); this.start(); }
  }
  toggle(): void { this.toGraph(this.clock.target < this.clock.duration / 2); }
  replay(): void { this.clock.seek(0); this.toGraph(true); }
  seek(time: number): void {
    this.paused = true; this.stop(); this.hideTooltip();
    this.clock.seek(this.motionMedia.matches ? (time >= this.clock.duration / 2 ? this.clock.duration : 0) : time);
    this.draw();
  }
  destroy(): void {
    this.disposed = true; this.stop(); this.abort.abort();
    this.resizeObserver.disconnect(); this.intersectionObserver.disconnect();
    this.dprMedia?.removeEventListener('change', this.onDpr);
  }
  private get active(): boolean { return !this.disposed && this.inView && document.visibilityState !== 'hidden'; }
  private syncActivity(): void {
    if (!this.active) this.stop(); else { this.draw(); this.start(); }
  }
  private watchDpr(): void {
    this.dprMedia?.removeEventListener('change', this.onDpr);
    this.dprMedia = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    this.dprMedia.addEventListener('change', this.onDpr);
  }
  private resize(): void {
    if (this.disposed) return;
    const box = this.root.getBoundingClientRect();
    if (!box.width || !box.height) return;
    this.width = this.root.clientWidth; this.height = this.root.clientHeight;
    this.ratio = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.ratio); this.canvas.height = Math.round(this.height * this.ratio);
    this.hideTooltip(); this.rebuild(); this.draw();
  }
  private rebuild(): void {
    if (!this.width || !this.height) return;
    this.geometry = studyGeometry(this.width, this.height, this.settings.grid.weeks, this.settings.heightScale);
    this.scene = new BloomScene(this.settings.grid, this.geometry, this.settings.palette, this.settings.heightScale, this.settings.buildingDetail);
  }
  private start(): void {
    if (!this.active || this.paused || this.raf !== null || this.clock.settled) return;
    this.lastFrame = performance.now(); this.raf = requestAnimationFrame(this.frame); this.report();
  }
  private stop(): void { if (this.raf !== null) cancelAnimationFrame(this.raf); this.raf = null; }
  private readonly frame = (now: number): void => {
    this.raf = null;
    if (!this.active) return;
    const dt = Math.max(0, now - this.lastFrame) * this.settings.speed;
    this.lastFrame = now;
    if (this.settings.profile === 'baseline') {
      // Preserve the preceding experiment's original constant-rate clock.
      const target = this.clock.target;
      const next = this.clock.time + Math.sign(target - this.clock.time) * Math.min(32, dt);
      this.clock.seek(target > this.clock.time ? Math.min(target, next) : Math.max(target, next));
      this.clock.retarget(target);
    } else this.clock.advance(dt);
    if (!this.clock.settled) this.raf = requestAnimationFrame(this.frame);
    this.draw();
  };
  private report(): void {
    this.root.dataset.time = String(Math.round(this.clock.time)); this.root.dataset.profile = this.settings.profile;
    this.root.dataset.animating = String(this.raf !== null); this.root.dataset.draws = String(this.draws);
    this.onSample({ time: this.clock.time, duration: this.clock.duration, running: this.raf !== null, reducedMotion: this.motionMedia.matches });
  }
  private draw(): void {
    if (!this.active || !this.scene) return;
    const context = this.context;
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0); context.clearRect(0, 0, this.width, this.height);
    const poseTime = poseTimeFor(this.clock.time, this.settings.profile);
    const poseProgress = poseTime / (this.settings.profile === 'baseline' ? this.clock.duration : BLOOM_TIMING.duration);
    this.scene.draw(context, poseTime, this.settings.profile);
    if (poseProgress > 0.76) this.drawLabels(poseProgress);
    if (this.selected && this.clock.time === this.clock.duration) {
      const { flatLeft, flatTop, flatCell, flatSize } = this.geometry;
      const pad = (flatCell - flatSize) / 2;
      context.strokeStyle = this.settings.palette.focus; context.lineWidth = 1.5;
      context.strokeRect(flatLeft + this.selected.weekIndex * flatCell + pad - 2, flatTop + this.selected.weekday * flatCell + pad - 2, flatSize + 4, flatSize + 4);
    }
    this.draws += 1; this.report();
  }
  private drawLabels(progress: number): void {
    const ctx = this.context;
    ctx.save(); ctx.globalAlpha = clamp((progress - 0.76) / 0.24, 0, 1);
    ctx.fillStyle = '#a4aca8'; ctx.font = '10px ui-monospace, monospace';
    let prior = -1; let previousX = -100;
    const format = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' });
    for (const day of this.settings.grid.days) {
      if (day.weekday !== 0) continue;
      const month = new Date(day.dateValue).getUTCMonth();
      if (month === prior) continue;
      prior = month;
      const x = this.geometry.flatLeft + day.weekIndex * this.geometry.flatCell;
      if (x - previousX < 32) continue;
      ctx.fillText(format.format(day.dateValue), x, this.geometry.flatTop - 11); previousX = x;
    }
    ctx.restore();
  }
  private inspect(x: number, y: number): void {
    if (this.clock.time !== this.clock.duration || !this.clock.settled) return;
    const week = Math.floor((x - this.geometry.flatLeft) / this.geometry.flatCell);
    const row = Math.floor((y - this.geometry.flatTop) / this.geometry.flatCell);
    const day = this.settings.grid.days.find(item => item.weekIndex === week && item.weekday === row);
    if (!day) { this.hideTooltip(); return; }
    this.select(day, x, y, false);
  }
  private select(day: NormalizedContributionDay, x: number, y: number, announce: boolean): void {
    const text = `${this.number.format(day.count)} contributions · ${this.date.format(day.dateValue)}`;
    this.selected = day; this.tooltip.hidden = false; this.tooltip.textContent = text;
    const position = clampTooltipPosition(x, y, this.width, this.height, this.tooltip.offsetWidth, this.tooltip.offsetHeight);
    this.tooltip.style.left = `${position.x}px`; this.tooltip.style.top = `${position.y}px`;
    if (announce) this.live.textContent = text;
    this.draw();
  }
  private hideTooltip(): void {
    const hadSelection = this.selected !== null;
    this.selected = null; this.tooltip.hidden = true;
    if (hadSelection) this.draw();
  }
  private onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.toggle(); return; }
    if (event.key === 'Escape') { this.hideTooltip(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || this.clock.time !== this.clock.duration) return;
    event.preventDefault();
    const days = this.settings.grid.days;
    const current = this.selected ? days.indexOf(this.selected) : -1;
    const step = event.key === 'ArrowRight' ? 7 : event.key === 'ArrowLeft' ? -7 : event.key === 'ArrowUp' ? -1 : 1;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? days.length - 1 : current < 0 ? 0 : clamp(current + step, 0, days.length - 1);
    const day = days[index];
    if (day) this.select(day, this.geometry.flatLeft + (day.weekIndex + 0.5) * this.geometry.flatCell, this.geometry.flatTop + (day.weekday + 0.5) * this.geometry.flatCell, true);
  }
}
