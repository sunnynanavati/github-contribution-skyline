import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('demo backgrounds are independent of contribution colors, accessible, and persistent', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Light background', exact: true });
  const component = page.locator('[data-github-skyline]');
  const shell = component.locator('.shell');
  const stage = page.locator('.component-stage');
  const tray = page.locator('.palette-tray');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(shell).toHaveCSS('box-shadow', 'none');
  await expect(shell).toHaveCSS('border-top-color', 'rgb(17, 18, 18)');
  const bounds = await shell.boundingBox();
  const trayBounds = await tray.boundingBox();
  const colors = () => component.locator('.legend-colors .swatch').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
  for (const palette of ['green', 'red', 'mono', 'orange', 'blue', 'yellow']) {
    await tray.locator(`[data-palette="${palette}"]`).click();
    const darkRamp = await colors();
    expect(darkRamp).toHaveLength(5);
    await toggle.focus(); await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(stage).toHaveCSS('background-color', 'rgb(245, 246, 242)');
    await expect(shell).toHaveCSS('background-color', 'rgb(245, 246, 242)');
    await expect(shell).toHaveCSS('border-top-color', 'rgb(245, 246, 242)');
    await expect(shell).toHaveCSS('box-shadow', 'none');
    expect(await colors()).toEqual(darkRamp);
    expect(await shell.boundingBox()).toEqual(bounds);
    expect(await tray.boundingBox()).toEqual(trayBounds);
    await toggle.click();
    await expect(stage).toHaveCSS('background-color', 'rgb(17, 18, 18)');
    await expect(shell).toHaveCSS('background-color', 'rgb(17, 18, 18)');
    await expect(shell).toHaveCSS('border-top-color', 'rgb(17, 18, 18)');
  }
  await toggle.click();
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Component description' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Usage code' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  await page.screenshot({ path: info.outputPath('light-background.png'), fullPage: true });
  const canvas = component.locator('canvas');
  const pixels = () => canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL());
  const skyline = await pixels();
  if (info.project.name.includes('mobile')) await canvas.tap();
  else await canvas.hover();
  await expect.poll(pixels).not.toBe(skyline);
  if (info.project.name.includes('mobile')) await canvas.tap();
  else await page.mouse.move(0, 0);
  await expect.poll(pixels).toBe(skyline);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('background switching tolerates unavailable storage', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Disabled', 'SecurityError'); } });
  });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Light background', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});
