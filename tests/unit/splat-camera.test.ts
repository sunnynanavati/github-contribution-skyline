import { describe, expect, it } from 'vitest';
import { calculateGeometry, flatCorners, isoPoint } from '../../src/core/geometry';
import { splatCamera } from '../../src/core/splat-camera';
import { easeMotion, motionTokens } from '../../src/core/motion-tokens';

describe('rigid grid camera', () => {
  it('uses a gradual camera pace with a soft start and finish, without overshoot', () => {
    let previous=0;
    for (let frame=1;frame<=36;frame+=1) {
      const value=easeMotion(frame/36,motionTokens.easing.sharp);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value-previous).toBeLessThan(0.08);
      previous=value;
    }
    expect(easeMotion(0.01,motionTokens.easing.sharp)).toBeLessThan(0.001);
    expect(easeMotion(0.99,motionTokens.easing.sharp)).toBeGreaterThan(0.999);
  });
  const weeks = 53;
  const geometry = calculateGeometry(1118,620,weeks);
  function project(week: number, row: number, progress: number) {
    const camera=splatCamera(progress,geometry,weeks);
    const x=week-weeks/2; const y=row-3.5;
    return {x:camera.x+x*camera.xx+y*camera.xy, y:camera.y+x*camera.yx+y*camera.yy};
  }

  it('matches the existing skyline and flat graph projections exactly', () => {
    const iso=isoPoint(20.1,3.1,0,geometry);
    const start=project(20.1,3.1,0);
    expect(start.x).toBeCloseTo(iso.x,8);
    expect(start.y).toBeCloseTo(iso.y,8);
    const endCamera=splatCamera(1,geometry,weeks);
    const end=project(20.5-endCamera.halfCell,3.5-endCamera.halfCell,1);
    const flat=flatCorners(20,3,geometry)[0];
    expect(end.x).toBeCloseTo(flat.x,8);
    expect(end.y).toBeCloseTo(flat.y,8);
    expect(endCamera.z).toBe(0);
  });

  it('preserves equal neighbor spacing and orientation at every frame', () => {
    for (let frame=0;frame<=100;frame+=1) {
      const progress=frame/100;
      const camera=splatCamera(progress,geometry,weeks);
      expect(camera.xx*camera.yy-camera.xy*camera.yx).toBeGreaterThan(0);
      for (let week=0;week<weeks-2;week+=1) {
        const a=project(week,3,progress); const b=project(week+1,3,progress); const c=project(week+2,3,progress);
        expect(b.x-a.x).toBeCloseTo(c.x-b.x,8);
        expect(b.y-a.y).toBeCloseTo(c.y-b.y,8);
      }
      const a=project(26,1,progress); const b=project(26,2,progress); const c=project(26,3,progress);
      expect(b.x-a.x).toBeCloseTo(c.x-b.x,8);
      expect(b.y-a.y).toBeCloseTo(c.y-b.y,8);
    }
  });
});
