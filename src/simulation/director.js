import { STAGES, stageIndex } from '../config/difficulty.js';
import { contains } from './arena.js';
import { COMBAT } from '../config/combat.js';
import { spawnEnemy } from './enemies.js';
import { emit } from '../core/events.js';
import { difficultyLimits } from './adaptiveDifficulty.js';
export function updateDirector(world) {
  const index = stageIndex(world.tick);
  if (index !== world.stage) { world.stage = index; emit(world, 'stage', { number: index + 1, name: STAGES[index].name }); }
  const stage = STAGES[index];
  const limits = difficultyLimits(world);
  if (world.tick < world.nextSpawnAt) return;
  world.nextSpawnAt = world.tick + limits.spawnEvery;
  if (world.enemies.length >= limits.cap) return;
  const pool = stage.types.filter(type => world.enemies.filter(e => e.type === type).length < (type === 'zoner' ? 2 : type === 'shooter' ? 4 : stage.cap));
  if (!pool.length) return;
  const missing = pool.filter(type => !world.enemies.some(e => e.type === type));
  const choices = missing.length ? missing : pool;
  for (let attempt = 0; attempt < 24; attempt++) {
    const a = world.rng.range(0, Math.PI * 2), point = { x: Math.sin(a) * 10.2, z: Math.cos(a) * 10.2 };
    if (!contains(world.arena, point, COMBAT.enemyRadius) || Math.hypot(point.x - world.player.x, point.z - world.player.z) < 5) continue;
    if (world.enemies.some(e => Math.hypot(e.x - point.x, e.z - point.z) < 1.1)) continue;
    spawnEnemy(world, point.x, point.z, choices[world.rng.int(0, choices.length - 1)]); return;
  }
}
