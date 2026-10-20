import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test('all eight enemy bodies and distinct warnings render without errors or resource growth',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  const script=`<script type="module">
  import '/src/styles/main.css';import '/src/styles/layout.css';import '/src/styles/combat.css';import '/src/styles/presentation.css';import '/src/styles/survival.css';import '/src/styles/immersive.css';
  import {createSession} from '/src/core/session.js';import {spawnEnemy} from '/src/simulation/enemies.js';
  import {ENEMIES} from '/src/config/enemies.js';import {createView} from '/src/rendering/renderer.js';import {createUI} from '/src/ui/screens.js';
  const s=createSession();s.start();const w=s.world;w.enemies=[];w.tick=14500;w.stage=6;w.pattern=0;
  // Visual-only gallery: all warnings are deliberately shown together, not a legal combat schedule.
  Object.keys(ENEMIES).forEach((type,i)=>{const a=i*Math.PI/4;spawnEnemy(w,Math.sin(a)*7,Math.cos(a)*7,type);
    const e=w.enemies.at(-1);e.state='windup';e.windupTicks=type==='sniper'?90:60;e.timer=30;e.aimX=-Math.sin(a);e.aimZ=-Math.cos(a);
    e.targetX=type==='blaster'?e.x:type==='sniper'?e.x+e.aimX*35:0;e.targetZ=type==='blaster'?e.z:type==='sniper'?e.z+e.aimZ*35:0;});
  const view=createView(document.getElementById('arena'),w.arena);view.setQuality('low');await view.prepare(w);
  const ui=createUI({resume(){},pause(){},reset(){}});ui.update(s);view.render(w,1);
  const before=view.metrics();for(let i=0;i<120;i++)view.render(w,1);window.__drones={before,after:view.metrics(),count:w.enemies.length};
  </script>`;
  await page.route('**/drones-fixture.html',r=>r.fulfill({contentType:'text/html',body:html.replace('<script type="module" src="/src/main.js"></script>',script)}));
  await page.goto('http://127.0.0.1:5181/drones-fixture.html');await page.waitForFunction(()=>window.__drones);
  const result=await page.evaluate(()=>window.__drones);expect(result.count).toBe(8);
  expect(result.after.geometries).toBe(result.before.geometries);expect(result.after.textures).toBe(result.before.textures);
  await expect(page.locator('#stage-text')).toHaveText('阶段 7 / 7 · 无限高压');
  await page.screenshot({path:'test-results/eight-drones.png'});expect(errors).toEqual([]);
});
