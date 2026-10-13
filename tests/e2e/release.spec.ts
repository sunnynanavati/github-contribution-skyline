import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('card controls preserve graph navigation, fit their host, and meet accessibility checks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/consumer.html');
  const element = page.locator('github-contribution-skyline');
  await element.evaluate(node => { node.setAttribute('variant', 'card'); node.setAttribute('flatten-mode', 'always'); });
  const details = element.getByRole('button', { name: 'Details' });
  await details.click();
  const panel = element.locator('.settings-panel');
  await expect(panel).toHaveAttribute('aria-hidden', 'false');
  const height = element.locator('input[type="range"]');
  await height.focus(); await page.keyboard.press('ArrowRight');
  await expect(height).toHaveValue('145');
  await expect(element.locator('#gcs-live')).toHaveText('');
  await expect(element.locator('.hint')).toHaveText('CONTRIBUTION GRAPH');
  for (const name of ['GitHub green', 'Signal red', 'Monochrome', 'Ember orange', 'Ocean blue', 'Solar yellow']) {
    await element.getByRole('radio', { name }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  const hostBox = await element.locator('.shell').boundingBox();
  const panelBox = await panel.boundingBox();
  expect(panelBox!.x).toBeGreaterThanOrEqual(hostBox!.x);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(hostBox!.x + hostBox!.width);
  expect(panelBox!.height + panelBox!.y).toBeLessThanOrEqual(hostBox!.y + hostBox!.height);
  await page.keyboard.press('Escape');
  await expect(details).toBeFocused();
  await element.evaluate(node => node.setAttribute('show-legend', 'false'));
  await expect(element.locator('.legend')).toBeHidden();
});

test('edge tooltips remain contained without resizing the component', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/consumer.html');
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  const component = page.locator('[data-github-skyline]').first();
  const canvas = component.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await component.locator('.shell').boundingBox())!;
  const weeks = await component.locator('tbody tr').count() / 7;
  const cell = Math.min((box.width - (box.width < 640 ? 28 : 88)) / weeks, (box.height - 130) / 7);
  for (const column of [0, weeks - 1]) {
    await page.mouse.move(box.x + (box.width - weeks * cell) / 2 + (column + .5) * cell, box.y + (box.height - 7 * cell) / 2 + 4 + cell / 2);
    const tooltip = component.locator('.tooltip');
    await expect(tooltip).toHaveCSS('opacity', '1');
    const tag = (await tooltip.boundingBox())!;
    expect(tag.x).toBeGreaterThanOrEqual(box.x);
    expect(tag.x + tag.width).toBeLessThanOrEqual(box.x + box.width);
    expect(tag.y).toBeGreaterThanOrEqual(box.y);
    expect(tag.y + tag.height).toBeLessThanOrEqual(box.y + box.height);
    expect(await component.locator('.shell').boundingBox()).toEqual(box);
  }
});

test('Canvas unavailable has a readable fallback with all contribution days', async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await page.goto('/consumer.html');
  const component = page.locator('[data-github-skyline]').first();
  await expect(component.locator('.state')).toContainText('Canvas is unavailable');
  expect(await component.locator('tbody tr').count()).toBeGreaterThan(365);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
