/** Canvas equivalents of the motion-foundations timing/easing tokens. */
export const motionTokens = {
  duration: { normal: 0.35, slow: 0.6 },
  easing: { smooth: [0.22, 1, 0.36, 1], sharp: [0.4, 0, 0.2, 1] },
  skyline: { fanoutFraction: 0.3, collapseFraction: 0.55 },
} as const;

export function easeMotion(progress: number, curve: readonly [number,number,number,number]): number {
  const x = Math.max(0,Math.min(1,progress));
  if (x===0 || x===1) return x;
  let low=0; let high=1;
  for (let index=0;index<20;index+=1) {
    const t=(low+high)/2;
    const at=3*(1-t)**2*t*curve[0]+3*(1-t)*t*t*curve[2]+t**3;
    if (at<x) low=t; else high=t;
  }
  const t=(low+high)/2;
  return 3*(1-t)**2*t*curve[1]+3*(1-t)*t*t*curve[3]+t**3;
}
