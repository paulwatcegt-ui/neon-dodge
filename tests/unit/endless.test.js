import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../../src/simulation/world.js';
import { createSession } from '../../src/core/session.js';
import { difficultyLimits } from '../../src/simulation/adaptiveDifficulty.js';
import { STAGES, PATTERNS, patternIndex } from '../../src/config/difficulty.js';
import { recover, prepare } from '../../src/simulation/enemies/common.js';
import { spawnEnemy } from '../../src/simulation/enemies.js';
import { releasePulse } from '../../src/simulation/pulse.js';
import { awardScore } from '../../src/simulation/scoring.js';
import { createRunIdentity } from '../../src/core/runIdentity.js';
import { hasEscapePositions } from '../../src/simulation/attackSafety.js';
import { updateEnemies } from '../../src/simulation/enemies.js';

const idle = { x: 0, z: 0 };
test('opening uses two types and faster spawns; standard never grants damage relief', () => {
  const w = createWorld(); assert.equal(new Set(w.enemies.map(e => e.type)).size, 2);
  for (let i = 0; i < 61; i++) stepWorld(w, idle);
  assert.ok(w.enemies.length >= 3);
  w.player.hp = 1; stepWorld(w, idle);
  assert.equal(w.adaptive.mode, 'standard'); assert.equal(difficultyLimits(w).cap, 8);
  const s = createSession(); s.start(); assert.equal(s.setGameMode('practice'), false);
  s.pause(); assert.equal(s.setGameMode('practice'), false);
});

test('multiple seeds and both modes continue past 180/300/600s with bounded live state and changing full-cap tactics', () => {
  for (const mode of ['standard', 'practice']) for (const seed of [1, 42, 1001]) {
    const s = createSession({ mode, seed }); s.start(); const w = s.world;
    const seen = new Set(), patterns = new Set(); let fullCapChanges = 0, lateShots = 0;
    for (let tick = 0; tick <= 36060; tick++) {
      w.player.protection = 100; // Test-only survival fixture; production has no setters.
      s.step(idle); seen.add(w.stage);
      if (w.tick > 10800 && w.events.some(e => e.type === 'shot')) lateShots++;
      if (w.pattern >= 0) patterns.add(w.pattern);
      if (w.events.some(e => e.type === 'pattern') && w.enemies.length === 24) fullCapChanges++;
      assert.ok(w.enemies.length <= STAGES[w.stage].cap);
      assert.ok(w.projectiles.length <= 96); assert.ok(w.events.length <= 32);
      assert.ok(w.adaptive.samples.length <= 15);
      const risky = w.enemies.filter(e => ['charger', 'zoner'].includes(e.type) && ['windup', 'charge'].includes(e.state)).length;
      assert.ok(risky + w.projectiles.filter(b => b.kind === 'zone').length <= 2);
      if ([10801, 18001, 36001].includes(w.tick)) { assert.equal(s.mode, 'running'); assert.equal(w.outcome, null); }
    }
    assert.equal(w.score.value, 6010); assert.equal(seen.size, 5); assert.equal(patterns.size, PATTERNS.length);
    assert.ok(fullCapChanges >= 10); assert.ok(lateShots >= 10);
  }
});

test('cycling tactics changes attack recovery at full cap; pressure is bounded indefinitely', () => {
  const w = createWorld(); w.stage = 4;
  const e = w.enemies[0]; e.type = 'charger';
  w.tick = 7200; w.pattern = patternIndex(w.tick); recover(w, e, 72); const fast = e.timer;
  w.tick = 8400; w.pattern = patternIndex(w.tick); recover(w, e, 72); assert.ok(e.timer > fast);
  w.tick = 60 * 60 * 24 * 365; assert.ok(difficultyLimits(w).spawnEvery >= 30);
  assert.equal(difficultyLimits(w).cap, 24); assert.equal(difficultyLimits(w).attackers, 8);
});

test('windups keep clear minimum warning and stagger starts; zones cannot stack', () => {
  const w = createWorld(); w.enemies = []; w.stage = 4;
  spawnEnemy(w, -3, 0, 'zoner'); spawnEnemy(w, 3, 0, 'zoner'); spawnEnemy(w, 0, -6, 'charger');
  assert.equal(prepare(w, w.enemies[0], 60), true);
  assert.equal(prepare(w, w.enemies[2], 48), false);
  w.tick = 12; assert.equal(prepare(w, w.enemies[1], 60), false);
  assert.equal(prepare(w, w.enemies[2], 48), true);
  assert.equal(w.enemies[0].timer, 60); assert.equal(w.enemies[2].timer, 48);
});

test('pulse kills have flat bounded score, cannot extend dodge combo, regenerate energy or score twice', () => {
  const w = createWorld(); w.enemies = []; w.nextSpawnAt = Infinity;
  for (let i = 0; i < 12; i++) awardScore(w, 'perfect');
  const combo = structuredClone(w.score);
  for (let i = 0; i < 24; i++) spawnEnemy(w, 1, 1, 'chaser');
  w.player.energy = 100; w.pulseQueuedAt = -1; releasePulse(w);
  assert.equal(w.score.value - combo.value, 24 * 50);
  assert.equal(w.score.combo, combo.combo); assert.equal(w.score.expiresAt, combo.expiresAt);
  assert.equal(w.player.energy, 0); const score = w.score.value;
  releasePulse(w); assert.equal(w.score.value, score);
  w.player.hp = 0; w.outcome = 'defeat'; awardScore(w, 'perfect'); assert.equal(w.score.value, score);
});

test('browser run identity and seed regenerate on restart; chosen mode is retained', () => {
  const s = createSession({ newRun: createRunIdentity }); const before = s.world.runId;
  assert.equal(s.setGameMode('practice'), true); const changed = s.world.runId;
  s.reset(); assert.notEqual(s.world.runId, changed); assert.notEqual(before, changed);
  assert.equal(s.world.gameMode, 'practice'); assert.ok(Number.isInteger(s.world.seed));
});

test('high-risk admission reserves walking escape points and rejects a fully covered arena', () => {
  const w = createWorld(); w.enemies = [];
  const candidate = { type: 'zoner', targetX: 0, targetZ: 0 };
  assert.equal(hasEscapePositions(w, candidate, 60), true);
  w.projectiles.push({ x: 0, z: 0, vx: 0, vz: 0, radius: 20, life: 600 });
  assert.equal(hasEscapePositions(w, candidate, 60), false);
  spawnEnemy(w, -3, 0, 'zoner'); assert.equal(prepare(w, w.enemies[0], 60), false);
  assert.equal(w.enemies[0].state, 'approach');
});

test('charger warning endpoint matches actual travel even if stage changes during windup', () => {
  const w = createWorld(); w.enemies = []; spawnEnemy(w, -5, 0, 'charger');
  updateEnemies(w); const e = w.enemies[0], target = e.targetX;
  assert.equal(e.windupTicks, 48); w.stage = 4;
  for (let i = 0; i < 48 + 30; i++) updateEnemies(w);
  assert.ok(Math.abs(e.x - target) < 1e-7); assert.equal(e.state, 'recover');
});
