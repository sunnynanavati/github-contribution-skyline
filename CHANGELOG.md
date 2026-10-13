# Changelog

## Unreleased

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

## 0.1.0 - 2026-09-26

- Initial independent Canvas 2D renderer
- React wrapper and optional custom element
- Six semantic palettes and custom palette support
- Accessible contribution data, keyboard navigation, and reduced motion
- Responsive controls, interaction states, demo, tests, and package tooling
