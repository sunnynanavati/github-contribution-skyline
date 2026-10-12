import { type Point, type SkylineGeometry } from './geometry';
import { calculateBuildingHeight } from './buildings';
import { drawRoofDetail, hasRoofDetail, polygon, roofStyleFor, shade, type RoofStyle } from './roof-details';
import { splatDelay, splatHeightFactor } from './splash';
import { splatCamera } from './splat-camera';
import type { ContributionGrid, CustomSkylinePalette } from './types';

type Quad = [Point, Point, Point, Point];
const quad = (): Quad => [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}];

/** One solid building becomes one solid cell. No fragments, shrinking dots or fades. */
export class SplatMorph {
  private readonly world: Float32Array;
  private readonly heights: Float32Array;
  private readonly delays: Float32Array;
  private readonly colors: string[] = [];
  private readonly sideColors: [string,string][] = [];
  private readonly roofs: (RoofStyle | null)[] = [];
  private readonly top = quad();
  private readonly base = quad();
  private readonly face = quad();
  private readonly count: number;

  constructor(private readonly grid: ContributionGrid, private readonly geometry: SkylineGeometry, palette: CustomSkylinePalette, heightScale: number, buildingDetail = true) {
    this.count = grid.days.length;
    this.world = new Float32Array(this.count*2);
    this.heights = new Float32Array(this.count);
    this.delays = new Float32Array(this.count);
    const ordered = [...grid.days].sort((a,b) => a.weekIndex+a.weekday-b.weekIndex-b.weekday);
    for (let index=0; index<ordered.length; index+=1) {
      const day = ordered[index]!;
      this.world[index*2] = day.weekIndex+0.5-grid.weeks/2;
      this.world[index*2+1] = day.weekday-3;
      this.heights[index]=calculateBuildingHeight(day.level,heightScale,geometry.compact);
      this.delays[index]=splatDelay(day.weekIndex,day.weekday,grid.weeks);
      const color=palette.levels[day.level];
      this.colors.push(color);
      this.sideColors.push([shade(color,0.68),shade(color,0.5)]);
      this.roofs.push(buildingDetail && hasRoofDetail(day.weekIndex,day.weekday,day.level) ? roofStyleFor(day.weekIndex,day.weekday) : null);
    }
  }

  draw(context: CanvasRenderingContext2D, progress: number): void {
    const camera = splatCamera(progress, this.geometry, this.grid.weeks);
    for (let day=0;day<this.count;day+=1) {
      const heightFactor=splatHeightFactor(progress,this.delays[day]!);
      // A softer compression with a wider center-out delay. The camera remains
      // shared; local timing changes only vertical height, never the grid basis.
      const height=this.heights[day]! * heightFactor * camera.z;
      const worldX=this.world[day*2]!;
      const worldY=this.world[day*2+1]!;
      for (let corner=0;corner<4;corner+=1) {
        const base=this.base[corner]!;
        const x=worldX + (corner===1 || corner===2 ? camera.halfCell : -camera.halfCell);
        const y=worldY + (corner>=2 ? camera.halfCell : -camera.halfCell);
        base.x=camera.x+x*camera.xx+y*camera.xy;
        base.y=camera.y+x*camera.yx+y*camera.yy;
        this.top[corner]!.x=base.x;
        this.top[corner]!.y=base.y-height;
      }
      if (height>0.01) {
        this.face[0]=this.top[1]; this.face[1]=this.top[2]; this.face[2]=this.base[2]; this.face[3]=this.base[1];
        polygon(context,this.face,this.sideColors[day]![0],1);
        this.face[0]=this.top[2]; this.face[1]=this.top[3]; this.face[2]=this.base[3]; this.face[3]=this.base[2];
        polygon(context,this.face,this.sideColors[day]![1],1);
      }
      polygon(context,this.top,this.colors[day]!,1);
      const roof=this.roofs[day];
      if (roof && heightFactor>0) {
        // Compress rooftop detail with its building rather than fading it away.
        const center=(this.top[0].y+this.top[2].y)/2;
        context.save();
        context.translate(0,center);
        context.scale(1,Math.max(0.001,heightFactor*camera.z));
        context.translate(0,-center);
        drawRoofDetail(context,roof,this.top,this.colors[day]!,1);
        context.restore();
      }
    }
  }
}
