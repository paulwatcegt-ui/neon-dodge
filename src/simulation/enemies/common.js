import { GAME } from '../../config/gameplay.js';
import { COMBAT } from '../../config/combat.js';
import { STAGES, PATTERNS, endlessTier } from '../../config/difficulty.js';
import { normalize } from '../../shared/math.js';
import { moveDisk } from '../arena.js';
import { difficultyLimits } from '../adaptiveDifficulty.js';
import { hasEscapePositions } from '../attackSafety.js';
import { ENEMIES, ACTIVE_ATTACK_STATES, HIGH_RISK_TYPES } from '../../config/enemies.js';
export function directionToPlayer(world, e) {
  const dx = world.player.x - e.x, dz = world.player.z - e.z;
  return { ...normalize(dx, dz), distance: Math.hypot(dx, dz) };
}
export function moveEnemy(world, e, x, z, speed, stageSpeed = STAGES[world.stage].speed) {
  const result = moveDisk(world.arena, e, { x: x * speed * stageSpeed * GAME.step,
    z: z * speed * stageSpeed * GAME.step }, COMBAT.enemyRadius);
  const distance = Math.hypot(result.x - e.x, result.z - e.z); e.x = result.x; e.z = result.z;
  return { ...result, distance };
}
export function prepare(world, e, ticks) {
  if (world.tick < world.nextAttackAt) return false;
  const active = world.enemies.filter(a => ACTIVE_ATTACK_STATES.includes(a.state));
  const reserved = active.reduce((sum, a) => sum + (ENEMIES[a.type]?.shots ?? 1), 0);
  if (world.projectiles.length + reserved + ENEMIES[e.type].shots > COMBAT.projectileCap) return false;
  // Keep area denial and fast charges sparse, with visible gaps between attack starts.
  if (e.type === 'zoner' && (active.some(a => a.type === 'zoner') || world.projectiles.some(b => b.kind === 'zone'))) return false;
  if (HIGH_RISK_TYPES.includes(e.type) && active.filter(a => HIGH_RISK_TYPES.includes(a.type)).length + world.projectiles.filter(b => ['zone','blast'].includes(b.kind)).length >= 2) return false;
  if (active.length >= difficultyLimits(world).attackers) return false;
  const aim = normalize(world.player.x - e.x, world.player.z - e.z);
  const plan = { ...e, aimX: aim.x || (aim.z === 0 ? 1 : 0), aimZ: aim.z,
    targetX: world.player.x, targetZ: world.player.z };
  if (e.type === 'charger') {
    plan.chargeSpeed = 14 * STAGES[world.stage].speed;
    const end = moveDisk(world.arena, e, { x: plan.aimX * plan.chargeSpeed * 0.5, z: plan.aimZ * plan.chargeSpeed * 0.5 }, COMBAT.enemyRadius, false);
    plan.targetX = end.x; plan.targetZ = end.z;
  }
  if (e.type === 'sniper') { plan.targetX = e.x + plan.aimX * 35; plan.targetZ = e.z + plan.aimZ * 35; }
  if (e.type === 'blaster') { plan.targetX = e.x; plan.targetZ = e.z; }
  if (HIGH_RISK_TYPES.includes(e.type) && !hasEscapePositions(world, plan, ticks)) return false;
  Object.assign(e, plan);
  world.nextAttackAt = world.tick + 12;
  e.state = 'windup'; e.timer = ticks; e.windupTicks = ticks; return true;
}
export function recover(world, e, ticks) {
  const focus = world.pattern >= 0 && PATTERNS[world.pattern].focus.includes(e.type);
  const scale = Math.max(0.55, STAGES[world.stage].recovery - endlessTier(world.tick) * 0.02);
  e.state = 'recover'; e.timer = Math.max(30, Math.round(ticks * scale * (world.pattern < 0 ? 1 : focus ? 0.8 : 1.15)));
}
export function threat(world, data) {
  if (world.projectiles.length >= COMBAT.projectileCap) return;
  const id = world.nextEntityId++;
  world.projectiles.push({ id, previousX: data.x, previousZ: data.z, vx: 0, vz: 0,
    outcome: null, pendingGraze: false, dead: false, ...data }); return id;
}
