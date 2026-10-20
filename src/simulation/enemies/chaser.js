import { directionToPlayer, moveEnemy, prepare, recover, threat } from './common.js';
export function updateChaser(world, e) {
  if (e.state === 'windup') {
    if (--e.timer === 0) {
      threat(world, { kind: 'melee', ownerId: e.id, x: e.x + e.aimX * 0.65, z: e.z + e.aimZ * 0.65, radius: 0.85, life: 1 });
      recover(world, e, 54);
    } return;
  }
  const d = directionToPlayer(world, e);
  if (d.distance > 1.25) moveEnemy(world, e, d.x, d.z, 2.4); else prepare(world, e, 36);
}
