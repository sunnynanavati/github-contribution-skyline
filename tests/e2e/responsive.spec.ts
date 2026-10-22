import { expect, test } from '@playwright/test';

test('phone preview stays compact and keeps its bounds through a round-trip and rotation', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const component = page.locator('[data-github-skyline]');
  const shell = component.locator('.shell');
  const canvas = component.locator('canvas');
  const tray = page.locator('.palette-tray');
  const pixels = () => canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL());
  for (const [width, height] of [[390, 844], [320, 740], [844, 390], [390, 844]]) {
    await page.setViewportSize({ width: width!, height: height! });
    await expect.poll(() => canvas.evaluate(node => Math.abs((node as HTMLCanvasElement).width / Math.min(devicePixelRatio, 2) - node.parentElement!.getBoundingClientRect().width))).toBeLessThanOrEqual(1);
    await page.mouse.move(0, 0);
    const box = (await shell.boundingBox())!;
    const trayBox = (await tray.boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(420);
    expect(box.height / box.width).toBeLessThan(1.1);
    expect(box.y + box.height).toBeLessThan(trayBox.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Focus itself does not switch views; Enter works on phones and desktop.
    await shell.evaluate(node => (node as HTMLElement).focus({ preventScroll: true }));
    const skyline = await pixels();
    await page.keyboard.press('Enter');
    await expect.poll(pixels).not.toBe(skyline);
    expect(await shell.boundingBox()).toEqual(box);
    expect(await tray.boundingBox()).toEqual(trayBox);
    await page.keyboard.press('Enter');
    await expect.poll(pixels).toBe(skyline);
    await page.getByRole('button', { name: 'Light background', exact: true }).focus();
  }
  if (info.project.name === 'chromium') {
    await expect(component).toHaveScreenshot('phone-skyline.png', { animations: 'disabled', maxDiffPixelRatio: .02 });
  }
  await page.screenshot({ path: info.outputPath('phone-proportions.png'), fullPage: true });
});
