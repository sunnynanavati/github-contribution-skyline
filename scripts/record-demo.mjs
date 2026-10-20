/* global document */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { URL } from 'node:url';

// Discover -> rehearse -> record. Only captured product media is checked in.
const base = process.env.DEMO_URL ?? 'http://127.0.0.1:4181/';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw new Error('Record from the local demo server.');
const discover = process.argv.includes('--discover');
const rehearse = process.argv.includes('--rehearse');
const output = resolve('output/demo');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1,
  reducedMotion: 'no-preference', ...(discover || rehearse ? {} : { recordVideo: { dir: output, size: { width: 1280, height: 720 } } }) });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let video;
try {
  await page.goto(base);
  await page.locator('.component-preview canvas').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  if (discover) {
    console.log(JSON.stringify(await page.locator('.stage-actions button, .palette-tray button').evaluateAll(nodes => nodes.map(node => ({
      text: node.textContent.trim(), label: node.getAttribute('aria-label'), palette: node.getAttribute('data-palette'),
    }))), null, 2));
    await page.screenshot({ path: resolve(output, 'discovery.png') });
  } else {
    const shell = page.locator('.component-preview .shell');
    const bounds = await shell.boundingBox();
    if (!bounds || bounds.y + bounds.height > 640) throw new Error('The demo card does not fit the recording frame.');
    await page.evaluate(() => {
      const cursor = document.createElement('div'); cursor.id = 'demo-cursor';
      cursor.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;width:24px;height:24px;left:1248px;top:240px;filter:drop-shadow(0 1px 2px #111)';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '24'); svg.setAttribute('height', '24'); svg.setAttribute('viewBox', '0 0 24 24');
      const path = document.createElementNS(svg.namespaceURI, 'path');
      path.setAttribute('d', 'M5 3L19 12L12 13L9 20L5 3Z'); path.setAttribute('fill', '#eef0ee'); path.setAttribute('stroke', '#111212');
      svg.append(path); cursor.append(svg); document.body.append(cursor);
      document.addEventListener('mousemove', event => { cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`; });
      const caption = document.createElement('div'); caption.id = 'demo-caption';
      caption.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99998;pointer-events:none;text-align:center;padding:10px 20px;background:#111212ed;color:#eef0ee;font:500 16px/1.5 system-ui;opacity:0';
      document.body.append(caption);
    });
    const pause = ms => page.waitForTimeout(rehearse ? 80 : ms);
    const caption = async text => { await page.locator('#demo-caption').evaluate((node, text) => { node.textContent = text; node.style.opacity = text ? '1' : '0'; }, text); };
    const move = (x, y) => page.mouse.move(x, y, { steps: 18 });
    await move(1248, 240);
    await caption('Step 1 — One day. One building.'); await pause(1800);
    await caption('Step 2 — Hover to flatten.');
    await move(bounds.x + bounds.width * .55, bounds.y + 90);
    await page.waitForFunction(() => document.querySelector('[data-github-skyline]')?.shadowRoot?.querySelector('.hint')?.textContent === 'MOVE OUT TO RAISE');
    await pause(2000);
    await move(bounds.x + bounds.width * .55, bounds.y + bounds.height * .52);
    await pause(1100);
    await move(1248, 240); await pause(1600);
    await caption('Step 3 — Six palettes. Your contributions.');
    for (const name of ['GitHub green', 'Ocean blue', 'Monochrome', 'Signal red']) {
      const button = page.locator('.palette-tray').getByRole('button', { name });
      if (!await button.isVisible()) throw new Error(`Demo control is missing: ${name}`);
      const box = await button.boundingBox();
      await move(box.x + box.width / 2, box.y + box.height / 2); await pause(250);
      await button.click();
      if (await button.getAttribute('aria-pressed') !== 'true') throw new Error(`Palette selection failed: ${name}`);
      await pause(900);
    }
    await move(1248, 240); await caption(''); await pause(900);
    await move(bounds.x + bounds.width * .5, bounds.y + 90); await pause(1400);
    await move(1248, 240); await pause(1800);
    if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
    if (!rehearse) await page.screenshot({ path: resolve('docs/preview.png') });
    console.log(rehearse ? 'Rehearsal passed: hover, return, palette controls, fixed framing, and no browser errors.' : 'Recording passed.');
  }
  video = page.video();
} finally {
  await context.close();
  if (video) await video.saveAs(resolve(output, 'skyline-demo.webm'));
  await browser.close();
}
if (video) {
  const raw = resolve(output, 'skyline-demo.webm');
  const mp4 = resolve('docs/skyline-demo.mp4');
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '0.5', '-i', raw,
    '-an', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '0.2', '-t', '7.2', '-i', mp4, '-filter_complex',
    'crop=1120:570:80:112,fps=15,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
    '-loop', '0', resolve('docs/skyline-demo.gif')], { stdio: 'inherit' });
  console.log('Saved docs/skyline-demo.mp4 and docs/skyline-demo.gif.');
}
