import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

test('mode selector isolates complete top-ten boards and preserves choice across restart', async ({ page }) => {
  await page.goto('./?diagnostics=1');
  // Populate via the real records module in a separate dev fixture, rather than adding game setters.
  await page.goto('http://127.0.0.1:5181/');
  await page.evaluate(async () => {
    const { createRecords } = await import('/src/storage/records.js');
    const { createWorld } = await import('/src/simulation/world.js');
    const records = createRecords();
    for (const mode of ['standard', 'practice']) for (let i = 1; i <= 12; i++) {
      const w = createWorld({ mode, seed: 42, runId: `${mode}-${i}` });
      w.player.hp = 0; w.outcome = 'defeat'; w.tick = i * 60;
      w.score.value = i * (mode === 'standard' ? 100 : 1000); records.saveResult(w);
    }
  });
  await page.reload();
  await expect(page.getByRole('button', { name: /开始测试/ })).toBeEnabled();
  await page.locator('.local-board summary').click();
  await expect(page.locator('#local-records li')).toHaveCount(10);
  await expect(page.locator('#local-records li').first()).toContainText('1,200 分');
  await page.locator('#game-mode').selectOption('practice');
  await expect(page.locator('#board-title')).toContainText('自适应练习');
  await expect(page.locator('#local-records li').first()).toContainText('12,000 分');
  await page.locator('.local-board summary').click();
  await page.locator('#settings summary').click(); await page.locator('#quality').selectOption('low');
  await page.locator('#settings summary').click();
  await page.getByRole('button', { name: /开始测试/ }).click();
  await expect.poll(() => page.evaluate(() => window.__ND.snapshot().tick)).toBeGreaterThan(30);
  const before = await page.evaluate(() => window.__ND.snapshot());
  expect(before.gameMode).toBe('practice'); expect(before.enemies.length).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('#game-mode')).toBeDisabled();
  const paused = await page.evaluate(() => window.__ND.snapshot());
  await page.waitForTimeout(150); expect(await page.evaluate(() => window.__ND.snapshot())).toEqual(paused);
  await page.getByRole('button', { name: /继续训练/ }).click();
  await page.getByRole('button', { name: /复位/ }).click();
  const reset = await page.evaluate(() => window.__ND.snapshot());
  expect(reset.gameMode).toBe('practice'); expect(reset.runId).not.toBe(before.runId);
  expect(reset.player.hp).toBe(3); expect(reset.score.value).toBe(0);
});

test('browser simulates beyond ten minutes with real rendering, pulses and bounded heap/GPU resources', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const script = `<script type="module">
    import '/src/styles/layout.css';import '/src/styles/combat.css';import '/src/styles/main.css';import '/src/styles/presentation.css';import '/src/styles/survival.css';
    import {createSession} from '/src/core/session.js';
    import {createView} from '/src/rendering/renderer.js';
    import {createUI} from '/src/ui/screens.js';
    import {spawnEnemy} from '/src/simulation/enemies.js';
    const s=createSession({seed:42,runId:'browser-long-run'}),view=createView(document.getElementById('arena'),s.world.arena);
    const ui=createUI({resume(){},pause(){},reset(){}});view.setQuality('low');await view.prepare(s.world);s.start();
    const patterns=new Set();let maxEnemies=0,maxThreats=0;
    window.__long={stress(){
      while(s.world.enemies.length<24){const i=s.world.enemies.length;spawnEnemy(s.world,Math.sin(i)*8,Math.cos(i)*8,['shooter','chaser','charger','zoner'][i%4]);}
      s.world.projectiles=Array.from({length:96},(_,i)=>({id:100000+i,kind:'bullet',x:i%12-5.5,z:Math.floor(i/12)-3.5,previousX:i%12-5.5,previousZ:Math.floor(i/12)-3.5,radius:0.16,life:600,vx:0,vz:0}));
      for(let i=0;i<60;i++)view.render(s.world,1);
      return {enemies:s.world.enemies.length,threats:s.world.projectiles.length,graphics:view.metrics()};
    },async advance(target){
      while(s.world.tick<target){
        const end=Math.min(target,s.world.tick+120);
        while(s.world.tick<end){const w=s.world;w.player.protection=100;
          if(w.tick%600===0){w.player.energy=100;w.pulseQueuedAt=w.tick-1;}
          s.step({x:0,z:0});view.consume(w.events);
          if(w.pattern>=0)patterns.add(w.pattern);
          maxEnemies=Math.max(maxEnemies,w.enemies.length);maxThreats=Math.max(maxThreats,w.projectiles.length);
        }
        view.render(s.world,1);ui.update(s);await new Promise(requestAnimationFrame);
      }
      return {mode:s.mode,tick:s.world.tick,score:s.world.score.value,pulses:s.world.stats.pulses,
        patterns:[...patterns],maxEnemies,maxThreats,graphics:view.metrics()};
    }};
  </script>`;
  await page.route('**/endless-fixture.html', route => route.fulfill({ contentType: 'text/html',
    body: html.replace('<script type="module" src="/src/main.js"></script>', script) }));
  await page.goto('http://127.0.0.1:5181/endless-fixture.html');
  await page.waitForFunction(() => window.__long);
  const cdp = await page.context().newCDPSession(page), samples = [];
  for (const seconds of [181, 301, 601]) {
    const sample = await page.evaluate(tick => window.__long.advance(tick), seconds * 60);
    await cdp.send('HeapProfiler.collectGarbage'); const heap = await cdp.send('Runtime.getHeapUsage');
    samples.push({ ...sample, heapBytes: heap.usedSize });
    expect(sample.mode).toBe('running'); expect(sample.tick).toBe(seconds * 60);
    expect(sample.score).toBeGreaterThanOrEqual(seconds * 10);
    expect(sample.maxEnemies).toBeLessThanOrEqual(24); expect(sample.maxThreats).toBeLessThanOrEqual(96);
    expect(sample.graphics.geometries).toBeLessThan(110); expect(sample.graphics.textures).toBeLessThan(30);
  }
  expect(samples[2].patterns).toHaveLength(3); expect(samples[2].pulses).toBeGreaterThan(50);
  expect(samples[2].heapBytes).toBeLessThan(samples[0].heapBytes * 1.5 + 8 * 1024 * 1024);
  expect(samples[2].graphics.geometries).toBeLessThanOrEqual(samples[0].graphics.geometries + 12);
  await expect(page.locator('#time-value')).toHaveText('10:01');
  await page.screenshot({ path: 'test-results/endless-601s.png' });
  const stress = await page.evaluate(() => window.__long.stress());
  expect(stress.enemies).toBe(24); expect(stress.threats).toBe(96);
  expect(stress.graphics.calls).toBeLessThan(200); expect(stress.graphics.geometries).toBeLessThan(110);
  await page.screenshot({ path: 'test-results/endless-stress.png' });
  await testInfo.attach('endless-resource-samples', { body: JSON.stringify(samples, null, 2), contentType: 'application/json' });
  writeFileSync('test-results/endless-resources.json', JSON.stringify({ samples, stress }, null, 2));
  expect(errors).toEqual([]);
});
