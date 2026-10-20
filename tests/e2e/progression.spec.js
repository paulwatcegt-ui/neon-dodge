import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { RECORDS_KEY } from '../../src/storage/records.js';

// Browser-owned fixtures import real modules; no setters/cheats are added to the game.
async function fixture(page, setup, mode = 'standard') {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const script = `<script type="module">
    import '/src/styles/layout.css'; import '/src/styles/combat.css'; import '/src/styles/main.css';
    import '/src/styles/presentation.css'; import '/src/styles/survival.css';
    import { createSession } from '/src/core/session.js';
    import { createUI } from '/src/ui/screens.js';
    import { createView } from '/src/rendering/renderer.js';
    import { createRecords } from '/src/storage/records.js';
    import { spawnEnemy } from '/src/simulation/enemies.js';
    const s = createSession({mode:'${mode}',runId:'browser-fixture'}); const w = s.world; s.start();
    const records = createRecords();
    ${setup}
    const ui = createUI({resume(){}, pause(){}, reset(){}, getBest: records.read, getRecords: records.list}); ui.update(s);
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
  await expect(page.locator('#stage-text')).toHaveText('阶段 4 / 7 · 狙击交火');
  await page.screenshot({ path: 'test-results/phase3-four-enemies.png' });
  expect(errors).toEqual([]);
});

test('death after 600s shows full summary and one versioned local record', async ({ page }) => {
  await fixture(page, `w.enemies=[]; w.nextSpawnAt=Infinity; w.tick=36059; w.player.hp=1;
    w.score.value=1000; w.score.bestCombo=8; w.stats.perfect=4;
    w.projectiles.push({id:900,x:0,z:0,vx:0,vz:0,radius:0.2,life:5,outcome:null});
    s.step({x:0,z:0}); records.saveResult(w); records.saveResult(w);`);
  await expect(page.getByRole('heading', { name: '本局结束' })).toBeVisible();
  await expect(page.locator('#result-score')).toHaveText('1,010');
  await expect(page.locator('#result-time')).toHaveText('601.0s');
  await expect(page.locator('#result-combo')).toHaveText('8');
  await expect(page.locator('#result-perfect')).toHaveText('4');
  await page.locator('.local-board summary').click();
  await expect(page.locator('#local-records li')).toHaveCount(1);
  const record = await page.evaluate(key => JSON.parse(localStorage.getItem(key)),RECORDS_KEY);
  expect(record.boards.standard[0].score).toBe(1010); expect(record.boards.standard).toHaveLength(1);
  expect(record.boards.practice).toHaveLength(0);
  await page.screenshot({ path: 'test-results/endless-summary.png' });
  await page.goto('http://127.0.0.1:5181/');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).boards.standard[0].score,RECORDS_KEY)).toBe(1010);
});

test('pressure HUD reflects damage relief and stays frozen during pause', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await fixture(page, `w.enemies=[]; w.nextSpawnAt=Infinity;
    w.projectiles.push({id:900,x:0,z:0,vx:0,vz:0,radius:0.2,life:5,outcome:null});
    s.step({x:0,z:0}); s.pause('manual');
    for(let i=0;i<1000;i++) s.step({x:0,z:0});`, 'practice');
  await expect(page.locator('#pressure-text')).toHaveText('自适应练习 · 缓冲');
  await expect(page.locator('#health')).toHaveText('◆◆◇');
  expect(await page.evaluate(() => window.__fixture.mode)).toBe('paused');
  await page.setViewportSize({ width: 390, height: 844 });
  const label = await page.locator('#pressure-text').boundingBox();
  expect(label.x).toBeGreaterThanOrEqual(0); expect(label.x + label.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/adaptive-narrow.png' });
  expect(errors).toEqual([]);
});
