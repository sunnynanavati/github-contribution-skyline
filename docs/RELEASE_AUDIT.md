# Public launch audit — 2026-10-20

## Subsequent privacy cleanup

The account-specific demo snapshot was removed after this audit. The current
demo, recordings, poster, visual snapshots, and motion fixture use independently
generated synthetic data, with no account identity supplied to the component.
Personal author-name metadata was also removed. Repository/install URLs still
identify the GitHub repository owner; Git commit authors and earlier snapshots
remain in existing history. This cleanup does not claim to anonymize repository
ownership or erase previously published revisions. A history rewrite requires
separate approval and cannot recall existing clones or cached media.

The follow-up push's dependency gate also detected newly indexed advisory
[GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv).
The development toolchain now requires patched Vite 7.3.7, with the lockfile
updated and a clean dependency install/audit. No renderer code or runtime
dependencies changed.

The results below describe the preceding audit, not a new privacy certification.

**Recommendation: 84/100, ready locally with publication gates remaining.** The
component, demo media, data-loading paths, and documentation pass the checks
below. At audit completion, the changes awaited commit/push and CI on that exact revision
before public distribution. This is an engineering review, not a security
certification.

## Scope and exposure checks

Audited the production checkout based on `a671ee7`, with changes isolated on
`codex/public-launch-audit`. The separate experiment worktree remains untouched.
No npm package, GitHub release, live site, or LinkedIn post was published.

- `npm audit`: **zero known vulnerabilities** in the locked dependency tree.
- `npm run audit:secrets`: **no common credential patterns** in current
  non-ignored files, generated library/demo bundles and source maps, or all
  **20 reachable commits**. The scanner never prints matched values or uploads
  repository contents. This is a pattern scan, not proof that every possible
  secret format is absent.
- GitHub reports **secret scanning and push protection enabled**, with **no
  secret-scanning alerts returned**. Provider validity checks and non-provider
  patterns are not enabled.
- No repository `.env` or `.npmrc` was found; the checked-in example environment
  file contains empty/placeholder values only.
- The renderer and demo perform no GitHub requests or token handling. The
  optional loader makes an authenticated POST to GitHub's fixed GraphQL endpoint,
  rejects redirects, times out after ten seconds, and sanitizes failures.
- A real request for `octocat` returned that account's **367 contribution days**
  and exact counts. The exported JSON contains only username, contribution
  days/levels, and a total.
- A packed-library Next.js 16.4.2 build used that real account, prerendered with
  **one-hour revalidation**, and passed TypeScript. The actual server credential
  was checked against **19 generated client assets** and appeared in none.
  Authentication stayed in process memory; no credential was written to the repo.

## Improvements made

| Area | Result |
| --- | --- |
| Loading your own calendar | Added `fetchGitHubContributions` under the optional `/server` export, and `npm run --silent data:github -- USERNAME [year]` for static JSON using local/server authentication. No third-party contribution proxy or new runtime dependency. |
| Documentation | Reworked the README around static React and server-loaded usage, transparent/card variants, refresh behavior, controlled settings, token placement, and Git installation. Added a complete cached Next.js example and environment template. |
| Failure behavior | Canvas/runtime failures now offer an expandable, visible daily contribution table. The screen-reader representation remains available in normal rendering. |
| Data updates | Replacing data clears obsolete hover, selection, and live-region text. Dates, exact counts, levels, and relative height normalization remain validated. |
| Keyboard focus | Fixed a real WebKit race where delayed panel autofocus could steal focus from an already selected slider. Added a regression and confirmed the browser check passes. |
| Demo usability | Fit the card and palette tray into laptop-height viewports, kept popovers bounded, and enlarged palette/copy touch targets. All six visual baselines were reviewed and updated for this intentional framing change. |
| Cleanup | Removed unused legacy projection helpers and unnecessary stored constructor fields. Removed their obsolete test; retained meaningful geometry and approved-motion regressions. Experiments, build outputs, and temporary captures remain ignored. |
| Repository demo | Added a 20-second H.264 MP4, a shorter optimized GIF loop, poster, recording script, and concise LinkedIn draft. Media and examples are excluded from npm. |
| CI | Added the local secret-pattern gate with full-history checkout, retained pinned official action SHAs/manual publishing, and pinned Ubuntu 24.04 to avoid unreviewed runner-image migration. |

