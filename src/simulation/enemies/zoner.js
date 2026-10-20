import { directionToPlayer, moveEnemy, prepare, recover, threat } from './common.js';
export function updateZoner(world, e) {
  if (e.state === 'windup') {
    if (--e.timer === 0) { threat(world, { kind: 'zone', ownerId: e.id, x: e.targetX, z: e.targetZ, radius: 1.4, life: 48 }); recover(e, 150); }
    return;
  }
  const d = directionToPlayer(world, e);
  if (d.distance > 9) moveEnemy(world, e, d.x, d.z, 1.5); else prepare(world, e, 60);
}
