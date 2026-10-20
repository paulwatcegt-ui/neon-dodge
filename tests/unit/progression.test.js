import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/simulation/world.js';
import { createSession } from '../../src/core/session.js';
import { STAGES, stageIndex } from '../../src/config/difficulty.js';
import { updateDirector } from '../../src/simulation/director.js';
import { updateEnemies, spawnEnemy } from '../../src/simulation/enemies.js';
import { updateThreats } from '../../src/simulation/combat.js';
import { releasePulse } from '../../src/simulation/pulse.js';
import { contains } from '../../src/simulation/arena.js';
import { reward } from '../../src/simulation/energy.js';
import { awardScore, updateScore, multiplier } from '../../src/simulation/scoring.js';

function empty() { const w = createWorld(); w.enemies = []; w.nextSpawnAt = Infinity; return w; }
const idle = { x: 0, z: 0 };

test('five stages change on exact simulation tick boundaries', () => {
  for (let i = 1; i < STAGES.length; i++) {
    assert.equal(stageIndex(STAGES[i].start - 1), i - 1);
    assert.equal(stageIndex(STAGES[i].start), i);
  }
  const w = empty(); w.tick = 900; updateDirector(w);
  assert.equal(w.stage, 1); assert.equal(w.events.filter(e => e.type === 'stage').length, 1);
  updateDirector(w); assert.equal(w.events.filter(e => e.type === 'stage').length, 1);
});

test('director respects safe distance, type quotas, stage caps and introduces new types', () => {
  const w = empty(); const seen = new Set();
  for (let stage = 0; stage < 5; stage++) {
    for (let n = 0; n < 100; n++) {
      w.tick = STAGES[stage].start + n; w.nextSpawnAt = w.tick;
      updateDirector(w);
      assert.ok(w.enemies.length <= STAGES[stage].cap);
      for (const e of w.enemies) {
        seen.add(e.type); assert.ok(contains(w.arena, e, 0.4));
        assert.ok(Math.hypot(e.x, e.z) >= 5);
      }
      assert.ok(w.enemies.filter(e => e.type === 'zoner').length <= 2);
      assert.ok(w.enemies.filter(e => e.type === 'shooter').length <= 4);
    }
  }
  assert.deepEqual([...seen].sort(), ['charger', 'chaser', 'shooter', 'zoner']);
});

test('chaser approaches, telegraphs, and generates one close attack', () => {
  const w = empty(); spawnEnemy(w, 0, -2, 'chaser');
  for (let i = 0; i < 80; i++) updateEnemies(w);
  assert.ok(w.enemies[0].z > -2);
  assert.equal(w.projectiles.length, 1); assert.equal(w.projectiles[0].kind, 'melee');
  assert.equal(w.enemies[0].state, 'recover');
});

test('charger locks direction, sweeps into player once, then recovers', () => {
  const w = empty(); spawnEnemy(w, 0, -5, 'charger'); updateEnemies(w);
  const e = w.enemies[0], aim = [e.aimX, e.aimZ];
  for (let i = 0; i < 48; i++) updateEnemies(w);
  assert.equal(e.state, 'charge'); assert.equal(w.projectiles[0].kind, 'charge');
  for (let i = 0; i < 30; i++) { updateEnemies(w); updateThreats(w); }
  assert.deepEqual([e.aimX, e.aimZ], aim); assert.equal(w.player.hp, 2); assert.equal(e.state, 'recover');
  assert.equal(w.projectiles.length, 0);
});

test('zoner targets a fixed point, waits 60 ticks, and its zone expires', () => {
  const w = empty(); spawnEnemy(w, 0, -5, 'zoner'); updateEnemies(w);
  w.player.x = 4; w.player.previousX = 4;
  for (let i = 0; i < 59; i++) updateEnemies(w);
  assert.equal(w.projectiles.length, 0); updateEnemies(w);
  const zone = w.projectiles[0]; assert.equal(zone.kind, 'zone'); assert.equal(zone.x, 0);
  for (let i = 0; i < 48; i++) updateThreats(w);
  assert.equal(w.projectiles.length, 0); assert.equal(w.player.hp, 3);
});

test('dangerous concurrent windups are capped and pulse removes attached charging attacks', () => {
  const w = empty();
  for (let i = 0; i < 8; i++) spawnEnemy(w, 2, 0, 'charger');
  for (let i = 0; i <= 12; i++) { w.tick = i; updateEnemies(w); }
  assert.equal(w.enemies.filter(e => e.state === 'windup').length, 2);
  for (let i = 13; i < 62; i++) { w.tick = i; updateEnemies(w); }
  assert.ok(w.projectiles.length > 0);
  w.player.energy = 100; w.pulseQueuedAt = -1; releasePulse(w);
  assert.equal(w.enemies.length, 0); assert.equal(w.projectiles.length, 0);
  assert.equal(w.stats.kills, 8); assert.equal(w.player.energy, 0);
});

test('combo grows on actions, caps multiplier, expires exactly and resets on damage', () => {
  const w = empty();
  for (let i = 0; i < 100; i++) awardScore(w, 'perfect');
  assert.equal(multiplier(w.score.combo), 4); assert.equal(w.score.bestCombo, 100);
  w.tick = 179; updateScore(w); assert.equal(w.score.combo, 100);
  w.tick = 180; updateScore(w); assert.equal(w.score.combo, 0);
  reward(w, { id: 999, outcome: null }, 'perfect'); assert.equal(w.score.combo, 1);
  w.projectiles.push({ id: 1000, x: 0, z: 0, previousX: 0, previousZ: 0, vx: 0, vz: 0, radius: 0.2, life: 1, outcome: null });
  updateThreats(w); assert.equal(w.score.combo, 0); assert.equal(w.score.bestCombo, 100);
});

test('lethal hit after ten minutes ends once, with no victory bonus or post-death scoring', () => {
  const s = createSession(); s.start(); const w = s.world; w.enemies = []; w.nextSpawnAt = Infinity;
  w.tick = 36059; w.player.hp = 1;
  w.projectiles.push({ id: 999, x: 0, z: 0, previousX: 0, previousZ: 0, vx: 0, vz: 0, radius: 0.2, life: 2, outcome: null });
  s.step(idle); assert.equal(s.mode, 'defeated'); assert.equal(w.outcome, 'defeat');
  assert.equal(w.events.some(e => e.type === 'victory'), false);
  const before = JSON.stringify(w); s.start(); s.step(idle); stepWorld(w, idle);
  assert.equal(JSON.stringify(w), before);
});
