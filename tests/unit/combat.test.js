import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/simulation/world.js';
import { circleEntry } from '../../src/simulation/collision.js';
import { updateThreats } from '../../src/simulation/combat.js';
import { releasePulse } from '../../src/simulation/pulse.js';
import { spawnEnemy } from '../../src/simulation/enemies.js';
import { createSession } from '../../src/core/session.js';
import { createClock } from '../../src/core/gameLoop.js';

function world() { const w = createWorld(); w.enemies = []; w.nextSpawnAt = Infinity; return w; }
function bullet(w, x, z, vx, vz = 0) {
  const b = { id: w.nextEntityId++, x, z, previousX: x, previousZ: z, vx, vz,
    radius: 0.15, life: 240, outcome: null, pendingGraze: false, dead: false };
  w.projectiles.push(b); return b;
}

test('continuous circle intersection catches a projectile crossing completely in one step', () => {
  assert.equal(circleEntry(-5, 0, 5, 0, 0.5), 0.45);
  const w = world(); bullet(w, -5, 0, 600); updateThreats(w);
  assert.equal(w.player.hp, 2); assert.equal(w.projectiles.length, 0);
});

test('relative sweep catches player dashing through a stationary projectile', () => {
  const w = world(); w.player.previousX = -3; w.player.x = 3;
  bullet(w, 0, 0, 0); updateThreats(w, 0);
  assert.equal(w.player.hp, 3); assert.equal(w.player.energy, 25); assert.equal(w.stats.perfect, 1);
});

test('perfect window is half open: tick 8 interior works, 0.15s endpoint and tick 9 do not', () => {
  for (const [age, start, velocity, perfect] of [[8, 1, -60, true], [8, 1.5, -60, false], [9, 1, -60, false]]) {
    const w = world(); bullet(w, start, 0, velocity); updateThreats(w, age);
    assert.equal(w.stats.perfect, Number(perfect)); assert.equal(w.player.hp, perfect ? 3 : 2);
  }
});

test('empty dash does not reward energy, dash back half remains vulnerable', () => {
  const w = world(); stepWorld(w, { x: 1, z: 0, dash: true }); assert.equal(w.player.energy, 0);
  const late = world(); bullet(late, -1, 0, 60); updateThreats(late, 10);
  assert.equal(late.player.hp, 2); assert.equal(late.player.energy, 0);
});

test('graze is deferred until exit and rewards a given threat only once', () => {
  const w = world(), b = bullet(w, -0.6, 0.6, 12);
  updateThreats(w); assert.equal(w.player.energy, 0); assert.ok(b.pendingGraze);
  b.vx = 120; updateThreats(w); assert.equal(w.player.energy, 10);
  b.x = -1; b.vx = 120; updateThreats(w); assert.equal(w.player.energy, 10); assert.equal(w.stats.graze, 1);
});

test('pending graze followed by impact becomes only a hit or perfect event', () => {
  for (const age of [Infinity, 0]) {
    const w = world(), b = bullet(w, -0.6, 0.6, 12);
    updateThreats(w); b.vx = 0; b.vz = -36; updateThreats(w, age);
    assert.equal(w.stats.graze, 0); assert.equal(w.player.energy, age === 0 ? 25 : 0);
  }
});

test('already rewarded projectile cannot grant another perfect or become free protection', () => {
  const w = world(), b = bullet(w, -1, 0.6, 120); updateThreats(w);
  assert.equal(w.player.energy, 10);
  b.x = -1; b.z = 0; b.vx = 120; updateThreats(w, 0);
  assert.equal(w.player.hp, 2); assert.equal(w.player.energy, 10); assert.equal(w.stats.perfect, 0);
});

test('simultaneous hits deduct one cell and ordinary protection grants no energy', () => {
  const w = world(); bullet(w, -1, 0, 120); bullet(w, 1, 0, -120);
  updateThreats(w); assert.equal(w.player.hp, 2); assert.equal(w.player.energy, 0);
  bullet(w, -1, 0.6, 120); updateThreats(w, 0); assert.equal(w.player.energy, 0);
});

test('contacts are resolved by impact time instead of projectile insertion order', () => {
  const w = world(); bullet(w, -2, 0, 120); bullet(w, -0.6, 0, 120);
  updateThreats(w, 8.5);
  assert.equal(w.stats.perfect, 1); assert.equal(w.player.hp, 2);
});

