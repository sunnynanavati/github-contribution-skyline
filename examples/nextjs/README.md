# Your GitHub skyline in Next.js

This is a copy-in example for an existing App Router project, not another app or
runtime dependency shipped with the component.

1. Install `github-contribution-skyline` from this repository as shown in the root
   README. Use Node 24 LTS and your app's supported React 18.2/19 version.
2. Copy `.env.example` to your app's `.env.local`, set `GITHUB_USERNAME` to your
   account, and set `GITHUB_TOKEN` to a token with the permissions needed for your
   contribution data. Keep both variables server-side. Never use a public env
   prefix. Configure the same secrets in your host's environment settings.
3. Copy `app/page.tsx` into your app (or use it for another route), then run your
   usual development/build command. It renders the real user's calendar, caches
   it for one hour, and shows a safe error fallback if GitHub is unavailable.

The example uses `unstable_cache`, supported by App Router projects without Cache
Components enabled. Next.js 16 projects already using Cache Components should
use `use cache` / `cacheLife` for the same server caching policy instead; see
[Next.js caching documentation](https://nextjs.org/docs/app/api-reference/functions/unstable_cache).
Do not pass the token as an argument to a cached client-facing function or React
component. Only the helper's safe result (username, counts/levels, total) crosses
the client boundary.

The helper makes one GitHub request when called. The framework cache is what
limits requests and refreshes the calendar. New data is fetched on a request
after the cache becomes stale; this does not create a background polling job.
Private contribution visibility depends on your token and GitHub profile
settings. Publish only the aggregate data you intend to show.

To embed on your own page background, remove `variant="card"`. To change the
theme, choose `green`, `red`, `mono`, `orange`, `blue`, or `yellow`. The `username`
prop only labels the visualization; changing data requires passing a new array.

References: [GitHub authentication](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql),
[contribution calendar fields](https://docs.github.com/en/graphql/reference/users#contributioncalendar).
