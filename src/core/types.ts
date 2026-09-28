export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  date: string;
  count: number;
  level?: ContributionLevel;
}

export type SkylinePaletteName = 'green' | 'red' | 'mono' | 'orange' | 'blue' | 'yellow';
export type SkylineView = 'skyline' | 'graph';
export type FlattenMode = 'auto' | 'hover' | 'press' | 'always' | 'never';
export type SkylineStatus = 'ready' | 'loading' | 'error';

export interface CustomSkylinePalette {
  name: string;
  label: string;
  surface: string;
  elevated: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  focus: string;
  levels: readonly [string, string, string, string, string];
  texture?: 'diagonal' | 'none';
}

export interface NormalizedContributionDay extends Required<ContributionDay> {
  dateValue: number;
  weekday: number;
  weekIndex: number;
  source: 'provided' | 'filled';
}

export interface ContributionGrid {
  days: NormalizedContributionDay[];
  weeks: number;
  startDate: string | null;
  endDate: string | null;
  totalContributions: number;
}

export interface GitHubContributionCalendarDay {
  date: string;
  contributionCount: number;
  contributionLevel?: string;
}

export interface GitHubContributionCalendar {
  totalContributions?: number;
  weeks: Array<{ contributionDays: GitHubContributionCalendarDay[] }>;
}

export interface SkylineOptions {
  contributions: ContributionDay[];
  username?: string;
  totalContributions?: number;
  palette?: SkylinePaletteName | CustomSkylinePalette;
  heightScale?: number;
  buildingDetail?: boolean;
  flattenMode?: FlattenMode;
  initialView?: SkylineView;
  showControls?: boolean;
  showLegend?: boolean;
  showLabels?: boolean;
  locale?: string;
  weekStartsOn?: 0 | 1;
  ariaLabel?: string;
  maxDevicePixelRatio?: number;
  status?: SkylineStatus;
  errorMessage?: string;
  reducedMotion?: boolean;
  onDayHover?: (day: ContributionDay | null) => void;
  onDaySelect?: (day: ContributionDay) => void;
  onViewChange?: (view: SkylineView) => void;
  onPaletteChange?: (palette: SkylinePaletteName | CustomSkylinePalette) => void;
  onHeightScaleChange?: (heightScale: number) => void;
  onBuildingDetailChange?: (buildingDetail: boolean) => void;
}

export interface ResolvedSkylineOptions extends Omit<SkylineOptions, 'palette'> {
  username: string;
  palette: CustomSkylinePalette;
  heightScale: number;
  buildingDetail: boolean;
  flattenMode: FlattenMode;
  initialView: SkylineView;
  showControls: boolean;
  showLegend: boolean;
  showLabels: boolean;
  locale: string;
  weekStartsOn: 0 | 1;
  ariaLabel: string;
  maxDevicePixelRatio: number;
  status: SkylineStatus;
  errorMessage: string;
  reducedMotion: boolean;
}

export interface SkylineController {
  update(options: Partial<SkylineOptions>): void;
  setView(view: SkylineView, immediate?: boolean): void;
  getView(): SkylineView;
  focus(): void;
  destroy(): void;
  isAnimating(): boolean;
}
