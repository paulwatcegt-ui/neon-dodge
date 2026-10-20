import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/simulation/world.js';
import { createSession } from '../../src/core/session.js';
import { RUN_TICKS, STAGES, stageIndex } from '../../src/config/difficulty.js';
import { updateDirector } from '../../src/simulation/director.js';
import { updateEnemies, spawnEnemy } from '../../src/simulation/enemies.js';
import { updateThreats } from '../../src/simulation/combat.js';
import { releasePulse } from '../../src/simulation/pulse.js';
import { contains } from '../../src/simulation/arena.js';
import { reward } from '../../src/simulation/energy.js';
import { awardScore, updateScore, multiplier } from '../../src/simulation/scoring.js';
import { createRecords } from '../../src/storage/records.js';

function empty() { const w = createWorld(); w.enemies = []; w.nextSpawnAt = Infinity; return w; }
const idle = { x: 0, z: 0 };

test('five stages change on exact simulation tick boundaries', () => {
  for (let i = 1; i < STAGES.length; i++) {
    assert.equal(stageIndex(STAGES[i].start - 1), i - 1);
    assert.equal(stageIndex(STAGES[i].start), i);
  }
  const w = empty(); w.tick = 1800; updateDirector(w);
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

test('concurrent windups are capped and pulse removes attached charging attacks', () => {
  const w = empty();
  for (let i = 0; i < 8; i++) spawnEnemy(w, 2, 0, 'charger');
  updateEnemies(w);
  assert.equal(w.enemies.filter(e => e.state === 'windup').length, STAGES[0].attackers);
  for (let i = 0; i < 48; i++) updateEnemies(w);
  assert.ok(w.projectiles.length > 0);
  w.player.energy = 100; w.pulseQueuedAt = -1; releasePulse(w);
  assert.equal(w.enemies.length, 0); assert.equal(w.projectiles.length, 0);
  assert.equal(w.stats.kills, 8); assert.equal(w.player.energy, 0);
});

test('combo grows on actions, caps multiplier, expires exactly and resets on damage', () => {
  const w = empty();
  for (let i = 0; i < 100; i++) awardScore(w, 'kill');
  assert.equal(multiplier(w.score.combo), 4); assert.equal(w.score.bestCombo, 100);
  w.tick = 179; updateScore(w); assert.equal(w.score.combo, 100);
  w.tick = 180; updateScore(w); assert.equal(w.score.combo, 0);
  reward(w, { id: 999, outcome: null }, 'perfect'); assert.equal(w.score.combo, 1);
  w.projectiles.push({ id: 1000, x: 0, z: 0, previousX: 0, previousZ: 0, vx: 0, vz: 0, radius: 0.2, life: 1, outcome: null });
  updateThreats(w); assert.equal(w.score.combo, 0); assert.equal(w.score.bestCombo, 100);
});

test('full 180-second protected run reaches all stages, stops, and victory is awarded once', () => {
  const s = createSession(); s.start(); const w = s.world; const seen = new Set();
  for (let i = 0; i < RUN_TICKS; i++) {
    w.player.protection = 100; s.step(idle); seen.add(w.stage);
    assert.ok(w.enemies.length <= STAGES[w.stage].cap); assert.ok(w.projectiles.length <= 96);
  }
  assert.equal(s.mode, 'victory'); assert.equal(w.tick, RUN_TICKS);
  assert.deepEqual([...seen], [0, 1, 2, 3, 4]);
  assert.equal(w.score.value, 1800 + 1000 + 3 * 250);
  const score = w.score.value; s.start(); s.step(idle); stepWorld(w, idle);
  assert.equal(s.mode, 'victory'); assert.equal(w.tick, RUN_TICKS); assert.equal(w.score.value, score);
  s.reset(); assert.equal(s.world.outcome, null); assert.equal(s.world.stage, 0); assert.equal(s.world.score.value, 0);
});

test('lethal hit on the final tick wins priority over victory', () => {
  const s = createSession(); s.start(); const w = s.world; w.enemies = []; w.nextSpawnAt = Infinity;
  w.tick = RUN_TICKS - 1; w.player.hp = 1;
  w.projectiles.push({ id: 999, x: 0, z: 0, previousX: 0, previousZ: 0, vx: 0, vz: 0, radius: 0.2, life: 2, outcome: null });
  s.step(idle); assert.equal(s.mode, 'defeated'); assert.equal(w.outcome, 'defeat');
  assert.equal(w.events.some(e => e.type === 'victory'), false);
});

test('records reject malformed data, preserve best score and survive disabled storage', () => {
  let saved = ''; const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  saved = '{bad'; const r = createRecords(storage); assert.equal(r.read().score, 0);
  const w = empty(); w.outcome = 'victory'; w.score.value = 1000; w.score.bestCombo = 8; r.saveResult(w);
  r.saveResult(w); assert.equal(r.read().victories, 1);
  const lower = empty(); lower.score.value = 50; lower.outcome = 'defeat'; r.saveResult(lower);
  assert.deepEqual(createRecords(storage).read(), { score: 1000, bestCombo: 8, victories: 1 });
  saved = JSON.stringify({ version: 1, score: -5, bestCombo: 0, victories: 0 }); assert.equal(createRecords(storage).read().score, 0);
  const disabled = createRecords({ getItem() { throw Error('disabled'); }, setItem() { throw Error('disabled'); } });
  assert.doesNotThrow(() => disabled.saveResult(lower)); assert.equal(disabled.read().score, 50);
});
