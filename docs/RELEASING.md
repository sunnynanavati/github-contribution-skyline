# Release checklist

## Owner setup (one time)

- Confirm the npm account/package name and enable account two-factor authentication.
  `github-contribution-skyline` returned registry 404 during the 2026-10-13 audit;
  this is not a reservation or proof of ownership.
- Enable GitHub private vulnerability reporting under Settings → Code security.
  It was disabled during the audit. Verify the private reporting link works before
  telling users it is available. Never ask reporters to post exploits publicly.
- Protect `main` and require the CI check before merging.
- Create the `npm-release` GitHub environment with required maintainer approval
  and restrict it to `main`.
- After the first npm publication, configure the package's trusted publisher:
  owner `sunnynanavati`, repository `github-contribution-skyline`, workflow
  `release.yml`, environment `npm-release`, with permission to publish directly.
  Node 24 includes a compatible npm CLI; trusted publishing requires npm 11.5.1+
  and Node 22.14+ ([npm documentation](https://docs.npmjs.com/trusted-publishers/)).

No account, repository setting, token, publication, or release is created by the
local audit. Never put a token in source, fixtures, browser storage, or commands.

## Before every release

1. Work from a reviewed clean commit on `main`. Bump the version intentionally;
   npm versions are immutable. Update the changelog/release date.
2. Use Node 24 LTS, then run:

   ```sh
   npm ci
   npx --no-install playwright install --with-deps chromium firefox webkit
   npm audit --audit-level=moderate
   npm run verify
   npm run test:e2e
   npm pack --dry-run
   git diff --check
   git status --short
   ```

3. Review package contents: only `dist`, `README.md`, `LICENSE`, `CHANGELOG.md`,
   and package metadata. There are no runtime dependencies. No experiments,
   screenshots, tokens, local paths, demo data, or development fixtures may ship.
4. Wait for CI on the exact commit. Smoke-test the packed component on the target
   portfolio, including its background contrast and a physical touch device.
5. Obtain explicit maintainer approval. The `Publish npm release` workflow is
   **manual only**, requires `confirm=publish` and the exact `version`, and runs
   CI first. It cannot publish from experimental branches or on a normal push.

## First publication

Trusted publishing normally needs an existing npm package to configure. The
owner can bootstrap the first version locally, only after approval and the full
checklist, using their own authenticated account and 2FA:

```sh
npm login
npm publish --access public
```

The first local publish need not request CI provenance; future approved workflow
publishes use `--provenance` and OIDC. No long-lived `NPM_TOKEN` is needed by the
configured workflow. Do not run these commands just to test the setup.

## Optional GitHub Pages

The package does not depend on Pages. To enable the public demo:

1. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → Variables:
   set `ENABLE_GITHUB_PAGES=true`.
3. Manually run `Deploy demo to GitHub Pages` from `main`, or let it follow a
   successful main-branch CI run. PR/fork runs cannot trigger deployment.

Until opted in, the deployment job skips instead of repeatedly failing on an
unconfigured Pages site.

## Rollback

For Git consumers, reinstall the previous known-good commit SHA and rebuild the
site. For npm consumers, pin the previous known-good version. Do not rewrite Git
history or reuse/unpublish a released npm version as a routine rollback. Revert
the faulty commit on a branch, rerun verification, and publish a new patch only
after approval. Deprecate a bad version with an explanatory message if needed.
