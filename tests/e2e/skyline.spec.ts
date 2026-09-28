import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('primary demo is accessible and interactive', async ({ page }, testInfo) => {
  await page.goto('/');
  const component = page.locator('[data-github-skyline]').first();
  const shell = component.locator('.shell');
  await expect(shell).toBeVisible();
  await shell.focus();
  await page.keyboard.press('Enter');
  await expect(component.locator('.hint')).toContainText(/MOVE OUT|HOVER|CONTRIBUTION/);
  await page.keyboard.press('ArrowRight');
  await expect(component.locator('#gcs-live')).toContainText(/contribution/);
  if (!testInfo.project.name.includes('mobile')) {
    await component.locator('canvas').hover();
    await expect(component.locator('.hint')).toContainText(/MOVE OUT|HOVER/);
  }
  await page.getByRole('button', { name: 'Component description' }).click();
  await expect(page.locator('#stage-panel')).toContainText('GitHub Contribution Skyline');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Component description' })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Usage code' }).click();
  await expect(page.locator('#stage-panel')).toContainText('Basic usage');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Install' }).click();
  await expect(page.locator('#stage-panel')).toContainText('npm install github-contribution-skyline');

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('mobile layout has no horizontal overflow and responds to touch', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile project only');
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const component = page.locator('[data-github-skyline]').first();
  await component.locator('canvas').tap();
  await expect(component.locator('.shell')).toBeVisible();
});

for (const palette of ['green', 'red', 'mono', 'orange', 'blue', 'yellow']) {
  test(`visual palette: ${palette}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('mobile'), 'Desktop visual snapshots only');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const component = page.locator('[data-github-skyline]').first();
    await page.locator(`.palette-tray [data-palette="${palette}"]`).click();
    await page.mouse.move(0, 0);
    await expect(component.locator('.hint')).toContainText('HOVER TO FLATTEN');
    await expect(component).toHaveScreenshot(`${palette}.png`, { animations: 'disabled', maxDiffPixelRatio: 0.03 });
  });
}