test('full energy waits for explicit pulse; it spends 100 once, stuns in radius and never kills or chains', () => {
  const w = world(); w.player.energy = 90;
  bullet(w, -1, 0.6, 120); updateThreats(w); assert.equal(w.player.energy, 100);
  releasePulse(w); assert.equal(w.stats.pulses, 0);
  spawnEnemy(w, 4, 0); spawnEnemy(w, 4.01, 0);
  bullet(w, 3, 0, 0); bullet(w, 5, 0, 0);
  w.tick++; releasePulse(w); assert.equal(w.stats.pulses,0);
  releasePulse(w,true); releasePulse(w,true);
  assert.equal(w.stats.pulses, 1); assert.equal(w.player.energy, 0); assert.equal(w.stats.kills, 0);
  assert.equal(w.enemies.length, 2); assert.equal(w.enemies[0].state,'stunned');assert.equal(w.enemies[1].state,'approach');assert.equal(w.projectiles.length, 1);
  assert.equal(w.events.filter(e => e.type === 'pulse').length, 1);
});

test('holding full energy without E cannot prevent lethal damage, and dead simulation cannot release', () => {
  const session = createSession(); session.start(); const w = session.world;
  w.enemies = []; w.nextSpawnAt = Infinity; w.player.hp = 1; w.player.energy = 100;
  bullet(w, -1, 0, 120); assert.equal(session.step({ x: 0, z: 0 }), false);
  assert.equal(session.mode, 'defeated'); assert.equal(w.stats.pulses, 0); assert.equal(releasePulse(w,true),false);
  const tick = w.tick; session.step({ x: 1, z: 0 }); assert.equal(w.tick, tick);
  session.reset(); assert.equal(session.world.player.hp, 3); assert.equal(session.world.projectiles.length, 0);
  assert.deepEqual(session.world.stats, { perfect: 0, graze: 0, pulses: 0, kills: 0 });
});

test('enemy aim locks at windup, attacks have a visible preparation, and pause freezes combat', () => {
  const session = createSession(); session.start(); const w = session.world;
  w.enemies[0].z = -4;
  stepWorld(w, { x: 0, z: 0 }); const target = w.enemies[0].targetX;
  for (let i = 0; i < 41; i++) stepWorld(w, { x: 1, z: 0 });
  assert.equal(w.projectiles.length, 0); assert.equal(w.enemies[0].targetX, target);
  session.pause(); const before = JSON.stringify(w);
  for (let i = 0; i < 50; i++) session.step({ x: 0, z: 0 });
  assert.equal(JSON.stringify(w), before);
  session.start(); session.step({ x: 0, z: 0 }); assert.equal(w.projectiles.length, 1);
});

test('four distinct perfect threats charge a held pulse; explicit release permits fresh energy', () => {
  const w = world(); spawnEnemy(w, 2, 0);
  for (let i = 0; i < 4; i++) {
    bullet(w, -1, 0, 120); updateThreats(w, 0); releasePulse(w);
    assert.equal(w.stats.pulses, 0); w.tick++;
  }
  assert.equal(w.player.energy, 100); releasePulse(w);assert.equal(w.stats.pulses,0);releasePulse(w,true);
  assert.equal(w.stats.perfect, 4); assert.equal(w.stats.pulses, 1);
  assert.equal(w.stats.kills, 0); assert.equal(w.enemies.length,1); assert.equal(w.player.energy, 0);
  bullet(w, -1, 0, 120); updateThreats(w, 0);
  assert.equal(w.player.energy, 25); assert.equal(w.stats.pulses, 1);
});

test('full combat state is identical at 30/60/144Hz presentation schedules', () => {
  const snapshots = [30, 60, 144].map(hz => {
    const w = createWorld();
    const clock = createClock(() => {
      const angle = Math.floor(w.tick / 20) * Math.PI / 4;
      stepWorld(w, { x: Math.cos(angle), z: Math.sin(angle), dash: w.tick % 73 === 0 });
    }, () => assert.fail('overload'));
    clock.advance(0);
    for (let frame = 1; frame <= hz * 20; frame++) clock.advance(frame * 1000 / hz);
    return JSON.stringify(w);
  });
  assert.equal(snapshots[0], snapshots[1]); assert.equal(snapshots[1], snapshots[2]);
});

test('long combat remains bounded and wall-blocked shooters still fire', () => {
  const w = createWorld(); w.player.x = 11.4; w.player.z = 0;
  Object.assign(w.enemies[0], { x: 11.6, z: 0 });
  // Test fixture maintains protection to observe spawning without ending the run.
  let shots = 0;
  for (let i = 0; i < 18000; i++) {
    w.player.protection = 100; stepWorld(w, { x: 0, z: 0 });
    shots += w.events.filter(e => e.type === 'shot').length;
    assert.ok(w.enemies.length <= 24); assert.ok(w.projectiles.length <= 96);
    assert.ok(w.events.length <= 32);
  }
  assert.ok(shots > 10);
});
