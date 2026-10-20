import { GAME } from '../config/gameplay.js';
import { createArena, moveDisk } from './arena.js';
import { normalize } from '../shared/math.js';
import { COMBAT } from '../config/combat.js';
import { makeRng } from '../vendor/voxel-survivors/rng.js';
import { spawnEnemy, updateEnemies } from './enemies.js';
import { updateThreats } from './combat.js';
import { releasePulse } from './pulse.js';
import { updateDirector } from './director.js';
import { updateScore } from './scoring.js';
import { RUN_TICKS } from '../config/difficulty.js';
import { emit } from '../core/events.js';
import { createAdaptiveDifficulty, updateAdaptiveDifficulty } from './adaptiveDifficulty.js';

export function createWorld() {
  const world = {
    tick: 0, stage: 0, outcome: null, adaptive: createAdaptiveDifficulty(),
    score: { value: 0, combo: 0, bestCombo: 0, expiresAt: 0 },
    rng: makeRng(1001), nextEntityId: 1, nextEventId: 1, events: [],
    enemies: [], projectiles: [], nextSpawnAt: 180, pulseQueuedAt: null,
    stats: { perfect: 0, graze: 0, pulses: 0, kills: 0 },
    arena: createArena(GAME.apothem),
    player: { x: 0, z: 0, previousX: 0, previousZ: 0, facingX: 0, facingZ: -1,
      dashX: 0, dashZ: -1, dashRemaining: 0, dashAge: 0, cooldown: 0,
      hp: COMBAT.hp, energy: 0, protection: 0 },
  };
  spawnEnemy(world, 0, -7);
  return world;
}

/** Pure simulation: all durations are integer ticks, no renderer or browser dependencies. */
export function stepWorld(world, command) {
  world.events.length = 0;
  const p = world.player;
  if (p.hp <= 0 || world.outcome) return;
  updateScore(world);
  updateDirector(world);
  if (p.protection > 0) p.protection--;
  p.previousX = p.x; p.previousZ = p.z;
  const direction = normalize(command.x, command.z);
  const moving = Math.hypot(direction.x, direction.z) > 0;
  if (p.dashRemaining === 0 && moving) { p.facingX = direction.x; p.facingZ = direction.z; }
  if (command.dash && p.cooldown === 0 && p.dashRemaining === 0) {
    p.dashX = p.facingX; p.dashZ = p.facingZ;
    p.dashRemaining = GAME.dashTicks;
    p.dashAge = 0;
    p.cooldown = GAME.dashCooldownTicks;
    emit(world, 'dash', { x: p.x, z: p.z });
  }
  const dashing = p.dashRemaining > 0;
  const perfectAge = dashing ? p.dashAge : Infinity;
  const distance = (dashing ? GAME.dashSpeed : GAME.moveSpeed) * GAME.step;
  const delta = { x: (dashing ? p.dashX : direction.x) * distance,
    z: (dashing ? p.dashZ : direction.z) * distance };
  const result = moveDisk(world.arena, p, delta, GAME.playerRadius, !dashing);
  p.x = result.x; p.z = result.z;
  if (dashing) p.dashRemaining = result.collided ? 0 : p.dashRemaining - 1;
  if (dashing) p.dashAge++;
  if (p.cooldown > 0) p.cooldown--;
  updateEnemies(world);
  updateThreats(world, perfectAge);
  releasePulse(world);
  world.tick++;
  updateAdaptiveDifficulty(world);
  if (world.tick % 60 === 0) world.score.value += 10;
  if (p.hp <= 0) world.outcome = 'defeat';
  else if (world.tick >= RUN_TICKS) {
    world.outcome = 'victory'; world.score.value += 1000 + p.hp * 250;
    emit(world, 'victory');
  }
}
