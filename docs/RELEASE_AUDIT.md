# Release audit — 2026-10-13

**Recommendation at audit completion: 84/100, launchable with caveats.** The local component/package
passes the release checks below. Public npm publication is still gated on owner
setup and CI for the exact reviewed commit. This is an engineering audit, not a
security certification or a guarantee that no defects remain.

## Scope

- Audited the production checkout based on `231da911c7cfbec9d11711f26c95838dc4c13fa6`,
  with fixes on `codex/release-audit`.
- Covered the original Canvas 2D engine, React wrapper, custom element, public
  types, data adapter, demo, tarball, documentation, and GitHub workflows.
- No server, database, authentication, payment, or background-job service is
  shipped by this package. GitHub fetching and token storage belong in the
  consuming application's server/build pipeline, not the renderer.
- Did not change the separate motion/tuner experiment worktree. No experiment
  code was promoted. The approved motion/default-height regression is unchanged.
- No repository source was uploaded to an external scanner. npm received
  dependency audit metadata; GitHub checks were read-only. No publication,
  release, remote push, or account-setting changes were performed.

## Findings fixed

| Priority | Finding | Resolution / evidence |
| --- | --- | --- |
| High, development dependency | `source-map-js@1.2.1` was affected by [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). | Updated the locked dependency to 1.2.2. Full and production-only npm audits report zero known vulnerabilities. The package has no direct runtime dependencies. |
| Medium, distribution | Extensionless declaration imports failed strict NodeNext consumption; the element entry read `HTMLElement` at import time on servers. | ESM-compatible declaration imports, SSR-safe entry points, preserved React client directive, and a fresh tarball consumer test. |
| Medium, input correctness | Unsafe counts, malformed adapter/theme data, inherited object names, and invalid locales were not consistently handled. | Validate safe integers, date spans, totals, weeks, levels, palettes, texture, and locale; display recoverable invalid-data states. Custom names never enter CSS selectors. |
| Medium, integration | React rerenders could reset uncontrolled settings or recreate the scene unnecessarily; supplied settings were not consistently controlled. | Reactive option diffing, explicit controlled/uncontrolled behavior, StrictMode and rerender tests. |
| Medium, lifecycle | Renderer errors could escape or leave active resources; DPR failures could reattach a listener after teardown. | Error boundary inside the renderer, resource cleanup, recoverable state, and failure/DPR/pause/resume/reduced-motion tests. |
| Medium, accessibility | Settings keys bubbled into graph navigation; a hidden legend could remain visible; filled days were missing from the semantic table. | Isolated keyboard handling, reliable hidden state, cancelled delayed focus, all displayed days in the table, visible focus, larger controls, contained settings. |
| Medium, release operations | Actions used mutable tags; publishing had no full verification prerequisite; Pages ran before the site was configured. | Commit-pinned actions, explicit version confirmation, reusable CI before manual main-only publishing, OIDC setup instructions, opt-in gated Pages deployment. |
| Low, maintenance | ESLint 9 emitted an unsupported-version warning. | Updated compatible lint tooling to ESLint 10; lint and types pass. Other major toolchain upgrades were not applied indiscriminately. |
| Low, bloat | Old concepts/prototypes, an unused generated fixture, and a large icon package were unnecessary for the release. | Untracked about 6.3 MB of historical assets, keeping local files and history; ignored future experiments; removed the unused fixture and icon dependency. Three demo icons are inline SVGs. |
| Low, presentation | Demo toolbar overlap in short windows, unhandled clipboard rejection, and incorrect weekday localization/alignment. | Reserved demo controls space, actionable clipboard fallback, cached localized labels and Monday-first alignment regression test. |

## Verification

Local environment: macOS, Node 20.20.2, npm 10.8.2. CI is configured for Node 24.

| Check | Result |
| --- | --- |
| `npm ci` | Pass; reproducible clean install and library preparation. |
| `npm run lint` | Pass, ESLint 10. |
| `npm run typecheck` | Pass. |
| `npm test` | 46 tests pass across 10 files. |
| `npm run build` | Pass; ESM library, declarations, JS source maps, and static demo. |
| `npm run verify:package` | Pass; actual tarball install, strict NodeNext types without skipLibCheck, SSR, all entry imports, client directive, file allowlist, and size budget. |
| `npm run test:e2e -- --workers=2` | 27 pass, 21 intentionally skipped project-specific cases; no failures. Desktop visual baselines run once on Chromium; mobile-only cases run on the mobile project. |
| `npm audit --audit-level=moderate` | Zero known vulnerabilities. |
| `npm audit --omit=dev --json` | Zero known production dependency vulnerabilities. |
| `npm pack --dry-run` | Pass; 27 files, about 68.1 kB compressed / 243 kB unpacked. |
| Workflow YAML parsing | All workflow, Dependabot, and issue-template YAML parses successfully. Remote workflow execution remains a separate gate. |
| `git diff --check` and `git diff --cached --check` | Pass. |
| Source/history secret-pattern checks | No common GitHub/AWS/private-key patterns found in current release files or 18 reachable commits. No absolute local paths found in release source or package source-map paths. Not an exhaustive secret scan. |

