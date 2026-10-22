# Changelog

## Demo hosting

- Add a persistent light/dark background toggle to the demo. Neutral surfaces,
  labels, and focus indicators adapt independently of building colors and motion.
- Blend the preview card into its surrounding background without a visible
  border or shadow; preserve its bounds, labels, and keyboard focus indicator.
- Remove the demo's Install button and unused copy/install UI; retain description,
  usage code, and palette controls.
- Add an explicitly opted-in, validated personal snapshot preview for recordings
  and static hosting. Default builds remain synthetic; personal snapshots are
  ignored by Git and extra JSON fields are not embedded.
- Add an accessible page heading and inline favicon to the demo.

## Privacy cleanup

- Require patched Vitest 4.1.12 or newer for the development test runner
  (GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp); no runtime dependency is added.
- Require patched Vite 7.3.7 or newer for the development toolchain
  (GHSA-698v-4r3x-3vcv); no runtime dependency is added.
- Replace the personal demo calendar with deterministic synthetic sample data;
  remove account labels and regenerate preview media and visual baselines.
- Remove personal author-name metadata. Repository-owner URLs remain necessary
  for installation and source links. Earlier Git history is not rewritten.

## Unreleased

- Scale building elevations with their footprints in constrained containers so
  phone skylines retain the desktop proportions. Shorten the mobile demo frame
  without changing the approved count curve, building designs, or splat timing.
- Promote five approved architectural landmarks to the reusable renderer:
  Deco needle, faceted pinnacle, pyramid crown, octagonal lantern, and blade crown.
- Default to 2× height and sparse, deterministic placement on taller contribution
  days, including two additional Deco accents where suitable. Explicit height
  settings and the building-detail toggle still override the defaults.
- Preserve the approved 650ms center-out splat, graph endpoints, interaction,
  and reduced-motion behavior. Keep experimental previews out of the package.

- Add the optional `/server` GitHub calendar loader and authenticated local JSON
  exporter, with complete static React and cached Next.js onboarding examples.
- Add a short MP4/GIF demo and a reproducible discovery/rehearsal/record workflow.
- Make the demo fit laptop viewports, enlarge palette targets, and keep panels bounded.
- Expose a readable contribution-table fallback on Canvas failure; clear stale
  selected-day text when replacing data. Remove unused projection helpers.
- Prevent delayed settings-panel autofocus from stealing focus from a control.
- Add a local secret-pattern check to CI and pin the tested Ubuntu runner version.

- Patch the source-map-js development dependency advisory; remove the unused
  icon dependency, fixture, old tracked concept art, and prototype assets.
- Replace the unsupported ESLint 9 toolchain with compatible ESLint 10 tooling.
- Harden input validation, custom palettes, React controlled settings, keyboard
  isolation, localization, accessibility data, renderer failure cleanup, and SSR.
- Verify the packed ESM package with strict NodeNext types and a clean consumer.
- Add cross-browser coverage, pinned CI actions, gated Pages deployment, and a
  manual verified OIDC publishing workflow. No publication has been performed.

- Promote the approved 650ms anchored center-out splat to the reusable Canvas,
  React, and custom-element implementations, with symmetric return timing.
- Default to 1.4× height with continuous count-based normalization, preserving
  the maximum-height cap and distinct heights for adjacent contribution counts.
- Preserve transparent bare embeds, fixed bounds, contained tooltips, reduced
  motion, pause/resume, and event-driven rendering; improve DPR-change cleanup.
- Use the actual reusable component and dated public contribution snapshot in
  the demo. Keep experimental dialogs and overlay code out of the package.
- Build library artifacts on Git dependency installation with `prepare`.
- Keep touch-toggled views stable when the finger lifts off the screen.

## Initial 0.1.0 implementation (not yet published)

- Initial independent Canvas 2D renderer
- React wrapper and optional custom element
- Six semantic palettes and custom palette support
- Accessible contribution data, keyboard navigation, and reduced motion
- Responsive controls, interaction states, demo, tests, and package tooling
