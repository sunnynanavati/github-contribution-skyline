/** Approved Chrome tuning, promoted to every renderer entry point.
 * Motion is fixed; public heightScale/buildingDetail options still override the defaults.
 */
export const SKYLINE_DEFAULTS = Object.freeze({
  forwardMs: 650, returnMs: 650, linkedTiming: true, reversalMs: 80,
  waveStart: 0.075, waveSpread: 0.6, compression: 0.135,
  easing: 'quick' as 'smooth' | 'quick' | 'soft',
  lean: 0.35, widening: 0.055, rebound: 0,
  heightScale: 2, heightCurve: 0.75, minimumHeight: 0.12,
  footprint: 0.8, graphFill: 0.78, buildingDetail: true,
  pitch: 30, cameraTurn: 1, cameraRise: 1,
  showHeader: true, showLegend: true, showLabels: true,
});
