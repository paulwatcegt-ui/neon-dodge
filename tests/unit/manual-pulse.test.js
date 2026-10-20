import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,stepWorld} from '../../src/simulation/world.js';
import {createSession} from '../../src/core/session.js';
import {createClock} from '../../src/core/gameLoop.js';
import {createKeyboard} from '../../src/input/keyboard.js';
import {spawnEnemy} from '../../src/simulation/enemies.js';
import {releasePulse} from '../../src/simulation/pulse.js';
import {COMBAT} from '../../src/config/combat.js';
import {ENEMIES} from '../../src/config/enemies.js';
function empty(){const w=createWorld();w.enemies=[];w.nextSpawnAt=Infinity;return w;}
const idle={x:0,z:0};
test('E below 100 never spends energy; full energy never releases by itself',()=>{
  const w=empty();w.player.energy=99;stepWorld(w,{...idle,pulse:true});
  assert.equal(w.player.energy,99);assert.equal(w.stats.pulses,0);
  w.player.energy=100;for(let i=0;i<120;i++)stepWorld(w,idle);
  assert.equal(w.player.energy,100);assert.equal(w.stats.pulses,0);
  stepWorld(w,{...idle,pulse:true});assert.equal(w.player.energy,0);assert.equal(w.stats.pulses,1);
});
test('E clears an imminent lethal collision before hit resolution, but insufficient E cannot save it',()=>{
  for(const energy of [99,100]){
    const w=empty();w.player.hp=1;w.player.energy=energy;
    w.projectiles.push({id:90,x:0,z:0,previousX:0,previousZ:0,vx:0,vz:0,radius:0.16,life:10,outcome:null});
    stepWorld(w,{...idle,pulse:true});assert.equal(w.player.hp,energy===100?1:0);
    assert.equal(w.player.energy,energy===100?0:99);assert.equal(w.stats.pulses,energy===100?1:0);
  }
});
test('stun lasts exactly 90 ticks, cancels charge/burst, and requires a fresh windup after recovery',()=>{
  const w=empty();spawnEnemy(w,2,0,'charger');const e=w.enemies[0];
  e.state='charge';e.chargeSpeed=18.2;e.aimX=-1;e.aimZ=0;e.timer=20;e.threatId=91;
  w.projectiles.push({id:91,attachedTo:e.id,x:2,z:0,vx:0,vz:0,radius:0.5,life:20,outcome:null});
  w.player.energy=100;stepWorld(w,{...idle,pulse:true});assert.equal(e.state,'stunned');assert.equal(w.projectiles.length,0);
  const x=e.x;for(let i=1;i<90;i++)stepWorld(w,idle);
  assert.equal(e.state,'stunned');assert.equal(e.x,x);assert.equal(w.tick,90);
  stepWorld(w,idle);assert.equal(e.state,'windup');assert.equal(e.timer,48);assert.equal(w.projectiles.length,0);
  const s=empty();spawnEnemy(s,3,0,'sniper');s.enemies[0].state='burst';s.enemies[0].burstRemaining=2;s.player.energy=100;
  releasePulse(s,true);assert.equal(s.enemies[0].burstRemaining,0);assert.equal(s.enemies[0].state,'stunned');
});
test('pulse clears only in radius, stuns without scoring, and pauses freeze its countdown and energy',()=>{
  const s=createSession();s.start();const w=s.world;w.enemies=[];w.nextSpawnAt=Infinity;
  spawnEnemy(w,3,0,'spread');spawnEnemy(w,5,0,'sniper');w.player.energy=100;
  s.step({...idle,pulse:true});assert.equal(w.enemies.length,2);assert.equal(w.enemies[0].state,'stunned');assert.notEqual(w.enemies[1].state,'stunned');
  assert.equal(w.score.value,0);assert.equal(w.stats.kills,0);
  s.pause();const before=JSON.stringify(w);for(let i=0;i<300;i++)s.step({...idle,pulse:true});assert.equal(JSON.stringify(w),before);
});
test('keyboard E consumes one edge, ignores repeat/settings/paused input and clears on blur/dispose',()=>{
  const target=new EventTarget();let running=true;
  const keyboard=createKeyboard({target,basis:{right:{x:1,z:0},forward:{x:0,z:-1}},isRunning:()=>running,togglePause(){},onBlur(){}});
  function key(repeat=false,tag){const e=new Event('keydown');Object.assign(e,{code:'KeyE',repeat});if(tag)Object.defineProperty(e,'target',{value:{tagName:tag}});target.dispatchEvent(e);}
  key();assert.equal(keyboard.sample().pulse,true);assert.equal(keyboard.sample().pulse,false);
  key(true);assert.equal(keyboard.sample().pulse,false);key(false,'INPUT');assert.equal(keyboard.sample().pulse,false);
  running=false;key();assert.equal(keyboard.sample().pulse,false);running=true;key();target.dispatchEvent(new Event('blur'));assert.equal(keyboard.sample().pulse,false);
  keyboard.dispose();key();assert.equal(keyboard.sample().pulse,false);
});
test('9/10/14-speed threats and simultaneous E produce identical collision state at 30/60/144Hz',()=>{
  assert.equal(COMBAT.projectileSpeed,10);assert.equal(COMBAT.spreadSpeed,9);assert.equal(COMBAT.sniperSpeed,14);
  for(const speed of [9,10,14])for(const pulse of [false,true]){
    const snapshots=[30,60,144].map(hz=>{
      const w=empty();w.player.energy=100;
      w.projectiles.push({id:90,x:2.2,z:0,previousX:2.2,previousZ:0,vx:-speed,vz:0,radius:0.16,life:240,outcome:null});
      const clock=createClock(()=>stepWorld(w,{...idle,pulse:pulse&&w.tick===0}),()=>assert.fail('overload'));
      clock.advance(0);for(let frame=1;frame<=hz;frame++)clock.advance(frame*1000/hz);
      assert.equal(w.player.hp,pulse?3:2);assert.equal(w.stats.pulses,pulse?1:0);return JSON.stringify(w);
    });assert.equal(snapshots[0],snapshots[1]);assert.equal(snapshots[1],snapshots[2]);
  }
});

test('eight-enemy high-pressure combat with E and dash is deterministic at 30/60/144Hz',()=>{
  const snapshots=[30,60,144].map(hz=>{
    const w=empty();w.tick=14400;w.stage=6;
    Object.keys(ENEMIES).forEach((type,i)=>spawnEnemy(w,Math.sin(i*Math.PI/4)*6,Math.cos(i*Math.PI/4)*6,type));
    const clock=createClock(()=>{
      w.player.protection=100;if(w.tick%120===0)w.player.energy=100;
      stepWorld(w,{x:Math.cos(w.tick/40),z:Math.sin(w.tick/40),dash:w.tick%100===0,pulse:w.tick%120===0});
    },()=>assert.fail('overload'));
    clock.advance(0);for(let frame=1;frame<=hz*10;frame++)clock.advance(frame*1000/hz);
    assert.equal(w.tick,15000);return JSON.stringify(w);
  });assert.equal(snapshots[0],snapshots[1]);assert.equal(snapshots[1],snapshots[2]);
});
