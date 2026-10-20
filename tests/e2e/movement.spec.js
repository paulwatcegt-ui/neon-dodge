import { test, expect } from '@playwright/test';

const snapshot = page => page.evaluate(() => window.__ND.snapshot());
test('production subpath: movement, dash, pause, blur, reset; no external requests', async ({ page }) => {
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4174/')) external.push(request.url()); });
  await page.goto('./?diagnostics=1');
  await expect(page.getByRole('button', { name: /开始测试/ })).toBeVisible();
  // Let initial shader compilation settle before measuring the simulation.
  await page.waitForTimeout(600);
  await page.locator('#settings summary').click(); await page.locator('#quality').selectOption('low');
  await page.locator('#settings summary').click();
  await page.getByRole('button', { name: /开始测试/ }).click();
  await page.keyboard.down('KeyD'); await page.waitForTimeout(250); await page.keyboard.up('KeyD');
  const moved = await snapshot(page); expect(moved.mode).toBe('running'); expect(moved.player.x).toBeGreaterThan(0.2);
  await page.keyboard.press('Space'); await page.waitForTimeout(230);
  const dashed = await snapshot(page); expect(dashed.player.x - moved.player.x).toBeGreaterThan(3);
  await page.keyboard.press('Escape');
  const paused = await snapshot(page); expect(paused.mode).toBe('paused');
  await page.waitForTimeout(200); expect((await snapshot(page)).tick).toBe(paused.tick);
  await page.getByRole('button', { name: /继续训练/ }).click();
  await page.waitForTimeout(100); expect((await snapshot(page)).tick).toBeGreaterThan(paused.tick);
  await page.keyboard.down('KeyW'); await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect((await snapshot(page)).reason).toBe('focus');
  await page.getByRole('button', { name: /继续训练/ }).click();
  const before = await snapshot(page); await page.waitForTimeout(100);
  const after = await snapshot(page); expect(after.player.z).toBe(before.player.z);
  await page.getByRole('button', { name: /复位/ }).click();
  const reset = await snapshot(page); expect(reset.player.x).toBe(0); expect(reset.player.z).toBe(0); expect(reset.player.cooldown).toBe(0);
  await page.screenshot({ path: 'test-results/phase1-desktop.png' });
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('narrow viewport keeps controls accessible and resizes without exceptions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./?diagnostics=1');
  await page.waitForTimeout(500); await page.getByRole('button', { name: /开始测试/ }).click();
  await expect(page.getByRole('button', { name: /暂停/ })).toBeInViewport();
  await expect(page.getByRole('button', { name: /复位/ })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const selector of ['.energy-panel', '.dash-panel']) {
    const panel = await page.locator(selector).boundingBox();
    const value = await page.locator(`${selector} strong`).boundingBox();
    expect(value.x).toBeGreaterThanOrEqual(panel.x);
    expect(value.x + value.width).toBeLessThanOrEqual(panel.x + panel.width + 1);
  }
  await page.screenshot({ path: 'test-results/phase1-narrow.png' });
});

test('license texts ship with production assets; diagnostics opt in', async ({ page, request }) => {
  await page.goto('./'); expect(await page.evaluate(() => typeof window.__ND)).toBe('undefined');
  for (const file of ['voxel-survivors-MIT.txt', 'three-MIT.txt']) {
    const response = await request.get(`licenses/${file}`); expect(response.ok()).toBe(true);
    expect(await response.text()).toContain('Permission is hereby granted');
  }
});
