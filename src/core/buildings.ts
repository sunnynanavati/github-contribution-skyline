import { flatCorners, isoPoint, mixPoint, type SkylineGeometry, type Point } from './geometry';
import { drawRoofDetail, hasRoofDetail, polygon, roofStyleFor, shade } from './roof-details';
import type { ContributionDay, CustomSkylinePalette, NormalizedContributionDay } from './types';

const EMPTY_HEIGHT = 2.2;

export interface BuildingRenderOptions {
  progress: number;
  heightScale: number;
  buildingDetail: boolean;
  palette: CustomSkylinePalette;
  geometry: SkylineGeometry;
  maxCount: number;
  splash?: boolean;
  weeks?: number;
}

/** Compute once per data change, never per building or animation frame. */
export function maximumContributionCount(days: readonly Pick<ContributionDay, 'count'>[]): number {
  let maximum = 0;
  for (const day of days) maximum = Math.max(maximum, day.count);
  return maximum;
}

/** Color levels stay discrete; body height follows the exact relative count. */
export function calculateBuildingHeight(count: number, maxCount: number, heightScale: number, compact: boolean): number {
  if (count <= 0 || maxCount <= 0) return EMPTY_HEIGHT;
  const maximumHeight = (compact ? 66 : 78) * heightScale;
  const minimumHeight = maximumHeight * 0.12;
  const relativeCount = Math.min(1, count / maxCount);
  return minimumHeight + (maximumHeight - minimumHeight) * relativeCount;
}

export function drawBuilding(
  context: CanvasRenderingContext2D,
  day: NormalizedContributionDay,
  options: BuildingRenderOptions,
): void {
  const { heightScale, buildingDetail, palette, geometry } = options;
  const progress = options.progress;
  const inset = 0.1;
  const height = calculateBuildingHeight(day.count, options.maxCount, heightScale, geometry.compact);
  const column = day.weekIndex;
  const row = day.weekday;
  const isoBase: [Point, Point, Point, Point] = [
    isoPoint(column + inset, row + inset, 0, geometry),
    isoPoint(column + 1 - inset, row + inset, 0, geometry),
    isoPoint(column + 1 - inset, row + 1 - inset, 0, geometry),
    isoPoint(column + inset, row + 1 - inset, 0, geometry),
  ];
  const flat = flatCorners(column, row, geometry);
  const top = isoBase.map((point, index) => mixPoint({ x: point.x, y: point.y - height }, flat[index]!, progress)) as [Point, Point, Point, Point];
  const base = isoBase.map((point, index) => mixPoint(point, flat[index]!, progress)) as [Point, Point, Point, Point];
  const color = palette.levels[day.level];
  const sideAlpha = Math.max(0, 1 - progress);

  if (day.level > 0 || progress < 0.98) {
    polygon(context, [top[1], top[2], base[2], base[1]], shade(color, 0.68), sideAlpha);
    polygon(context, [top[2], top[3], base[3], base[2]], shade(color, 0.5), sideAlpha);
  }
  polygon(context, top, color, 1);

  if (buildingDetail && hasRoofDetail(column, row, day.level) && progress < 0.82) {
    drawRoofDetail(context, roofStyleFor(column, row), top, color, 1 - progress);
  }
}
