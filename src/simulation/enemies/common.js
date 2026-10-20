import { GAME } from '../../config/gameplay.js';
import { COMBAT } from '../../config/combat.js';
import { STAGES } from '../../config/difficulty.js';
import { normalize } from '../../shared/math.js';
import { moveDisk } from '../arena.js';
export function directionToPlayer(world, e) {
  const dx = world.player.x - e.x, dz = world.player.z - e.z;
  return { ...normalize(dx, dz), distance: Math.hypot(dx, dz) };
}
export function moveEnemy(world, e, x, z, speed) {
  const result = moveDisk(world.arena, e, { x: x * speed * STAGES[world.stage].speed * GAME.step,
    z: z * speed * STAGES[world.stage].speed * GAME.step }, COMBAT.enemyRadius);
  const distance = Math.hypot(result.x - e.x, result.z - e.z); e.x = result.x; e.z = result.z;
  return { ...result, distance };
}
export function prepare(world, e, ticks) {
  if (world.enemies.filter(a => a.state === 'windup' || a.state === 'charge').length >= STAGES[world.stage].attackers) return false;
  const aim = normalize(world.player.x - e.x, world.player.z - e.z);
  e.aimX = aim.x || (aim.z === 0 ? 1 : 0); e.aimZ = aim.z;
  e.targetX = world.player.x; e.targetZ = world.player.z;
  e.state = 'windup'; e.timer = ticks; e.windupTicks = ticks; return true;
}
export function recover(e, ticks) { e.state = 'recover'; e.timer = ticks; }
export function threat(world, data) {
  if (world.projectiles.length >= COMBAT.projectileCap) return;
  const id = world.nextEntityId++;
  world.projectiles.push({ id, previousX: data.x, previousZ: data.z, vx: 0, vz: 0,
    outcome: null, pendingGraze: false, dead: false, ...data }); return id;
}
