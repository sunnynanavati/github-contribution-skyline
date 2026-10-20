import { normalizeContributions } from './data.js';
import { SKYLINE_DEFAULTS } from './defaults.js';
import { clampTooltipPosition } from './geometry.js';
import { resolvePalette, SKYLINE_PALETTES } from './palettes.js';
import { CanvasUnavailableError, SkylineRenderer } from './SkylineRenderer.js';
import { SKYLINE_STYLES } from './styles.js';
import type {
  ContributionDay,
  ContributionGrid,
  CustomSkylinePalette,
  ResolvedSkylineOptions,
  SkylineController,
  SkylineOptions,
  SkylinePaletteName,
  SkylineView,
} from './types.js';

const paletteOrder: SkylinePaletteName[] = ['green', 'red', 'mono', 'orange', 'blue', 'yellow'];

function defaultReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function resolveOptions(input: SkylineOptions): ResolvedSkylineOptions {
  let palette = SKYLINE_PALETTES.green;
  let locale = 'en-US';
  let configurationError: string | undefined;
  try {
    palette = resolvePalette(input.palette);
    locale = Intl.getCanonicalLocales(input.locale ?? 'en-US')[0] ?? 'en-US';
    if (input.totalContributions !== undefined && (!Number.isSafeInteger(input.totalContributions) || input.totalContributions < 0)) throw new Error('Total contributions must be a non-negative safe integer.');
  } catch (error) {
    configurationError = error instanceof Error ? error.message : 'Invalid skyline options.';
  }
  return {
    ...input,
    configurationError,
    contributions: input.contributions ?? [],
    username: input.username ?? '',
    palette,
    heightScale: Math.max(0.4, Math.min(2, Number.isFinite(input.heightScale) ? input.heightScale! : SKYLINE_DEFAULTS.heightScale)),
    buildingDetail: input.buildingDetail ?? true,
    variant: input.variant === 'card' ? 'card' : 'bare',
    flattenMode: input.flattenMode ?? 'auto',
    initialView: input.flattenMode === 'always' ? 'graph' : input.flattenMode === 'never' ? 'skyline' : (input.initialView ?? 'skyline'),
    showControls: input.showControls ?? true,
    showLegend: input.showLegend ?? true,
    showLabels: input.showLabels ?? true,
    locale,
    weekStartsOn: input.weekStartsOn ?? 0,
    ariaLabel: input.ariaLabel ?? 'GitHub contribution skyline',
    maxDevicePixelRatio: Math.max(1, Math.min(4, Number.isFinite(input.maxDevicePixelRatio) ? input.maxDevicePixelRatio! : 2)),
    status: input.status ?? 'ready',
    errorMessage: input.errorMessage ?? 'The contribution skyline could not be displayed.',
    reducedMotion: input.reducedMotion ?? defaultReducedMotion(),
  };
}

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

class SkylineControllerImpl implements SkylineController {
  private input: SkylineOptions;
  private options: ResolvedSkylineOptions;
  private grid: ContributionGrid = { days: [], weeks: 0, startDate: null, endDate: null, totalContributions: 0 };
  private renderer: SkylineRenderer | null = null;
  private readonly shadow: ShadowRoot;
  private readonly abort = new AbortController();
  private readonly shell: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly identity: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly detailsButton: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly paletteGrid: HTMLElement;
  private readonly detailInput: HTMLInputElement;
  private readonly heightInput: HTMLInputElement;
  private readonly heightOutput: HTMLOutputElement;
  private readonly legend: HTMLElement;
  private readonly legendColors: HTMLElement;
  private readonly tooltip: HTMLElement;
  private readonly state: HTMLElement;
  private readonly stateTitle: HTMLElement;
  private readonly stateMessage: HTMLElement;
  private readonly liveRegion: HTMLElement;
  private readonly semanticTable: HTMLTableElement;
  private readonly fallback: HTMLDetailsElement;
  private intersectionObserver: IntersectionObserver | null = null;
  private settingsOpen = false;
  private selectedIndex = -1;
  private focusFrame: number | null = null;
  private disposed = false;

