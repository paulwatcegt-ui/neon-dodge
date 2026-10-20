import { test, expect } from '@playwright/test';

const state = page => page.evaluate(() => window.__ND.snapshot());
async function start(page) {
  await page.goto('./?diagnostics=1');
  await expect(page.getByRole('button', { name: /开始测试/ })).toBeEnabled();
  // Input timing is tested at low graphics; presentation settings have their own coverage.
  // Avoid GPU cold-start stalls invoking the game's intentional performance pause.
  await page.locator('#settings summary').click();
  await page.locator('#quality').selectOption('low');
  await page.locator('#settings summary').click();
  await page.getByRole('button', { name: /开始测试/ }).click();
}

test('real telegraphed projectile can be perfectly dodged with Space; combat pauses and resets', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await start(page);
  await expect.poll(async () => (await state(page)).enemies[0]?.state, { intervals: [30] }).toBe('windup');
  await expect.poll(async () => (await state(page)).projectiles.some(b => b.z > -3.2 && b.z < -0.8),
    { intervals: [30], timeout: 6000 }).toBe(true);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).stats.perfect, { intervals: [30] }).toBe(1);
  const dodged = await state(page); expect(dodged.player.hp).toBe(3); expect(dodged.player.energy).toBe(25);
  await expect(page.locator('#energy-value')).toHaveText('25 / 100');
  await page.keyboard.press('Escape'); const paused = await state(page);
  await page.waitForTimeout(150); expect(await state(page)).toEqual(paused);
  await page.getByRole('button', { name: /继续训练/ }).click();
  await page.screenshot({ path: 'test-results/phase2-combat.png' });
  await page.getByRole('button', { name: /复位/ }).click();
  const reset = await state(page); expect(reset.player.energy).toBe(0); expect(reset.player.hp).toBe(3);
  expect(reset.projectiles.length).toBe(0); expect(reset.enemies.length).toBe(2);
  expect(reset.stats).toEqual({ perfect: 0, graze: 0, pulses: 0, kills: 0 }); expect(errors).toEqual([]);
});

test('three real hits end training and restart creates a fresh combat session', async ({ page }) => {
  await start(page);
  await expect(page.getByRole('button', { name: /重新训练/ })).toBeVisible({ timeout: 15000 });
  const ended = await state(page); expect(ended.mode).toBe('defeated'); expect(ended.player.hp).toBe(0);
  await expect(page.locator('#result-summary')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('neon-dodge.records.v2')).boards.standard[0].score)).toBe(ended.score.value);
  await page.waitForTimeout(150); expect((await state(page)).tick).toBe(ended.tick);
  await page.getByRole('button', { name: /重新训练/ }).click();
  const restarted = await state(page); expect(restarted.mode).toBe('running'); expect(restarted.player.hp).toBe(3);
  expect(restarted.player.energy).toBe(0); expect(restarted.projectiles).toEqual([]);
});