The approved 650ms center-out animation, symmetric return, 1.4× height default,
continuous count curve, fixed foundations, six palettes, and sparse roofs were
not retuned. The 288-frame geometry fingerprint still matches:
`1c4dbe97d4ce580e194fb65833b3966d05fd49698a26f85524e73068fe495962`.

## Verification results

| Check | Result |
| --- | --- |
| Clean dependency install | `npm ci` passes. |
| Lint and types | `npm run lint` and `npm run typecheck` pass. |
| Unit regressions | `npm test`: **58 passed**, 11 files. Covers loader error/redaction/browser guards, data normalization, palettes, lifecycle, focus, settings, motion, and heights. |
| Library and demo build | `npm run build` passes. ESM, JS source maps, declarations, and static demo generated. |
| Actual tarball consumer | `npm run verify:package` passes a fresh install, strict NodeNext types, SSR and all entry-point imports, client directive, every emitted source-map path, file allowlist, and size limit. |
| Browsers | `npm run test:e2e -- --workers=2`: **51 passed**, 21 intentional project-specific skips, no failures after the focus fix. Chromium, Firefox, WebKit, and mobile Chromium emulation. |
| Accessibility | Automated axe checks report no violations in tested normal, palette/settings, and expanded Canvas-fallback states. Keyboard, touch, Escape/focus, reduced motion, and contained tooltips pass. |
| Responsive review | Reviewed desktop/mobile captures and six palette snapshots; no horizontal overflow. Laptop demo framing and settings remain bounded. |
| Performance lifecycle | Existing tests confirm stopped frames after settling, offscreen/hidden pauses, cleanup, stable endpoints, and immediate reduced motion. No physical-device FPS claim is made. |
| Real data and Next.js | Local JSON export and real GitHub account smoke test pass. The copy-in example builds with the packed library in an isolated Next.js app, with no root Next.js dependency. |
| Dependency/secret audits | Zero known dependency advisories; no common credential findings in repository/history/build output or GitHub alerts. |
| Package dry run | `npm pack --dry-run` passes: **32 files**, about **74.2 kB compressed / 260.7 kB unpacked**. No media, examples, fixtures, tests, experiments, or credentials. |
| Demo media | Discovery and rehearsal completed before recording. MP4 verified as **1280×720, H.264/yuv420p, 20.32s**, about 1.37 MB. README GIF is about 1.7 MB. Reviewed representative video frames. |
| Repository hygiene | `git diff --check` passes; YAML parses. No unrelated files were removed. At audit completion, new work awaited commit on the audit branch. |

The library uses the native Fetch API only in the optional server entry. React
and ReactDOM remain optional peers. The MIT-licensed Canvas implementation is
independent; no Reactiive source, shaders, assets, or utilities were introduced.
This is not a legal provenance certification.

The built Next.js app also hydrated successfully in Chromium with the real
account's 371 displayed days (including week padding), completed its keyboard
skyline-to-graph transition, and reported zero browser errors. Its temporary
server was stopped after verification.

## Remaining owner actions and limits

1. At audit completion, commit/push and CI on the new revision remained pending. The previously
   published main revision's [CI is green](https://github.com/sunnynanavati/github-contribution-skyline/actions/runs/38447910974),
   but the audit changes had only been verified locally. That caps this recorded audit at 84; consult the latest Actions run for subsequent verification.
2. Enable **private vulnerability reporting** before a public package launch so
   users have a usable private reporting channel. GitHub returned disabled.
   Main has no classic protection or rulesets; consider requiring CI for merges.
   Dependabot security updates are disabled, although scheduled dependency PRs
   and the explicit npm audit gate exist.
3. To share a live URL, enable **GitHub Pages** and set
   `ENABLE_GITHUB_PAGES=true`. No Pages site currently exists. The included
   GIF/MP4 and local/static demo are ready; a live hosted demo is not yet deployed.
4. npm still returned **404** for the working name on 2026-10-20. It is not
   reserved. Keep Git installation instructions until the first approved
   publication; npm account/2FA/trusted publisher setup remains an owner step.
5. Verify the target portfolio's background contrast and CSP, and do a physical
   touch-device / screen-reader pass before claiming universal accessibility or
   performance. Automated checks and emulation do not substitute for those.

See [RELEASING.md](RELEASING.md) for publication and rollback, and
[LAUNCH.md](LAUNCH.md) for the recording and post draft. The local preview remains
available through the development server. No remote settings or publication
were changed by this audit.
