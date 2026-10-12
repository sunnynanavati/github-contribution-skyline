# Bloom motion studies

These are demo-only experiments. No new library props or runtime dependencies are introduced.

Run `npm run dev -- --host 127.0.0.1 --port 4181`, then open:

- Minimal preview with B: `http://127.0.0.1:4181/`
- Original component preview (unchanged renderer): `http://127.0.0.1:4181/?preview=original`
- Default (B): `http://127.0.0.1:4181/?motion-study=1`
- A: `http://127.0.0.1:4181/?motion-study=1&prototype=vertical`
- B: `http://127.0.0.1:4181/?motion-study=1&prototype=elastic`
- Previous experiment: `http://127.0.0.1:4181/?motion-study=1&prototype=baseline`

Hover, tap, or press Enter/Space on the preview. Replay starts at the skyline.
Scrubbing pauses the scene, including automatic hover, so switching tabs holds
the same frame. Replay or Enter/Space resumes. The A/B playback runs from 0–600ms,
uniformly retiming the accepted 800ms choreography. Easing stays local to the
camera and each building; applying a second global ease had rushed through the
splat. The wave now travels for 225ms, with 135ms of compression per building,
giving it 360ms of visible spread (45–405ms), then a soft camera finish.
There is no extra startup ramp: the camera/building curves already start and
end at rest. Mid-flight direction changes still ease
over 80ms without resetting the current pose or velocity. A full return to the
skyline also takes 600ms, traversing the exact same poses at the same speed in
reverse. Baseline retains its
preceding constant-rate 600ms timing. Slow playback changes speed, not poses.

## Reference observations and implementation

Behavioral reference: [Bloom by Ann Nguyen](https://www.bubbbly.com/bloom).
The inspected reference currently activates on a tap/click. Its camera rises
as flowers spread, the center opens around 240ms, and raised flowers remain
around the outside through roughly 420ms, followed by a gentle finish.
No reference source or assets are included here.

- `choreography.ts`: fixed-grid camera, radial collapse field, bounded deformation,
  and an interruptible playhead. Arrival is `60 + 300 × distance` ms; local
  compression lasts 180 pose-time units. These original pose timings are kept
  separate from the 600ms playback curve, so tuning pace cannot change topology,
  endpoints, the camera path, or the center-out order.
- `BloomScene.ts`: shared original Canvas projection. A compresses vertically;
  B adds up to 0.35 cell spacing of upper-body lean and 8% roof widening,
  with a small return pulse before landing. Base vertices never receive offsets.
  Both variants become the identical graph. The earlier SplatMorph is the baseline.
- `MotionPlayer.ts`: demo lifecycle, pointer/touch/keyboard input, contained
  tooltips, responsive sizing, offscreen/hidden pause, and cleanup.

Use **Dense / equal heights** to compare the collapse front without differing
contribution heights obscuring it. **Inspect keyframes** shows matched samples.
All controls and the comparison page are excluded from the library build.

All render paths share continuous count-based building heights. The largest daily
count reaches the existing maximum height, while the remaining positive counts
interpolate from a readable minimum (12% of the maximum). Contribution levels
still select colors; they do not quantize heights. Zero days remain 2.2px tiles.
The maximum count is computed when the data changes, outside animation loops.

## Review criteria

Throughout 180–270ms of playback the center must be flat while the outside retains height. B should
suggest an outward push without translating its foundations. The card and controls
must not resize during the transition. Judge the two prototypes visually at 1×
before deciding whether either should become a production behavior.

Verification: `npm run lint`, `npm run typecheck`, `npm test`,
`npm run test:e2e -- --workers=1`, `npm run build`.
The experiment's Playwright config uses port 4181 to avoid accidentally testing
the main checkout. Override with `PLAYWRIGHT_PORT` when needed.
