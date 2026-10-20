# GitHub Contribution Skyline

An accessible, themeable GitHub contribution graph rendered as a three-dimensional city skyline. Every day is a building, exact contribution counts drive height, and the skyline can transition back to the familiar flat calendar.

![A contribution skyline flattens into a GitHub calendar on hover, then rises again and changes palettes](https://raw.githubusercontent.com/sunnynanavati/github-contribution-skyline/main/docs/skyline-demo.gif)

[Watch or download the short MP4 demo](https://github.com/sunnynanavati/github-contribution-skyline/blob/main/docs/skyline-demo.mp4) · [Source](https://github.com/sunnynanavati/github-contribution-skyline) · [MIT license](LICENSE)

An original Canvas 2D renderer with React and Web Component wrappers. Embed just
the skyline on your own background, or opt into a complete card. No runtime
dependencies. Your GitHub data stays separate from the renderer; an optional
server helper loads a calendar using your own username.

## Features

- Exact contribution counts and UTC-safe dates
- Event-driven rendering that stops when transitions settle
- Hover, touch, and keyboard view switching
- Semantic contribution table and live keyboard announcements
- Six built-in semantic palettes and custom palette support
- Art Deco crowns, pyramids, mechanical penthouses, antennas, and conventional spires
- Loading, empty, invalid-data, Canvas-unavailable, and renderer-error states
- Responsive sizing, capped device pixel ratio, reduced motion, and offscreen pausing
- React and Web Component entry points

## Install

Version 0.1.0 is not yet published to npm. Install the reviewed GitHub revision:

```sh
npm install github:sunnynanavati/github-contribution-skyline#main
```

Use a commit SHA instead of `main` for a reproducible version. Git dependencies
build their library files using `prepare` (Node 20.19+). No GitHub token is needed
to install this public repository. Re-run the install command, commit your app's
updated lockfile, and rebuild/redeploy when upgrading; existing sites do not
automatically change when this repository changes.

After the maintainer publishes 0.1.0, `npm install github-contribution-skyline`
will work. React users need React and ReactDOM 18.2+ or 19.x in their app. These
are optional peers so framework-independent consumers do not install React.
Use Node 24 LTS for development/releasing (Git installs require Node 20.19+).

## Use your own GitHub contributions

Choose one of these paths. `username` labels the component; it does **not** fetch
data on its own. Contributions include commits, issues, pull requests, and other
GitHub activity, so the displayed number is not a commit-only total.

### React or any static website: export JSON once

In a clone of this repository, with [GitHub CLI](https://cli.github.com/) installed:

```sh
npm ci
gh auth login
npm run --silent data:github -- YOUR_USERNAME > github-contributions.json
```

The script uses your existing GitHub CLI login (or a server/local `GITHUB_TOKEN`
environment variable). It writes only a username, exact day counts/levels, and
the total. Copy that JSON into your website. No credential is included in the
file or needed when the site runs. Add a year, such as `2025`, after the username
to export a calendar year instead of the rolling contribution year.

```tsx
import { GitHubSkyline } from 'github-contribution-skyline/react';
import type { GitHubContributions } from 'github-contribution-skyline/server';
import activity from './github-contributions.json';

// JSON imports infer level as number; the component validates the data at runtime.
const data = activity as GitHubContributions;
export function Activity() {
  return <GitHubSkyline {...data} palette="red" />;
}
```

The default is transparent, with no card, username text, settings button, or
legend. Add `variant="card"` for the complete presentation. Pass a fresh
`contributions` array to update the skyline; there is no built-in polling or
third-party GitHub proxy. Refresh the JSON and rebuild whenever you want new data,
or run that step in your own scheduled build.

### Next.js or another server: fetch by username

Keep `GITHUB_TOKEN` in the server's environment or local `.env.local`, never in
`NEXT_PUBLIC_*`, `VITE_*`, a client component, or a prop. Choose the permissions
needed for your account; see [GitHub's authentication guide](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql).

```ts
// Server or build-time code only
import { fetchGitHubContributions } from 'github-contribution-skyline/server';

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('Set GITHUB_TOKEN on the server');

const activity = await fetchGitHubContributions({
  username: 'YOUR_USERNAME',
  token,
  // year: 2025, // optional; defaults to GitHub's rolling contribution year
});
// Pass only activity to <GitHubSkyline {...activity} />.
```

The helper validates the requested account and response, times out after ten
seconds, blocks browser execution, and omits credentials and raw response errors
from its result/errors. It makes one request per call. Cache the result on your
server to respect GitHub rate limits. The complete
[Next.js example](https://github.com/sunnynanavati/github-contribution-skyline/blob/main/examples/nextjs/README.md) includes hourly caching, an error
fallback, and environment setup. For public sites, review which aggregate
private contribution counts your token/profile settings make visible.

### Already have contributionCalendar data?

Use the pure adapter; it performs no requests:

```ts
import { fromGitHubContributionCalendar } from 'github-contribution-skyline';

const contributions = fromGitHubContributionCalendar(calendar);
```

## React API

`contributions` is required. All other props are reactive. `initialView` is read when the renderer is created; use the imperative handle for later view changes.

In React, supplying `palette`, `heightScale`, or `buildingDetail` makes that
setting controlled. Update it in its matching change callback to accept changes
from the Details panel; without a callback, the supplied value stays fixed.
Omitting the prop lets the panel manage that setting internally, including
across parent rerenders. The imperative core/custom-element APIs keep their own
settings until `update()` or an attribute change overrides them.

```tsx
import { useState } from 'react';

const [heightScale, setHeightScale] = useState(1.4); // inside your component
<GitHubSkyline contributions={days} variant="card"
  heightScale={heightScale} onHeightScaleChange={setHeightScale} />
```

The center-out flattening transition takes 650ms in either direction. Interrupted
hovers reverse smoothly from the current pose. The component and surrounding
layout retain their bounds throughout.

Default height is **1.4×**. Explicit props override defaults. Body
height uses the exact count relative to the busiest day, with a continuous 0.75
power curve and a 12% minimum for active days. Adjacent counts remain distinct;
color levels do not determine height. Empty days remain low tiles.

`SKYLINE_DEFAULTS` exports the read-only defaults for inspection.

```tsx
import { useRef } from 'react';
import type { GitHubSkylineHandle } from 'github-contribution-skyline/react';

const skyline = useRef<GitHubSkylineHandle>(null); // inside your component

<GitHubSkyline ref={skyline} contributions={days} />
<button onClick={() => skyline.current?.setView('graph')}>Show graph</button>
```

## Data format

```ts
type ContributionDay = {
  date: string;
  count: number;
  level?: 0 | 1 | 2 | 3 | 4;
};
```

Dates use `YYYY-MM-DD` and are interpreted in UTC. Missing dates inside the displayed period are filled with zeroes. Duplicate dates are merged by summing counts, and the last explicit level wins. If levels are omitted, the package derives relative quartiles from the supplied exact counts. Input can span a partial year or up to 54 displayed calendar weeks.

## Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `contributions` | `ContributionDay[]` | required | Exact daily contribution data |
| `username` | `string` | empty | Account label above the skyline |
| `totalContributions` | `number` | computed | Optional server-provided total |
| `palette` | palette name or custom palette | `green` | Complete semantic color theme |
| `heightScale` | `number` | `1.4` | Height multiplier, clamped to `0.4-2` |
| `buildingDetail` | `boolean` | `true` | Enables sparse architectural roof details on selected high-rises |
| `variant` | `bare`, `card` | `bare` | Transparent skyline-only embed or complete themed card |
| `flattenMode` | `auto`, `hover`, `press`, `always`, `never` | `auto` | Input behavior for changing views |
| `initialView` | `skyline`, `graph` | `skyline` | Initial renderer view |
| `showControls` | `boolean` | `true` | Displays the Details panel in the `card` variant |
| `showLegend` | `boolean` | `true` | Displays the contribution ramp in the `card` variant |
| `showLabels` | `boolean` | `true` | Displays calendar labels in graph view |
| `locale` | `string` | `en-US` | Date and number locale |
| `weekStartsOn` | `0`, `1` | `0` | Sunday or Monday alignment |
| `ariaLabel` | `string` | descriptive default | Accessible region name |
| `maxDevicePixelRatio` | `number` | `2` | Canvas-resolution cap, clamped to `1-4` |
| `status` | `ready`, `loading`, `error` | `ready` | External loading state |
| `errorMessage` | `string` | safe default | User-facing loading error |
| `reducedMotion` | `boolean` | system preference | Explicit motion override |
| `onDayHover` | callback | none | Receives hovered day or `null` |
| `onDaySelect` | callback | none | Receives a selected day |
| `onViewChange` | callback | none | Receives settled view state |
| `onPaletteChange` | callback | none | Supports controlled palettes |
| `onHeightScaleChange` | callback | none | Supports controlled height |
| `onBuildingDetailChange` | callback | none | Supports controlled detail |

## Palettes

Built-in names are `green`, `red`, `mono`, `orange`, `blue`, and `yellow`. A custom palette defines semantic surfaces instead of applying a hue filter:

```ts
const violet = {
  name: 'violet', label: 'Studio violet',
  surface: '#160d20', elevated: '#21132e', ink: '#f8efff', muted: '#bca4cd',
  border: '#513467', grid: '#2d183d', focus: '#c78aff',
  levels: ['#2d183d', '#593078', '#7d43a8', '#a864dc', '#d49aff'],
  texture: 'none',
} as const;
```

Advanced layout variables can be set on the host:

```css
.portfolio-skyline {
  --gcs-radius: 12px;
  --gcs-min-height: 520px;
  --gcs-shadow: 0 18px 50px rgb(0 0 0 / 0.16);
  --gcs-font-family: system-ui, sans-serif;
}
```

Internal DOM structure is not a theming API.

### Bare and card presentation

The default `bare` variant renders only the interactive skyline on a transparent Canvas. It keeps the semantic contribution table, keyboard behavior, tooltips, and reduced-motion support without imposing a card background or visible component chrome.

```tsx
<GitHubSkyline contributions={contributions} palette="red" />
```

Use `card` when you want the self-contained surface with identity text, flatten hint, optional Details panel, and legend:

```tsx
<GitHubSkyline
  contributions={contributions}
  username="YOUR_USERNAME"
  palette="red"
  variant="card"
/>
```

## Custom element

With a bundler, register the element and pass the same exported data. Add this
tag to your HTML:

```html
<github-contribution-skyline palette="blue" variant="card"></github-contribution-skyline>
```

```ts
import { defineGitHubSkyline } from 'github-contribution-skyline/element';
import type { GitHubContributions } from 'github-contribution-skyline/server';
import activity from './github-contributions.json';

defineGitHubSkyline();
const skyline = document.querySelector('github-contribution-skyline');
if (skyline) skyline.contributions = (activity as GitHubContributions).contributions;
```

The element emits `day-hover`, `day-select`, `view-change`, and `palette-change` custom events.

## Accessibility

The Canvas is decorative to assistive technology. Every displayed day, including zero-filled gaps, is exposed in a semantic table. The focusable component surface supports Enter and Space to switch views, arrow keys to navigate days in graph view, and Escape to close settings. Day selection is announced through a polite live region. Reduced-motion preferences replace animated transitions with immediate state changes, including when the system setting changes while mounted. Give multiple instances distinct `ariaLabel` values. Text/focus contrast is tested for built-in card themes; custom palettes and transparent embeds must be checked against the host site's background.

## Performance

The renderer draws only after data, size, palette, settings, or view changes. Its animation frame loop stops when a transition settles. Rendering pauses when the document is hidden or the component leaves the viewport. Cells are normalized and depth-sorted before drawing, and device pixel ratio is capped by default.

## SSR and Next.js

The React entry preserves its `'use client'` boundary and renders a stable host
during SSR. You can import it from a Next.js server page and pass serializable
data; the Canvas initializes after hydration. The optional `/server` entry is
only for server/build code. See the [complete Next.js example](https://github.com/sunnynanavati/github-contribution-skyline/blob/main/examples/nextjs/README.md).

## Browser support

Browser tests run on Chromium, Firefox, WebKit, and mobile Chromium emulation. The package targets current Chrome, Edge, Firefox, and Safari with Canvas 2D, custom elements, ResizeObserver, and Shadow DOM. Emulation is not a substitute for physical-device testing. `color-mix()` and backdrop filtering have solid-color fallbacks. The React wrapper does not require custom-element registration. Importing any entry point is SSR-safe; only create the renderer or element in a browser. The component injects scoped Shadow DOM styles; sites with restrictive inline-style CSP must allow these styles under their own policy.

## Troubleshooting

- Empty state: provide at least one valid contribution day.
- Invalid state: counts must be non-negative integers and the period cannot exceed 378 days.
- Missing private contributions: verify server token permissions and the GitHub profile setting.
- Blurry Canvas: raise `maxDevicePixelRatio` carefully; higher values use more memory.
- Next.js hydration: fetch server-side and render the wrapper from a client boundary.
- Username changed but data did not: `username` is a label; fetch/export that user's data and pass the new array.
- No automatic updates: refetch on your server or regenerate the JSON; the renderer never polls GitHub.
- Settings appear fixed: supplied setting props are controlled; update them in their callbacks or omit them.
- Installed changes not visible: update the Git dependency/lockfile and rebuild your app. Explicit props still override new defaults.
- Git install asks for SSH credentials: use the explicit HTTPS form, `npm install git+https://github.com/sunnynanavati/github-contribution-skyline.git#main`.

## Development

```sh
npm install
npx --no-install playwright install chromium firefox webkit
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm pack --dry-run
npm run verify:package
npm audit
npm run audit:secrets
```

`npm run verify` runs lint, types, unit tests, build, and tarball verification.
`verify:package` installs the actual tarball in a temporary consumer, checks
strict NodeNext types and SSR, and rejects unexpected files. Browser tests run
separately with `npm run test:e2e`. Their consumer fixture is not shipped.

Experiments, tuner pages, and old concept art are local-only and ignored by Git.
Existing history retains the earlier studies; they are excluded from the release
tree and npm tarball. Do not force-add them.

## Try and record the demo

```sh
git clone https://github.com/sunnynanavati/github-contribution-skyline.git
cd github-contribution-skyline
npm ci
npm run dev
```

Open `http://127.0.0.1:4180/`. The preview uses **synthetic sample data** generated
without a GitHub account, API response, or personal contribution history. No
username or token is preconfigured. The installed component contains no sample
calendar; pass your own `contributions` to render it. Follow the static JSON or
server-side setup above to connect your graph. `username` is only a display label,
not a connection setting. The interactive demo is bundled in `demo-dist` by
`npm run build` for static hosting.

The current demo ships no personal account calendar. Repository-owner URLs and
Git authorship still identify the project maintainer. Earlier public revisions
may contain the previous demo snapshot; removing current files does not erase
Git history or copies already downloaded.

The repository includes a small [animated preview](https://github.com/sunnynanavati/github-contribution-skyline/blob/main/docs/skyline-demo.gif) and
[MP4](https://github.com/sunnynanavati/github-contribution-skyline/blob/main/docs/skyline-demo.mp4) suitable for sharing. To regenerate them, install
FFmpeg and the locked Playwright Chromium browser, run the local server, then:

```sh
DEMO_URL=http://127.0.0.1:4180 npm run demo:record -- --discover
DEMO_URL=http://127.0.0.1:4180 npm run demo:record -- --rehearse
DEMO_URL=http://127.0.0.1:4180 npm run demo:record
```

Temporary captures stay in ignored `output/`; only the reviewed preview and short
recording belong in `docs/`. They are excluded from the npm package.

## Release and demo deployment

See the [release checklist](https://github.com/sunnynanavati/github-contribution-skyline/blob/main/docs/RELEASING.md).
Pushing code does not publish to npm. The release workflow is manual, main-only,
requires an exact version confirmation, runs the complete verification workflow,
and uses npm trusted publishing instead of a stored long-lived token.

## Contributing and security

See [contribution instructions](https://github.com/sunnynanavati/github-contribution-skyline/blob/main/CONTRIBUTING.md), [code of conduct](https://github.com/sunnynanavati/github-contribution-skyline/blob/main/CODE_OF_CONDUCT.md), and [security policy](https://github.com/sunnynanavati/github-contribution-skyline/blob/main/SECURITY.md).

## Attribution and independence

The interaction concept was inspired by GitHub contribution visualizations, including Reactiive's GitHub Terrain demo. This package is an independent Canvas 2D implementation. It does not contain or redistribute Reactiive source code, shaders, constants, or utilities.

## License

MIT. See [LICENSE](LICENSE).
