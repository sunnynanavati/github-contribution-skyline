# Contributing

Thank you for improving GitHub Contribution Skyline.

1. Fork and clone the repository.
2. Install dependencies with `npm install`.
3. Create a focused branch.
4. Install browsers with `npx --no-install playwright install chromium firefox webkit`.
5. Run `npm run verify`, `npm run test:e2e`, and `npm audit`.
6. Open a pull request describing the behavior change and its accessibility impact.

Keep the renderer framework-independent. New visual options must have a clear data or usability purpose, work with reduced motion, and include tests. Never include GitHub tokens or real private contribution data in fixtures.

Do not add experiments, tuner pages, prototype screenshots, or concept art to
release branches. Keep them in ignored local folders or a separate worktree.
Intentional visual changes require reviewing screenshots before updating their
baselines. Release and Pages setup is documented in `docs/RELEASING.md`.
