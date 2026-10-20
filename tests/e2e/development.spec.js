import { test, expect } from '@playwright/test';

test('Vite development mode loads every stylesheet and starts the 3D game', async ({ page }) => {
  const failures = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => failures.push(request.url()));
  await page.goto('http://127.0.0.1:5181/');
  await expect(page.getByRole('button', { name: /开始测试/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.getElementById('app')).position)).toBe('relative');
  expect(await page.locator('vite-error-overlay').count()).toBe(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(7, 17, 22)');
  expect(await page.locator('#arena').getAttribute('data-engine')).toContain('three.js');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /开始测试/ }).click();
  await page.keyboard.down('KeyD'); await page.waitForTimeout(200); await page.keyboard.up('KeyD');
  const state = await page.evaluate(() => window.__ND.snapshot());
  expect(state.mode).toBe('running'); expect(state.player.x).toBeGreaterThan(0.2);
  await page.screenshot({ path: 'test-results/development-restored.png' });
  expect(errors).toEqual([]); expect(failures).toEqual([]);
});