  constructor(private readonly host: HTMLElement, initial: SkylineOptions) {
    this.input = { ...initial };
    this.options = resolveOptions(this.input);
    this.shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    this.shadow.replaceChildren();
    const style = createElement('style');
    style.textContent = SKYLINE_STYLES;
    this.shadow.append(style);

    this.shell = createElement('section', 'shell');
    this.shell.tabIndex = 0;
    this.shell.setAttribute('role', 'region');
    this.canvas = createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    const topline = createElement('div', 'topline');
    this.identity = createElement('span', 'identity');
    this.hint = createElement('span', 'hint');
    topline.append(this.identity, this.hint);

    this.detailsButton = createElement('button', 'details-toggle');
    this.detailsButton.type = 'button';
    const icon = createElement('span', 'sliders-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.append(createElement('i'), createElement('i'), createElement('i'));
    const buttonLabel = createElement('span');
    buttonLabel.textContent = 'Details';
    this.detailsButton.append(icon, buttonLabel);
    this.detailsButton.setAttribute('aria-expanded', 'false');
    this.detailsButton.setAttribute('aria-controls', 'gcs-settings');

    this.panel = createElement('div', 'settings-panel');
    this.panel.id = 'gcs-settings';
    this.panel.setAttribute('aria-hidden', 'true');
    this.panel.inert = true;
    const panelHead = createElement('div', 'settings-head');
    const panelTitle = createElement('strong');
    panelTitle.textContent = 'Skyline palette';
    const reset = createElement('button', 'reset');
    reset.type = 'button';
    reset.textContent = 'Reset';
    panelHead.append(panelTitle, reset);
    this.paletteGrid = createElement('div', 'palette-grid');
    this.paletteGrid.setAttribute('role', 'radiogroup');
    this.paletteGrid.setAttribute('aria-label', 'Skyline color');

    const detailRow = createElement('label', 'setting-row');
    const detailLabel = createElement('span');
    detailLabel.textContent = 'Building detail';
    const switchWrap = createElement('span', 'switch');
    this.detailInput = createElement('input');
    this.detailInput.type = 'checkbox';
    this.detailInput.name = 'buildingDetail';
    const track = createElement('i', 'track');
    switchWrap.append(this.detailInput, track);
    detailRow.append(detailLabel, switchWrap);

    const rangeRow = createElement('label', 'range-row');
    const rangeMeta = createElement('span', 'range-meta');
    const rangeLabel = createElement('span');
    rangeLabel.textContent = 'Height scale';
    this.heightOutput = createElement('output');
    rangeMeta.append(rangeLabel, this.heightOutput);
    this.heightInput = createElement('input');
    this.heightInput.type = 'range';
    this.heightInput.name = 'heightScale';
    this.heightInput.min = '40';
    this.heightInput.max = '200';
    this.heightInput.step = '5';
    rangeRow.append(rangeMeta, this.heightInput);
    this.panel.append(panelHead, this.paletteGrid, detailRow, rangeRow);

    this.legend = createElement('div', 'legend');
    const less = createElement('span');
    less.textContent = 'Less';
    this.legendColors = createElement('span', 'legend-colors');
    const more = createElement('span');
    more.textContent = 'More';
    this.legend.append(less, this.legendColors, more);

    this.tooltip = createElement('div', 'tooltip');
    this.state = createElement('div', 'state');
    this.stateTitle = createElement('strong');
    this.stateMessage = createElement('span');
    this.fallback = createElement('details', 'data-fallback');
    this.fallback.hidden = true;
    const fallbackSummary = createElement('summary');
    fallbackSummary.textContent = 'View daily contribution data';
    this.fallback.append(fallbackSummary);
    this.state.setAttribute('role', 'status');
    this.state.append(this.stateTitle, this.stateMessage, this.fallback);
    this.liveRegion = createElement('div', 'sr-only');
    this.liveRegion.id = 'gcs-live';
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.semanticTable = createElement('table', 'sr-only');
    this.semanticTable.setAttribute('aria-label', 'GitHub contributions by day');

    this.shell.append(this.canvas, topline, this.detailsButton, this.panel, this.legend, this.tooltip, this.state, this.liveRegion, this.semanticTable);
    this.shadow.append(this.shell);
    this.host.setAttribute('data-github-skyline', '');
    this.bind(reset);
    this.apply();
  }

  update(next: Partial<SkylineOptions>): void {
    if (this.disposed) return;
    if ((next.contributions !== undefined && next.contributions !== this.input.contributions)
      || (next.weekStartsOn !== undefined && next.weekStartsOn !== this.input.weekStartsOn)) {
      this.selectedIndex = -1;
      this.hideTooltip();
      this.liveRegion.textContent = '';
      this.renderer?.setSelectedDate(null);
    }
    this.input = { ...this.input, ...next };
    this.options = resolveOptions(this.input);
    this.apply();
  }

  setView(view: SkylineView, immediate = false): void {
    if (this.disposed) return;
    if (this.options.flattenMode === 'always' && view !== 'graph') return;
    if (this.options.flattenMode === 'never' && view !== 'skyline') return;
    if (view === 'skyline') {
      this.hideTooltip();
      this.selectedIndex = -1;
      this.renderer?.setSelectedDate(null);
    }
    this.renderer?.setView(view, immediate);
    this.updateHint(view);
  }

  getView(): SkylineView { return this.renderer?.getView() ?? this.options.initialView; }
  focus(): void { this.shell.focus(); }
  isAnimating(): boolean { return this.renderer?.isAnimating() ?? false; }

  destroy(): void {
    this.disposed = true;
    if (this.focusFrame !== null) cancelAnimationFrame(this.focusFrame);
    this.abort.abort();
    this.intersectionObserver?.disconnect();
    this.renderer?.destroy();
    this.renderer = null;
    this.shadow.replaceChildren();
  }

  private bind(reset: HTMLButtonElement): void {
    const signal = this.abort.signal;
    if (typeof matchMedia === 'function') {
      matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
        if (this.input.reducedMotion !== undefined) return;
        this.options = resolveOptions(this.input);
        this.renderer?.update({ reducedMotion: this.options.reducedMotion });
      }, { signal });
    }
    this.detailsButton.addEventListener('click', () => this.toggleSettings(), { signal });
    reset.addEventListener('click', () => this.resetSettings(), { signal });
    this.detailInput.addEventListener('change', () => {
      this.input.buildingDetail = this.detailInput.checked;
      this.options = resolveOptions(this.input);
      this.renderer?.update({ buildingDetail: this.options.buildingDetail });
      this.options.onBuildingDetailChange?.(this.options.buildingDetail);
    }, { signal });
    this.heightInput.addEventListener('input', () => {
      const value = Number(this.heightInput.value) / 100;
      this.input.heightScale = value;
      this.options = resolveOptions(this.input);
      this.heightOutput.textContent = `${this.heightInput.value}%`;
      this.renderer?.update({ heightScale: value });
      this.options.onHeightScaleChange?.(value);
    }, { signal });
    this.paletteGrid.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-palette]');
      if (button?.dataset.palette) this.choosePalette(button.dataset.palette);
    }, { signal });
    this.paletteGrid.addEventListener('keydown', (event) => this.handlePaletteKeyDown(event), { signal });
    this.canvas.addEventListener('pointerenter', (event) => this.handlePointerEnter(event), { signal });
    this.canvas.addEventListener('pointerleave', () => this.hideTooltip(), { signal });
    this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event), { signal });
    this.canvas.addEventListener('pointerup', (event) => this.handlePointerUp(event), { signal });
    this.shell.addEventListener('pointerleave', (event) => this.handlePointerLeave(event), { signal });
    this.shell.addEventListener('keydown', (event) => this.handleKeyDown(event), { signal });
  }

  private apply(): void {
    let invalidMessage = this.options.configurationError ?? '';
    try {
      this.grid = normalizeContributions(this.options.contributions, this.options.weekStartsOn);
    } catch (error) {
      invalidMessage = error instanceof Error ? error.message : 'Contribution data is invalid.';
      this.grid = { days: [], weeks: 0, startDate: null, endDate: null, totalContributions: 0 };
    }
    this.applyPalette();
    this.renderPaletteCards();
    this.renderLegend();
    this.renderTable();
    this.syncControls();
    this.updateIdentity();
    this.shell.dataset.variant = this.options.variant;
    this.shell.setAttribute('aria-label', this.options.ariaLabel);
    this.shell.setAttribute('aria-describedby', this.liveRegion.id);
    const bare = this.options.variant === 'bare';
    this.detailsButton.hidden = bare || !this.options.showControls;
    this.legend.hidden = bare || !this.options.showLegend;
    if ((bare || !this.options.showControls) && this.settingsOpen) {
      if (this.focusFrame !== null) cancelAnimationFrame(this.focusFrame);
      this.focusFrame = null;
      this.settingsOpen = false;
      this.panel.removeAttribute('data-open');
      this.panel.setAttribute('aria-hidden', 'true');
      this.panel.inert = true;
      this.detailsButton.setAttribute('aria-expanded', 'false');
      this.shell.focus();
    }

    const state = invalidMessage ? 'invalid' : this.options.status === 'loading' ? 'loading' : this.options.status === 'error' ? 'error' : this.grid.days.length ? 'ready' : 'empty';
    this.renderState(state, invalidMessage);
    if (state !== 'ready') {
      this.hideTooltip();
      this.renderer?.destroy();
      this.renderer = null;
      this.intersectionObserver?.disconnect();
      return;
    }
    if (this.renderer?.hasFailed()) { this.renderer.destroy(); this.renderer = null; }
    if (!this.renderer) this.createRenderer();
    else this.renderer.update({
      grid: this.grid,
      palette: this.options.palette,
      heightScale: this.options.heightScale,
      buildingDetail: this.options.buildingDetail,
      transparentBackground: bare,
      showLabels: this.options.showLabels,
      maxDevicePixelRatio: this.options.maxDevicePixelRatio,
      reducedMotion: this.options.reducedMotion,
      locale: this.options.locale,
      weekStartsOn: this.options.weekStartsOn,
      onViewChange: (view) => this.handleViewChange(view),
    });
    if (this.options.flattenMode === 'always') this.setView('graph');
    if (this.options.flattenMode === 'never') this.setView('skyline');
  }

  private createRenderer(): void {
    try {
      this.renderer = new SkylineRenderer(this.canvas, this.shell, {
        grid: this.grid,
        palette: this.options.palette,
        heightScale: this.options.heightScale,
        buildingDetail: this.options.buildingDetail,
        transparentBackground: this.options.variant === 'bare',
        showLabels: this.options.showLabels,
        maxDevicePixelRatio: this.options.maxDevicePixelRatio,
        initialView: this.options.initialView,
        reducedMotion: this.options.reducedMotion,
        locale: this.options.locale,
        weekStartsOn: this.options.weekStartsOn,
        onError: () => this.renderState('error', 'The renderer stopped unexpectedly. Contribution data remains available below.'),
        onViewChange: (view) => this.handleViewChange(view),
      });
      this.updateHint(this.options.initialView);
      if (!this.renderer.hasFailed() && typeof IntersectionObserver !== 'undefined') {
        this.intersectionObserver?.disconnect();
        this.intersectionObserver = new IntersectionObserver(([entry]) => this.renderer?.setActive(Boolean(entry?.isIntersecting)), { threshold: 0.01 });
        this.intersectionObserver.observe(this.shell);
      }
    } catch (error) {
      this.renderer?.destroy();
      this.renderer = null;
      if (error instanceof CanvasUnavailableError) this.renderState('canvas', 'Your browser does not provide Canvas 2D. Contribution data remains available below.');
      else this.renderState('error', 'The renderer could not start. Contribution data remains available below.');
    }
  }

  private applyPalette(): void {
    const palette = this.options.palette;
    this.host.style.setProperty('--gcs-surface', palette.surface);
    this.host.style.setProperty('--gcs-elevated', palette.elevated);
    this.host.style.setProperty('--gcs-ink', palette.ink);
    this.host.style.setProperty('--gcs-muted', palette.muted);
    this.host.style.setProperty('--gcs-border', palette.border);
    this.host.style.setProperty('--gcs-focus', palette.focus);
  }

  private renderPaletteCards(): void {
    const focusedPalette = this.shadow.activeElement instanceof HTMLButtonElement ? this.shadow.activeElement.dataset.palette : undefined;
    const palettes: CustomSkylinePalette[] = paletteOrder.map((name) => SKYLINE_PALETTES[name]);
    const customIndex = palettes.findIndex(palette => palette.name === this.options.palette.name);
    if (customIndex < 0) palettes.push(this.options.palette);
    else palettes[customIndex] = this.options.palette;
    this.paletteGrid.replaceChildren(...palettes.map((palette) => {
      const button = createElement('button', 'palette-button');
      button.type = 'button';
      button.dataset.palette = palette.name;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(palette.name === this.options.palette.name));
      button.tabIndex = palette.name === this.options.palette.name ? 0 : -1;
      const ramp = createElement('span', 'ramp');
      ramp.setAttribute('aria-hidden', 'true');
      for (const color of palette.levels) {
        const swatch = createElement('i');
        swatch.style.background = color;
        ramp.append(swatch);
      }
      const name = createElement('span', 'palette-name');
      name.textContent = palette.label;
      button.append(ramp, name);
      return button;
    }));
    if (focusedPalette && this.settingsOpen) this.focusPalette(focusedPalette);
  }

  private focusPalette(name: string): void {
    // Compare data values directly: custom names are never CSS selectors.
    [...this.paletteGrid.querySelectorAll<HTMLButtonElement>('[data-palette]')].find(button => button.dataset.palette === name)?.focus();
  }

  private renderLegend(): void {
    this.legendColors.replaceChildren(...this.options.palette.levels.map((color) => {
      const swatch = createElement('i', 'swatch');
      swatch.style.background = color;
      return swatch;
    }));
  }

  private renderTable(): void {
    const caption = createElement('caption');
    caption.textContent = 'Exact contribution counts for the displayed period';
    const body = createElement('tbody');
    for (const day of this.grid.days) {
      const row = createElement('tr');
      const date = createElement('th');
      date.scope = 'row';
      date.textContent = this.formatDate(day.dateValue);
      const count = createElement('td');
      count.textContent = `${day.count} ${day.count === 1 ? 'contribution' : 'contributions'}`;
      row.append(date, count);
      body.append(row);
    }
    this.semanticTable.replaceChildren(caption, body);
  }

  private syncControls(): void {
    this.detailInput.checked = this.options.buildingDetail;
    this.heightInput.value = String(Math.round(this.options.heightScale * 100));
    this.heightOutput.textContent = `${this.heightInput.value}%`;
  }

  private updateIdentity(): void {
    const total = Number.isSafeInteger(this.options.totalContributions) && this.options.totalContributions! >= 0 ? this.options.totalContributions! : this.grid.totalContributions;
    const count = new Intl.NumberFormat(this.options.locale).format(total);
    this.identity.textContent = this.options.username ? `github.com/${this.options.username} / ${count} contributions` : `${count} contributions`;
  }

  private renderState(kind: 'ready' | 'loading' | 'error' | 'empty' | 'invalid' | 'canvas', detail = ''): void {
    const copy = {
      ready: ['', ''],
      loading: ['Loading contributions', 'The skyline will appear when contribution data is ready.'],
      error: ['Unable to display contributions', detail || this.options.errorMessage],
      empty: ['No contributions to display', 'Provide contribution days to render a skyline.'],
      invalid: ['Invalid contribution data', detail],
      canvas: ['Canvas is unavailable', detail],
    }[kind];
    this.state.hidden = kind === 'ready';
    this.stateTitle.textContent = copy[0] ?? '';
    this.stateMessage.textContent = copy[1] ?? '';
    const availableData = (kind === 'canvas' || kind === 'error') && this.grid.days.length > 0;
    this.fallback.hidden = !availableData;
    this.semanticTable.className = availableData ? 'fallback-table' : 'sr-only';
    if (availableData) this.fallback.append(this.semanticTable);
    else {
      this.fallback.open = false;
      this.shell.append(this.semanticTable);
    }
  }

  private toggleSettings(force?: boolean): void {
    if (this.disposed || this.detailsButton.hidden) return;
    if (this.focusFrame !== null) cancelAnimationFrame(this.focusFrame);
    this.focusFrame = null;
    this.settingsOpen = force ?? !this.settingsOpen;
    this.panel.toggleAttribute('data-open', this.settingsOpen);
    this.panel.setAttribute('aria-hidden', String(!this.settingsOpen));
    this.panel.inert = !this.settingsOpen;
    this.detailsButton.setAttribute('aria-expanded', String(this.settingsOpen));
    if (this.settingsOpen) this.focusFrame = requestAnimationFrame(() => {
      this.focusFrame = null;
      const active = this.shadow.activeElement;
      // Do not steal focus if a fast click or assistive technology has already
      // moved it to a control while the opening frame was pending.
      if (!this.disposed && this.settingsOpen && (!active || active === this.detailsButton || active === this.shell)) {
        this.paletteGrid.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
      }
    });
    else this.detailsButton.focus();
  }

  private resetSettings(): void {
    this.input.palette = 'green';
    this.input.heightScale = SKYLINE_DEFAULTS.heightScale;
    this.input.buildingDetail = true;
    this.options = resolveOptions(this.input);
    this.options.onPaletteChange?.('green');
    this.options.onHeightScaleChange?.(SKYLINE_DEFAULTS.heightScale);
    this.options.onBuildingDetailChange?.(true);
    this.apply();
  }

  private choosePalette(name: string): void {
    const builtIn = Object.hasOwn(SKYLINE_PALETTES, name) ? SKYLINE_PALETTES[name as SkylinePaletteName] : null;
    const palette = this.options.palette.name === name ? this.options.palette : builtIn;
    if (!palette) return;
    this.input.palette = palette === builtIn ? name as SkylinePaletteName : palette;
    this.options = resolveOptions(this.input);
    this.options.onPaletteChange?.(this.input.palette);
    this.applyPalette();
    this.renderPaletteCards();
    this.renderLegend();
    this.renderer?.update({ palette: this.options.palette });
    if (this.settingsOpen) this.focusPalette(palette.name);
  }

  private handlePointerEnter(event: PointerEvent): void {
    if (this.settingsOpen) return;
    const hover = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (event.pointerType !== 'touch' && hover && (this.options.flattenMode === 'auto' || this.options.flattenMode === 'hover')) this.setView('graph');
  }

  private handlePointerLeave(event: PointerEvent): void {
    // Touch emits pointerleave when the finger lifts. Keep its toggled view;
    // only a hovering pointer leaving the component should raise the skyline.
    if (event.pointerType === 'touch') return;
    this.hideTooltip();
    if (this.options.flattenMode === 'auto' || this.options.flattenMode === 'hover') this.setView('skyline');
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.renderer || this.renderer.getView() !== 'graph') return;
    const rect = this.shell.getBoundingClientRect();
    const day = this.renderer.hitTest(event.clientX - rect.left, event.clientY - rect.top);
    this.options.onDayHover?.(day ? { date: day.date, count: day.count, level: day.level } : null);
    if (!day) { this.hideTooltip(); return; }
    this.tooltip.textContent = this.dayLabel(day);
    const position = clampTooltipPosition(
      (event.clientX - rect.left) * this.shell.offsetWidth / rect.width - this.shell.clientLeft,
      (event.clientY - rect.top) * this.shell.offsetHeight / rect.height - this.shell.clientTop,
      this.shell.clientWidth, this.shell.clientHeight,
      this.tooltip.offsetWidth, this.tooltip.offsetHeight,
    );
    this.tooltip.style.left = `${position.x}px`;
    this.tooltip.style.top = `${position.y}px`;
    this.tooltip.style.opacity = '1';
  }

  private handlePointerUp(event: PointerEvent): void {
    const pressMode = this.options.flattenMode === 'press' || (this.options.flattenMode === 'auto' && event.pointerType === 'touch');
    if (pressMode) {
      this.setView(this.getView() === 'graph' ? 'skyline' : 'graph');
      return;
    }
    if (this.getView() !== 'graph' || !this.renderer) return;
    const rect = this.shell.getBoundingClientRect();
    const day = this.renderer.hitTest(event.clientX - rect.left, event.clientY - rect.top);
    if (day) this.selectDay(day);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.settingsOpen) {
      event.preventDefault();
      this.toggleSettings(false);
      return;
    }
    // Native controls keep their own Space/Enter/arrow-key behavior.
    if (event.target !== this.shell || this.settingsOpen) return;
    if ((event.key === 'Enter' || event.key === ' ') && (this.options.flattenMode === 'auto' || this.options.flattenMode === 'hover' || this.options.flattenMode === 'press')) {
      event.preventDefault();
      this.setView(this.getView() === 'graph' ? 'skyline' : 'graph');
      return;
    }
    if (this.getView() !== 'graph' || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const offset = event.key === 'ArrowLeft' ? -7 : event.key === 'ArrowRight' ? 7 : event.key === 'ArrowUp' ? -1 : 1;
    this.selectIndex(this.selectedIndex < 0 ? 0 : this.selectedIndex + offset, true);
  }

  private handlePaletteKeyDown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...this.paletteGrid.querySelectorAll<HTMLButtonElement>('[data-palette]')];
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    event.stopPropagation();
    const columns = 2;
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? buttons.length - 1
        : event.key === 'ArrowLeft' ? current - 1
          : event.key === 'ArrowRight' ? current + 1
            : event.key === 'ArrowUp' ? current - columns
              : current + columns;
    const button = buttons[clampNumber(next, 0, buttons.length - 1)];
    if (button?.dataset.palette) this.choosePalette(button.dataset.palette);
  }

  private selectIndex(index: number, announce: boolean): void {
    if (!this.grid.days.length) return;
    this.selectedIndex = clampNumber(index, 0, this.grid.days.length - 1);
    const day = this.grid.days[this.selectedIndex];
    if (!day) return;
    this.renderer?.setSelectedDate(day.date);
    if (announce) this.selectDay(day);
  }

  private selectDay(day: ContributionDay): void {
    const label = `${this.formatDate(Date.parse(`${day.date}T00:00:00.000Z`))}: ${day.count} ${day.count === 1 ? 'contribution' : 'contributions'}`;
    this.liveRegion.textContent = label;
    this.options.onDaySelect?.({ date: day.date, count: day.count, level: day.level });
  }

  private dayLabel(day: ContributionDay): string {
    return `${day.count} ${day.count === 1 ? 'contribution' : 'contributions'} / ${this.formatDate(Date.parse(`${day.date}T00:00:00.000Z`))}`;
  }

  private formatDate(value: number): string {
    return new Intl.DateTimeFormat(this.options.locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(value);
  }

  private hideTooltip(): void {
    this.tooltip.style.opacity = '0';
    this.options.onDayHover?.(null);
  }

  private handleViewChange(view: SkylineView): void {
    this.updateHint(view);
    this.options.onViewChange?.(view);
  }

  private updateHint(view: SkylineView): void {
    if (this.options.flattenMode === 'always') this.hint.textContent = 'CONTRIBUTION GRAPH';
    else if (this.options.flattenMode === 'never') this.hint.textContent = 'SKYLINE VIEW';
    else if (this.options.flattenMode === 'press') this.hint.textContent = 'PRESS TO TOGGLE';
    else this.hint.textContent = view === 'graph' ? 'MOVE OUT TO RAISE' : 'HOVER TO FLATTEN';
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createSkyline(host: HTMLElement, options: SkylineOptions): SkylineController {
  return new SkylineControllerImpl(host, options);
}
