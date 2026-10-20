import { STAGES, stageIndex, PATTERNS, patternIndex } from '../config/difficulty.js';
import { contains } from './arena.js';
import { COMBAT } from '../config/combat.js';
import { spawnEnemy } from './enemies.js';
import { emit } from '../core/events.js';
import { difficultyLimits } from './adaptiveDifficulty.js';
import { ENEMIES, ACTIVE_ATTACK_STATES } from '../config/enemies.js';
export function updateDirector(world) {
  const index = stageIndex(world.tick);
  if (index !== world.stage) { world.stage = index; emit(world, 'stage', { number: index + 1, name: STAGES[index].name }); }
  const pattern = patternIndex(world.tick);
  if (pattern !== world.pattern) {
    world.pattern = pattern; emit(world, 'pattern', { name: PATTERNS[pattern].name });
  }
  const stage = STAGES[index];
  const limits = difficultyLimits(world);
  if (world.tick < world.nextSpawnAt) return;
  world.nextSpawnAt = world.tick + limits.spawnEvery;
  const pool = stage.types.filter(type => world.enemies.filter(e => e.type === type).length < ENEMIES[type].cap);
  if (!pool.length) return;
  const missing = pool.filter(type => !world.enemies.some(e => e.type === type));
  let replace = null;
  if (world.enemies.length >= limits.cap) {
    if (!missing.length || world.tick < world.nextRosterAt || world.enemies.length > limits.cap) return;
    // Rotate only surplus, inactive units; never cancel a telegraphed attack to make a slot.
    replace = world.enemies.filter(e => e.state!=='stunned' && !ACTIVE_ATTACK_STATES.includes(e.state) && world.enemies.filter(a=>a.type===e.type).length>1)
      .sort((a,b)=>a.id-b.id)[0];
    if (!replace) return;
  }
  const focused = pattern < 0 ? [] : pool.filter(type => PATTERNS[pattern].focus.includes(type));
  const choices = missing.length ? missing : focused.length ? focused : pool;
  for (let attempt = 0; attempt < 24; attempt++) {
    const a = world.rng.range(0, Math.PI * 2), point = { x: Math.sin(a) * 10.2, z: Math.cos(a) * 10.2 };
    if (!contains(world.arena, point, COMBAT.enemyRadius) || Math.hypot(point.x - world.player.x, point.z - world.player.z) < 5) continue;
    if (world.enemies.some(e => Math.hypot(e.x - point.x, e.z - point.z) < 1.1)) continue;
    if (replace) { world.enemies=world.enemies.filter(e=>e.id!==replace.id); world.nextRosterAt=world.tick+600; emit(world,'enemyRetired',{enemyType:replace.type}); }
    spawnEnemy(world, point.x, point.z, choices[world.rng.int(0, choices.length - 1)]); return;
  }
}
