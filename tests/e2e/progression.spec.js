import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Browser-owned fixtures import real modules; no setters/cheats are added to the game.
async function fixture(page, setup) {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const script = `<script type="module">
    import '/src/styles/layout.css'; import '/src/styles/combat.css'; import '/src/styles/main.css';
    import { createSession } from '/src/core/session.js';
    import { createUI } from '/src/ui/screens.js';
    import { createView } from '/src/rendering/renderer.js';
    import { createRecords } from '/src/storage/records.js';
    import { spawnEnemy } from '/src/simulation/enemies.js';
    const s = createSession(); const w = s.world; s.start();
    const records = createRecords();
    ${setup}
    const ui = createUI({resume(){}, pause(){}, reset(){}, getBest: records.read}); ui.update(s);
    const view = createView(document.getElementById('arena'), w.arena); view.render(w, 1);
    window.__fixture = { mode: s.mode, score: w.score.value, stage: w.stage };
  </script>`;
  await page.route('**/phase3-fixture.html', route => route.fulfill({ contentType: 'text/html',
    body: html.replace('<script type="module" src="/src/main.js"></script>', script) }));
  await page.goto('http://127.0.0.1:5181/phase3-fixture.html');
  await page.waitForFunction(() => window.__fixture);
}

test('all four enemy views and telegraphs render on stage four without errors', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await fixture(page, `w.enemies=[]; w.nextSpawnAt=Infinity; w.tick=6000;
    spawnEnemy(w, 0, -5, 'shooter'); spawnEnemy(w, 1, 0, 'chaser');
    spawnEnemy(w, -5, 0, 'charger'); spawnEnemy(w, 5, 1, 'zoner');
    s.step({x:0,z:0});`);
  await expect(page.locator('#stage-text')).toHaveText('阶段 4 / 5 · 封锁');
  await page.screenshot({ path: 'test-results/phase3-four-enemies.png' });
  expect(errors).toEqual([]);
});

test('victory summary shows score, time, combo and persists exactly one result', async ({ page }) => {
  await fixture(page, `w.enemies=[]; w.nextSpawnAt=Infinity; w.tick=10799;
    w.score.value=1000; w.score.bestCombo=8; s.step({x:0,z:0}); records.saveResult(w); records.saveResult(w);`);
  await expect(page.getByRole('heading', { name: '挑战完成' })).toBeVisible();
  await expect(page.locator('#result-score')).toHaveText('2,760');
  await expect(page.locator('#result-time')).toHaveText('180.0s');
  await expect(page.locator('#result-combo')).toHaveText('8');
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('neon-dodge.records.v1')));
  expect(record.score).toBe(2760); expect(record.victories).toBe(1);
  await page.screenshot({ path: 'test-results/phase3-victory.png' });
  await page.goto('http://127.0.0.1:5181/');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('neon-dodge.records.v1')).score)).toBe(2760);
});
