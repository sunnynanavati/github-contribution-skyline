import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('minimal preview uses B, keeps its layout fixed, and has no study UI', async ({ page }, info) => {
  await page.goto('/');
  const card = page.locator('.bloom-preview');
  const tray = page.locator('.palette-tray');
  await expect(card).toHaveAttribute('data-profile', 'elastic');
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('slider')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replay' })).toHaveCount(0);
  const cardBounds = await card.boundingBox();
  const trayBounds = await tray.boundingBox();
  if (info.project.name.includes('mobile')) await card.tap();
  else await card.hover();
  await expect(card).toHaveAttribute('data-time', '600');
  await expect(card).toHaveAttribute('data-animating', 'false');
  expect(await card.boundingBox()).toEqual(cardBounds);
  expect(await tray.boundingBox()).toEqual(trayBounds);
  const draws = await card.getAttribute('data-draws');
  await page.waitForTimeout(200);
  expect(await card.getAttribute('data-draws')).toBe(draws);
  if (info.project.name.includes('mobile')) await card.tap();
  else await page.mouse.move(0, 0);
  await expect(card).toHaveAttribute('data-time', '0');
  await page.screenshot({ path: info.outputPath('minimal-preview.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(cardBounds!.y + cardBounds!.height).toBeLessThan(trayBounds!.y);
});

test('palettes, toolbar, reduced motion, and accessible day inspection still work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const card = page.locator('.bloom-preview');
  const canvas = card.locator('canvas');
  const initialPixels = await canvas.evaluate(c => (c as HTMLCanvasElement).toDataURL());
  for (const palette of ['green', 'red', 'mono', 'orange', 'blue', 'yellow']) {
    await page.locator(`.palette-tray [data-palette="${palette}"]`).click();
    await expect(card).toHaveCSS('background-color', 'rgb(17, 18, 18)');
  }
  expect(await canvas.evaluate(c => (c as HTMLCanvasElement).toDataURL())).not.toBe(initialPixels);
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('data-time', '600');
  await expect(card).toHaveAttribute('data-animating', 'false');
  for (const key of ['Home', 'End']) {
    await page.keyboard.press(key);
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    const tip = (await tooltip.boundingBox())!;
    const bounds = (await card.boundingBox())!;
    expect(tip.x).toBeGreaterThanOrEqual(bounds.x);
    expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width);
  }
  await expect(page.locator('.bloom-sr[aria-live]')).toContainText('contributions');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
  for (const name of ['Install', 'Component description', 'Usage code']) {
    const button = page.getByRole('button', { name, exact: true });
    await button.click();
    await expect(page.locator('#stage-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
