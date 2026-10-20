import { COMBAT } from '../../config/combat.js';
import { emit } from '../../core/events.js';
import { directionToPlayer, moveEnemy, prepare, recover, threat } from './common.js';
export function fireProjectile(world, e) {
  const x = e.x + e.aimX * 0.6, z = e.z + e.aimZ * 0.6;
  const id = threat(world, { x, z, kind: 'bullet', ownerId: e.id,
    vx: e.aimX * COMBAT.projectileSpeed, vz: e.aimZ * COMBAT.projectileSpeed,
    radius: COMBAT.projectileRadius, life: COMBAT.projectileLife });
  if (id) emit(world, 'shot', { x, z });
}
export function updateShooter(world, e) {
  if (e.state === 'windup') { if (--e.timer === 0) { fireProjectile(world, e); recover(e, COMBAT.recoverTicks); } return; }
  const d = directionToPlayer(world, e);
  if (d.distance > COMBAT.keepDistance + 0.5 || d.distance < COMBAT.keepDistance - 1) {
    const sign = d.distance < COMBAT.keepDistance - 1 ? -1 : 1;
    if (moveEnemy(world, e, d.x * sign, d.z * sign, COMBAT.enemySpeed).distance > 1e-8) return;
  }
  prepare(world, e, COMBAT.windupTicks);
}
