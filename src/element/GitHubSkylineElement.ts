import { createSkyline } from '../core/SkylineController.js';
import type {
  ContributionDay,
  FlattenMode,
  SkylineController,
  SkylineOptions,
  SkylinePaletteName,
  SkylineVariant,
  SkylineView,
} from '../core/types.js';

// Importing the optional element entry on a server must not read a missing DOM.
const ElementBase = typeof HTMLElement === 'undefined' ? class {} as typeof HTMLElement : HTMLElement;
export class GitHubSkylineElement extends ElementBase {
  static observedAttributes = ['username', 'palette', 'height-scale', 'building-detail', 'variant', 'flatten-mode', 'show-controls', 'show-legend', 'show-labels', 'week-starts-on', 'aria-label'];

  private controller: SkylineController | null = null;
  private _contributions: ContributionDay[] = [];

  get contributions(): ContributionDay[] { return this._contributions; }
  set contributions(value: ContributionDay[]) {
    this._contributions = Array.isArray(value) ? value : [];
    this.updateController();
  }

  connectedCallback(): void {
    if (this.controller) return;
    // Preserve properties assigned before the browser upgrades this element.
    if (Object.hasOwn(this, 'contributions')) {
      const value = this.contributions;
      Reflect.deleteProperty(this, 'contributions');
      this.contributions = value;
    }
    this.controller = createSkyline(this, this.optionsFromAttributes());
  }

  disconnectedCallback(): void {
    this.controller?.destroy();
    this.controller = null;
  }

  attributeChangedCallback(): void { this.updateController(); }

  setView(view: SkylineView, immediate = false): void { this.controller?.setView(view, immediate); }
  getView(): SkylineView { return this.controller?.getView() ?? 'skyline'; }

  private updateController(): void { this.controller?.update(this.optionsFromAttributes()); }

  private optionsFromAttributes(): SkylineOptions {
    const booleanAttribute = (name: string, fallback: boolean) => this.hasAttribute(name) ? this.getAttribute(name) !== 'false' : fallback;
    return {
      contributions: this._contributions,
      username: this.getAttribute('username') ?? undefined,
      palette: (this.getAttribute('palette') as SkylinePaletteName | null) ?? undefined,
      heightScale: this.hasAttribute('height-scale') ? Number(this.getAttribute('height-scale')) : undefined,
      buildingDetail: booleanAttribute('building-detail', true),
      variant: (this.getAttribute('variant') as SkylineVariant | null) ?? undefined,
      flattenMode: (this.getAttribute('flatten-mode') as FlattenMode | null) ?? undefined,
      showControls: booleanAttribute('show-controls', true),
      showLegend: booleanAttribute('show-legend', true),
      showLabels: booleanAttribute('show-labels', true),
      weekStartsOn: this.getAttribute('week-starts-on') === '1' ? 1 : 0,
      ariaLabel: this.getAttribute('aria-label') ?? undefined,
      onDayHover: (day) => this.dispatchEvent(new CustomEvent('day-hover', { detail: day })),
      onDaySelect: (day) => this.dispatchEvent(new CustomEvent('day-select', { detail: day })),
      onViewChange: (view) => this.dispatchEvent(new CustomEvent('view-change', { detail: view })),
      onPaletteChange: (palette) => this.dispatchEvent(new CustomEvent('palette-change', { detail: palette })),
    };
  }
}

export function defineGitHubSkyline(tagName = 'github-contribution-skyline'): void {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get(tagName)) customElements.define(tagName, tagName === 'github-contribution-skyline' ? GitHubSkylineElement : class extends GitHubSkylineElement {});
}

declare global {
  interface HTMLElementTagNameMap {
    'github-contribution-skyline': GitHubSkylineElement;
  }
}
