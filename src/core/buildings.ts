import { flatCorners, isoPoint, mixPoint, type SkylineGeometry, type Point } from './geometry';
import { drawRoofDetail, hasRoofDetail, polygon, roofStyleFor, shade } from './roof-details';
import type { CustomSkylinePalette, NormalizedContributionDay } from './types';

const LEVEL_HEIGHTS = [0.04, 0.22, 0.46, 0.73, 1] as const;

export interface BuildingRenderOptions {
  progress: number;
  heightScale: number;
  buildingDetail: boolean;
  palette: CustomSkylinePalette;
  geometry: SkylineGeometry;
}

export function calculateBuildingHeight(level: number, heightScale: number, compact: boolean): number {
  if (level <= 0) return 2.2;
  const normalizedLevel = Math.max(1, Math.min(4, Math.round(level))) as 1 | 2 | 3 | 4;
  return LEVEL_HEIGHTS[normalizedLevel] * (compact ? 66 : 78) * heightScale;
}

export function drawBuilding(
  context: CanvasRenderingContext2D,
  day: NormalizedContributionDay,
  options: BuildingRenderOptions,
): void {
  const { progress, heightScale, buildingDetail, palette, geometry } = options;
  const inset = 0.1;
  const height = calculateBuildingHeight(day.level, heightScale, geometry.compact);
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
