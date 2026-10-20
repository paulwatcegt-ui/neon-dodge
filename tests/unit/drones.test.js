import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/simulation/world.js';
import { spawnEnemy, updateEnemies } from '../../src/simulation/enemies.js';
import { updateDirector } from '../../src/simulation/director.js';
import { ENEMIES, HIGH_RISK_TYPES, ACTIVE_ATTACK_STATES } from '../../src/config/enemies.js';
import { STAGES } from '../../src/config/difficulty.js';
function one(type,x=0,z=-6){const w=createWorld();w.enemies=[];w.nextSpawnAt=Infinity;spawnEnemy(w,x,z,type);return w;}
function advance(w,n){for(let i=0;i<n;i++){updateEnemies(w);w.tick++;}}
test('spread drone warns for 54 ticks, locks a three-ray fan and emits exactly three distinct threats',()=>{
  const w=one('spread');advance(w,1);assert.equal(w.enemies[0].state,'windup');
  advance(w,53);assert.equal(w.projectiles.length,0);advance(w,1);assert.equal(w.projectiles.length,3);
  assert.equal(new Set(w.projectiles.map(b=>b.id)).size,3);
  for(const b of w.projectiles)assert.ok(Math.abs(Math.hypot(b.vx,b.vz)-9)<1e-8);
  assert.ok(w.projectiles[0].vx*w.projectiles[2].vx<0);
});
test('sniper locks its aim for 90 ticks and fires a three-shot straight burst without tracking',()=>{
  const w=one('sniper',0,-8);advance(w,1);const aim=w.enemies[0].aimX;
  w.player.x=5;advance(w,89);assert.equal(w.projectiles.length,0);
  advance(w,1);assert.equal(w.enemies[0].state,'burst');advance(w,16);
  assert.equal(w.projectiles.length,3);assert.equal(w.enemies[0].aimX,aim);
  for(const b of w.projectiles){assert.ok(Math.abs(Math.hypot(b.vx,b.vz)-14)<1e-8);assert.equal(b.vx,0);}
});
test('orbiter actually traverses a side arc before its telegraphed shot; blaster warns before area damage',()=>{
  const w=one('orbiter',6,0);advance(w,60);assert.equal(w.enemies[0].state,'orbit');assert.ok(Math.abs(w.enemies[0].z)>1.5);
  advance(w,78);assert.equal(w.projectiles.length,1);assert.equal(w.projectiles[0].flavor,'orbiter');
  const b=one('blaster',0,-1.5);advance(b,1);advance(b,59);assert.equal(b.projectiles.length,0);
  advance(b,1);assert.equal(b.projectiles[0].kind,'blast');assert.equal(b.projectiles[0].radius,2);
});
test('saturated roster safely introduces missing unlocked types without exceeding quotas or scoring',()=>{
  const w=createWorld();w.enemies=[];w.tick=14400;
  for(let i=0;i<10;i++)spawnEnemy(w,i%5-2,3,'chaser');
  for(const type of ['shooter','charger','zoner','spread','orbiter'])for(let i=0;i<ENEMIES[type].cap&&w.enemies.length<24;i++)spawnEnemy(w,3,3,type);
  assert.equal(w.enemies.length,24);const score=w.score.value;
  w.nextSpawnAt=w.tick;updateDirector(w);assert.equal(w.enemies.length,24);
  assert.ok(w.enemies.some(e=>['sniper','blaster'].includes(e.type)));assert.equal(w.score.value,score);
  assert.equal(w.events.filter(e=>e.type==='enemyRetired').length,1);
});
test('eight types appear in a no-kill ten-minute run, with all quotas and danger budgets bounded',()=>{
  const w=createWorld({seed:42}),seen=new Set();
  for(let i=0;i<36060;i++){
    w.player.protection=100;stepWorld(w,{x:0,z:0});w.enemies.forEach(e=>seen.add(e.type));
    const risky=w.enemies.filter(e=>HIGH_RISK_TYPES.includes(e.type)&&ACTIVE_ATTACK_STATES.includes(e.state)).length;
    assert.ok(risky+w.projectiles.filter(b=>['zone','blast'].includes(b.kind)).length<=2);
    assert.ok(w.enemies.length<=STAGES[w.stage].cap);assert.ok(w.projectiles.length<=96);
    for(const [type,entry]of Object.entries(ENEMIES))assert.ok(w.enemies.filter(e=>e.type===type).length<=entry.cap);
  }
  assert.equal(seen.size,8);assert.equal(w.outcome,null);
});
