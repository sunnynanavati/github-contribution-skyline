# Sharing the skyline

Use `skyline-demo.mp4` for a video post. It is an 18-second, silent 1280×720 H.264
recording of the actual component, showing the hover transition, return motion,
tooltips, and palette changes. `skyline-demo.gif` is the shorter README loop.
The preview and recording use synthetic sample data, not anyone's contribution
history. No account is preconfigured and the recording is not a live data feed.

## Suggested LinkedIn caption

I built a component that turns GitHub contribution graphs into tiny skylines.

Every day is a building. More contributions make it taller. Hover and the city
flattens back into the familiar GitHub calendar, with a wave moving from the
center outward. It works with touch and the keyboard too.

I built it with an original Canvas 2D renderer, wrapped it for React and Web
Components, and added six palettes. You can bring your own GitHub activity using
static JSON or a server-side loader. Tokens stay on the server.

Code and setup: https://github.com/sunnynanavati/github-contribution-skyline

I'd love to see how people use it in their portfolios.

## Before posting

- Push the reviewed changes and wait for CI on that commit. Check the README's
  GIF and MP4 links from the public repository.
- Use the repository link above. There is no npm release yet; don't advertise
  `npm install github-contribution-skyline` until one has actually been published.
- If you want a live demo link as well, enable GitHub Pages and opt into the
  existing Pages workflow using `ENABLE_GITHUB_PAGES=true`; see `RELEASING.md`.
- Enable private vulnerability reporting so the security policy has a usable
  private contact channel. No account setting is changed by the local audit.

The full recording, GIF, poster, and this note belong in the repository, not the
npm package. Temporary recordings, personal exports, and experiments stay local.
No LinkedIn post, release, or npm publication is created by the recorder.