`npm run verify` aggregates lint, types, unit tests, build, and package checks.
Browser tests and dependency audit remain explicit additional gates.

### Accessibility, visuals, and performance

- Chromium, Firefox, WebKit, and Pixel 7 Chromium emulation pass integration
  checks. Automated axe checks report no violations in tested demo, consumer,
  fallback, and six built-in card-palette settings states.
- Reviewed desktop/mobile consumer captures and all six palette baselines.
  Tooltips at both horizontal edges stay within unchanged component bounds.
  Tests verify no horizontal page overflow and that the settings panel fits its
  host. Native keyboard, touch toggle, Escape, and focus restoration are covered.
- Bare embeds remain transparent. Green, red, monochrome, orange, blue, and yellow
  retain their existing visual ramps; no clouds, lighting, or extra selectors
  were introduced.
- Reduced motion resolves immediately. Frame-queue tests confirm no animation
  frames remain after settling, during offscreen/hidden pauses, or after cleanup.
  Pixel stability and exact return endpoints are checked in browsers.
- Approved geometry fingerprint across 288 sampled motion frames still matches
  `1c4dbe97d4ce580e194fb65833b3966d05fd49698a26f85524e73068fe495962`.
  No motion, height curve, roof geometry, or palette values were retuned.
- Core ESM output is about 58.1 kB / 16.1 kB gzip; React and custom-element entry
  files are about 1.9 kB and 2.7 kB before gzip. Demo build traversal dropped from
  4,585 modules to 44 after removing the icon dependency.
- This is lifecycle/performance regression evidence, not a physical-device FPS
  benchmark. Manual assistive-technology and real-phone testing remain advisable.

### Package contents and provenance

The allowlisted tarball contains `dist` JS, bundled JS source maps and declaration
files, `README.md`, `LICENSE`, `CHANGELOG.md`, and `package.json`. It contains no
demo data, screenshots, prototypes, tuner UI, tests, node_modules, or credentials.
Source maps intentionally include the original library source for debugging.
React/ReactDOM are optional peer dependencies; core consumers do not need them.

The code inspected is an independent Canvas 2D implementation. No Reactiive
imports, shaders, assets, or redistributed upstream implementation were found.
The MIT license covers this original implementation; attribution remains in the
README. This review is not a legal provenance certification.

## Release gates / owner actions recorded at audit completion

1. Review and commit this audit branch, then require green CI on that **exact
   commit** before merging or publishing. The existing main commit's [CI
   run succeeded](https://github.com/sunnynanavati/github-contribution-skyline/actions/runs/38396333360);
   these new changes have only been verified locally. This limits the score to 84.
2. Enable private vulnerability reporting. GitHub returned `enabled: false` during
   this audit. A usable private reporting channel should exist before public
   package launch; do not direct security reports into public issues.
3. Confirm npm account/name ownership, 2FA, `npm-release` environment approval,
   and trusted publishing. The package name returned registry 404, not a
   reservation. Authentication, publication, and provenance were not exercised.
4. Optional: enable GitHub Pages and set `ENABLE_GITHUB_PAGES=true`. The prior
   [Pages run failed](https://github.com/sunnynanavati/github-contribution-skyline/actions/runs/38396333653)
   because the site was not configured. This is not a package blocker.
5. Smoke-test the packed component in the actual portfolio after updating it.
   Check a physical touch device and screen reader, host-background contrast for
   transparent/custom themes, and the host's CSP. Shadow DOM styles are injected;
   a strict style policy needs an explicit host-approved integration strategy.

The [release checklist](RELEASING.md) includes owner setup, verification, first
publication, optional Pages deployment, and rollback. At audit completion the fixes
were uncommitted local changes; nothing was pushed or published during the audit.
Subsequent commits and their GitHub Actions runs are the source of truth for
integration status. Publication still requires separate explicit approval.
