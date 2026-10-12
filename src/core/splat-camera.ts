import { type SkylineGeometry } from './geometry';
import { easeMotion, motionTokens } from './motion-tokens';

/** One orthographic camera. Every day uses the SAME basis and origin. */
export function splatCamera(progress: number, geometry: SkylineGeometry, weeks: number) {
  const t = easeMotion(progress,motionTokens.easing.sharp);
  const angle = Math.PI/4*(1-t);
  const tilt = 0.5 + 0.5*t;
  const cell = geometry.isoW*Math.SQRT2*(1-t) + geometry.flatCell*t;
  const cos = Math.cos(angle); const sin = Math.sin(angle);
  const sourceX = geometry.isoCenterX + (weeks/2-3.5)*geometry.isoW;
  const sourceY = geometry.isoCenterY + (weeks/2+3.5)*geometry.isoH;
  return {
    xx: cell*cos, xy: -cell*sin,
    yx: cell*sin*tilt, yy: cell*cos*tilt,
    x: sourceX*(1-t) + (geometry.flatLeft+weeks*geometry.flatCell/2)*t,
    y: sourceY*(1-t) + (geometry.flatTop+3.5*geometry.flatCell)*t,
    z: Math.sqrt(Math.max(0, 1-tilt*tilt))/Math.sqrt(0.75),
    halfCell: 0.4*(1-t) + geometry.flatSize/geometry.flatCell/2*t,
  };
}
