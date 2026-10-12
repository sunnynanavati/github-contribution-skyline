import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/?motion-study=1'); });

test('A/B scrubbing preserves the frame, layout, and endpoints', async ({ page }) => {
  const card = page.locator('.study-card');
  const scrubber = page.getByRole('slider', { name: 'Animation timeline' });
  const canvas = card.locator('canvas');
  const pixels = () => canvas.evaluate(c => (c as HTMLCanvasElement).toDataURL());
  const size = await card.evaluate(c => [c.clientWidth, c.clientHeight]);
  await expect(page.getByRole('tab', { name: 'B · Outward squash' })).toHaveAttribute('aria-selected', 'true');
  await expect(card).toHaveAttribute('data-profile', 'elastic');
  await page.getByRole('tab', { name: 'A · Vertical' }).click();
  await scrubber.fill('240');
  await expect(card).toHaveAttribute('data-time', '240');
  const a = await pixels();
  await page.getByRole('tab', { name: 'B · Outward squash' }).click();
  await expect(card).toHaveAttribute('data-time', '240');
  expect(await pixels()).not.toBe(a);
  expect(await card.evaluate(c => [c.clientWidth, c.clientHeight])).toEqual(size);
  for (const time of ['0', '600']) {
    await scrubber.fill(time); const b = await pixels();
    await page.getByRole('tab', { name: 'A · Vertical' }).click();
    expect(await pixels()).toBe(b);
    await page.getByRole('tab', { name: 'B · Outward squash' }).click();
  }
  await page.getByRole('tab', { name: 'Baseline' }).click();
  await expect(scrubber).toHaveAttribute('max', '600');
  await expect(card).toHaveAttribute('data-time', '600');
});

test('replay settles, stops drawing, and retains controls outside the hover surface', async ({ page }) => {
  const card = page.locator('.study-card');
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(card).toHaveAttribute('data-time', '600');
  await expect(card).toHaveAttribute('data-animating', 'false');
  const draws = await card.getAttribute('data-draws');
  await page.waitForTimeout(200);
  expect(await card.getAttribute('data-draws')).toBe(draws);
  await page.getByRole('button', { name: 'Ocean blue' }).click();
  await expect(card).toHaveAttribute('data-time', '600');
  await page.getByLabel('Building detail', { exact: true }).uncheck();
  await page.getByRole('combobox', { name: 'Speed' }).selectOption('0.25');
  await page.getByRole('button', { name: 'Replay' }).click();
  await page.waitForTimeout(400);
  expect(Number(await card.getAttribute('data-time'))).toBeLessThan(250);
  await expect(card).toHaveAttribute('data-time', '600', { timeout: 6000 });
});

test('keyboard, reduced motion, contained tooltips, and accessibility', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const card = page.locator('.study-card');
  await card.focus(); await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('data-time', '600');
  await expect(card).toHaveAttribute('data-animating', 'false');
  const box = await card.boundingBox();
  for (const key of ['Home', 'End']) {
    await page.keyboard.press(key);
    const tip = page.getByRole('tooltip');
    await expect(tip).toBeVisible();
    const bounds = await tip.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(box!.x);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(box!.x + box!.width);
    expect(bounds!.y).toBeGreaterThanOrEqual(box!.y);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(box!.y + box!.height);
  }
  await page.keyboard.press('Escape'); await expect(page.getByRole('tooltip')).toBeHidden();
  await page.keyboard.press('Space'); await expect(card).toHaveAttribute('data-time', '0');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('hover reverses mid-flight; touch toggles; layouts do not overflow', async ({ page }, info) => {
  const card = page.locator('.study-card');
  if (info.project.name.includes('mobile')) {
    await card.tap(); await expect(card).toHaveAttribute('data-time', '600');
    await card.tap(); await expect(card).toHaveAttribute('data-time', '0');
    await page.setViewportSize({ width: 320, height: 800 });
  } else {
    await card.hover(); await page.waitForTimeout(200);
    const midway = Number(await card.getAttribute('data-time'));
    expect(midway).toBeGreaterThan(0); expect(midway).toBeLessThan(600);
    await page.mouse.move(0, 0);
    await expect(card).toHaveAttribute('data-time', '0');
    await card.hover(); await expect(card).toHaveAttribute('data-time', '600');
    await page.mouse.move(0, 0); await expect(card).toHaveAttribute('data-time', '0');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('all palettes, density fixtures, details, and frame inspection render', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const name of ['GitHub green', 'Signal red', 'Monochrome', 'Ember orange', 'Ocean blue', 'Solar yellow']) {
    await page.getByRole('button', { name, exact: true }).click();
    for (const data of ['dense', 'sparse']) {
      await page.getByRole('combobox', { name: 'Data', exact: true }).selectOption(data);
      await page.getByRole('slider', { name: 'Animation timeline' }).fill('300');
      await expect(page.locator('.study-card')).toHaveAttribute('data-time', '300');
    }
  }
  await page.getByRole('slider', { name: 'Height', exact: true }).fill('2');
  await page.getByLabel('Building detail', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Signal red', exact: true }).click();
  await page.getByRole('combobox', { name: 'Data', exact: true }).selectOption('original');
  await page.getByRole('slider', { name: 'Height', exact: true }).fill('1');
  await page.getByRole('tab', { name: 'A · Vertical' }).click();
  await page.getByText('Inspect keyframes', { exact: true }).click();
  await expect(page.locator('.study-keyframe')).toHaveCount(6);
  await page.locator('.study-frame-grid').screenshot({ path: info.outputPath('vertical-keyframes.png') });
  await page.getByRole('tab', { name: 'B · Outward squash' }).click();
  await page.locator('.study-frame-grid').screenshot({ path: info.outputPath('outward-keyframes.png') });
  expect(errors).toEqual([]);
});
