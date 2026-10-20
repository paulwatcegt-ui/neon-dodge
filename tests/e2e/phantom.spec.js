import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('production defaults to PHANTOM; real movement and reload preserve the model without manual import', async ({page}) => {
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto('./?diagnostics=1');
  await expect(page.getByRole('button',{name:/开始测试/})).toBeEnabled();
  expect(await page.evaluate(()=>window.__ND.graphics().character.name)).toBe('ND-01 / PHANTOM');
  await page.locator('#settings summary').click();
  await expect(page.locator('#model-status')).toContainText('CC0');
  await page.locator('#quality').selectOption('low');await page.locator('#settings summary').click();
  await page.waitForTimeout(600);await page.getByRole('button',{name:/开始测试/}).click();
  await page.keyboard.down('KeyD');
  await expect.poll(()=>page.evaluate(()=>window.__ND.graphics().character.animation.state)).toBe('run');
  await page.keyboard.up('KeyD');await page.screenshot({path:'test-results/phantom-gameplay.png'});
  expect((await page.evaluate(()=>window.__ND.snapshot())).player.x).toBeGreaterThan(0);
  await page.reload();await expect(page.getByRole('button',{name:/开始测试/})).toBeEnabled();
  expect(await page.evaluate(()=>window.__ND.graphics().character.animation.clip)).toBe('Sentinel');
  expect(errors).toEqual([]);
});

test('failed default download enables T-00; restore retries successfully',async({page})=>{
  await page.route('**/models/aether-02.glb',route=>route.fulfill({status:503,body:'unavailable'}));
  await page.goto('./?diagnostics=1');await expect(page.getByRole('button',{name:/开始测试/})).toBeEnabled();
  expect(await page.evaluate(()=>window.__ND.graphics().character.name)).toBe('T-00');
  await page.locator('#settings summary').click();await expect(page.locator('#model-status')).toContainText('备用角色 T-00');
  await page.unroute('**/models/aether-02.glb');await page.locator('#model-reset').click();
  await expect(page.locator('#model-status')).toContainText('ND-01 / PHANTOM · AETHER / 02');
  expect(await page.evaluate(()=>window.__ND.graphics().character.name)).toBe('ND-01 / PHANTOM');
});

test('real PHANTOM poses stay grounded, dash timing aligns and repeated swaps release resources',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  const script=`<script type="module">
  import '/src/styles/main.css';import '/src/styles/layout.css';import '/src/styles/combat.css';import '/src/styles/presentation.css';import '/src/styles/survival.css';import '/src/styles/immersive.css';
  import * as THREE from '/node_modules/three/build/three.module.js';
  import {createSession} from '/src/core/session.js';import {createView} from '/src/rendering/renderer.js';
  import {loadCharacter} from '/src/assets/assetLoader.js';import {createUI} from '/src/ui/screens.js';
  const s=createSession();s.start();s.world.enemies=[];
  const view=createView(document.getElementById('arena'),s.world.arena);view.setQuality('low');
  const ui=createUI({resume(){},pause(){},reset(){}});
  const buffer=await(await fetch('/models/aether-02.glb')).arrayBuffer();
  let asset=await loadCharacter(buffer,{phantom:true});view.setAsset(asset);await view.prepare(s.world);
  window.pose=(state,seconds)=>{
    asset.animation.reset();asset.animation.update(state,0);let worstFloor=Infinity;
    for(let i=0;i<30;i++){asset.animation.update(state,seconds/30);asset.ground();
      if(i%5===0){asset.root.updateWorldMatrix(true,true);asset.root.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});worstFloor=Math.min(worstFloor,new THREE.Box3().setFromObject(asset.root).min.y);}}
    asset.root.updateWorldMatrix(true,true);asset.root.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});
    const bounds=new THREE.Box3().setFromObject(asset.root);return {minY:bounds.min.y,worstFloor,maxY:bounds.max.y,animation:asset.animation.describe()};
  };
  const samples=['idle','run','dash','hit','death'].map(state=>({state,...window.pose(state,state==='dash'?0.1:state==='death'?3:0.2)}));
  const counts=[];for(let i=0;i<4;i++){asset=await loadCharacter(buffer,{phantom:true});view.setAsset(asset);await view.prepare(s.world);view.render(s.world,1);counts.push(view.metrics());}
  window.show=(state)=>{const p=s.world.player;p.previousX=p.x=0;p.previousZ=p.z=0;p.facingX=0;p.facingZ=1;p.hp=state==='death'?0:3;p.dashRemaining=state==='dash'?6:0;p.protection=state==='hit'?40:0;
    if(state==='run')p.previousZ=-0.1;view.reset();view.render(s.world,1);window.pose(state,state==='death'?3:state==='dash'?0.1:0.2);view.render(s.world,1);ui.update(s);};
  window.show('idle');window.__phantom={samples,counts,profile:asset.profile};
  </script>`;
  await page.route('**/phantom-fixture.html',r=>r.fulfill({contentType:'text/html',body:html.replace('<script type="module" src="/src/main.js"></script>',script)}));
  await page.goto('http://127.0.0.1:5181/phantom-fixture.html');await page.waitForFunction(()=>window.__phantom);
  const result=await page.evaluate(()=>window.__phantom);
  expect(result.profile).toMatchObject({triangles:24310,materials:5,bones:18,missing:[]});
  for(const sample of result.samples){expect(sample.minY).toBeGreaterThanOrEqual(-0.001);expect(sample.worstFloor).toBeGreaterThanOrEqual(-0.001);}
  expect(result.samples.find(s=>s.state==='dash').animation.timeScale).toBeCloseTo(14.3333,3);
  expect(result.samples.find(s=>s.state==='death').maxY).toBeLessThan(0.5);
  expect(new Set(result.counts.map(c=>c.geometries)).size).toBe(1);expect(new Set(result.counts.map(c=>c.textures)).size).toBe(1);
  for(const state of ['idle','run','dash','hit','death']){await page.evaluate(state=>window.show(state),state);await page.screenshot({path:'test-results/phantom-'+state+'.png'});}
  expect(errors).toEqual([]);
});
