import { COMBAT } from '../../config/combat.js';
import { emit } from '../../core/events.js';
import { threat } from './common.js';
export function shoot(world, e, speed, angle = 0, flavor = e.type) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const dx = e.aimX * cos - e.aimZ * sin, dz = e.aimX * sin + e.aimZ * cos;
  const id = threat(world, { kind: 'bullet', flavor, ownerId: e.id, x: e.x + dx * 0.6, z: e.z + dz * 0.6,
    vx: dx * speed, vz: dz * speed, radius: COMBAT.projectileRadius, life: COMBAT.projectileLife });
  if (id) emit(world, 'shot', { x: e.x, z: e.z, enemyType: e.type });
}
