import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/simulation/world.js';
import { createSession } from '../../src/core/session.js';
import { updateAdaptiveDifficulty, difficultyLimits } from '../../src/simulation/adaptiveDifficulty.js';
import { updateDirector } from '../../src/simulation/director.js';
import { prepare } from '../../src/simulation/enemies/common.js';
import { spawnEnemy } from '../../src/simulation/enemies.js';
import { STAGES } from '../../src/config/difficulty.js';

test('real damage triggers relief, postpones spawn and preserves live threats', () => {
  const w = createWorld(); w.enemies = []; w.nextSpawnAt = 1;
  w.projectiles.push({ id: 900, x: 0, z: 0, vx: 0, vz: 0, radius: 0.2, life: 5, outcome: null });
  w.projectiles.push({ id: 901, x: 7, z: 7, vx: 0, vz: 0, radius: 0.2, life: 20, outcome: null });
  stepWorld(w, { x: 0, z: 0 });
  assert.equal(w.player.hp, 2); assert.equal(w.adaptive.mode, 'relief');
  assert.equal(w.nextSpawnAt, 1 + 252);
  assert.equal(w.projectiles[0].id, 901);
  assert.equal(w.events.filter(e => e.type === 'pressure').length, 1);
});

test('relief lasts through recovery, returns at review and one HP remains protected', () => {
  const w = createWorld(); w.player.hp = 2; w.tick = 1; updateAdaptiveDifficulty(w);
  w.tick = 900; updateAdaptiveDifficulty(w); assert.equal(w.adaptive.mode, 'relief');
  w.tick = 1200; updateAdaptiveDifficulty(w); assert.equal(w.adaptive.mode, 'standard');
  w.player.hp = 1; updateAdaptiveDifficulty(w);
  w.tick = 9000; updateAdaptiveDifficulty(w); assert.equal(w.adaptive.mode, 'relief');
});

test('pressure needs recent skilled actions and full health; idle survival earns none', () => {
  const w = createWorld(); w.tick = 900; updateAdaptiveDifficulty(w);
  assert.equal(w.adaptive.mode, 'standard');
  w.tick = 901; w.stats.perfect = 2; w.stats.graze = 6; updateAdaptiveDifficulty(w);
  w.tick = 1200; updateAdaptiveDifficulty(w); assert.equal(w.adaptive.mode, 'pressure');
  w.tick = 1500; updateAdaptiveDifficulty(w); assert.equal(w.adaptive.mode, 'pressure');
  w.tick = 1800; updateAdaptiveDifficulty(w); assert.equal(w.adaptive.mode, 'standard');
  assert.equal(w.adaptive.samples.length, 0);
  w.player.hp = 2; w.adaptive.hp = 2;
  w.tick = 2400; w.stats.perfect += 4; w.stats.graze += 8; updateAdaptiveDifficulty(w);
  assert.equal(w.adaptive.mode, 'standard');
});

test('all modes obey stage/type caps, relief blocks new windups without cancelling current ones', () => {
  for (let stage = 0; stage < STAGES.length; stage++) {
    for (const mode of ['relief', 'standard', 'pressure']) {
      const w = createWorld(); w.stage = stage; w.adaptive.mode = mode; w.enemies = [];
      const limits = difficultyLimits(w);
      assert.ok(limits.cap <= STAGES[stage].cap); assert.ok(limits.attackers <= STAGES[stage].attackers);
      for (let i = 0; i < 80; i++) {
        w.tick = STAGES[stage].start + i; w.nextSpawnAt = w.tick; updateDirector(w);
      }
      assert.ok(w.enemies.length <= limits.cap);
      assert.ok(w.enemies.filter(e => e.type === 'shooter').length <= 4);
      assert.ok(w.enemies.filter(e => e.type === 'zoner').length <= 2);
    }
  }
  const w = createWorld(); w.enemies = [];
  for (let i = 0; i < 4; i++) spawnEnemy(w, i + 2, 0, 'chaser');
  for (let i = 0; i < 3; i++) assert.equal(prepare(w, w.enemies[i], 36), true);
  w.adaptive.mode = 'relief';
  assert.equal(prepare(w, w.enemies[3], 36), false);
  assert.equal(w.enemies.filter(e => e.state === 'windup').length, 3);
  assert.ok(w.enemies.slice(0, 3).every(e => e.timer === 36));
});

test('adaptive state is bounded, deterministic and resets with the session; pause freezes it', () => {
  const s = createSession(); s.start();
  const other = createWorld();
  for (let tick = 0; tick < 2000; tick++) {
    for (const w of [s.world, other]) {
      w.player.protection = 100;
      // Controlled skill events in an otherwise identical seeded simulation.
      if (tick % 30 === 0) { w.stats.perfect++; w.stats.graze++; }
    }
    s.step({ x: 0, z: 0 }); stepWorld(other, { x: 0, z: 0 });
    assert.ok(s.world.adaptive.samples.length <= 16);
  }
  assert.equal(JSON.stringify(s.world), JSON.stringify(other));
  assert.equal(s.world.rng.next(), other.rng.next());
  const snapshot = JSON.stringify(s.world); s.pause('manual');
  for (let i = 0; i < 60; i++) s.step({ x: 0, z: 0 });
  assert.equal(JSON.stringify(s.world), snapshot);
  s.reset(); assert.deepEqual(s.world.adaptive, createWorld().adaptive);
});
