import { directionToPlayer, moveEnemy, prepare, recover, threat } from './common.js';
export function updateBlaster(world, e) {
  if (e.state === 'windup') {
    if (--e.timer === 0) { threat(world, { kind: 'blast', ownerId: e.id, x: e.x, z: e.z, radius: 2, life: 12 }); recover(world, e, 138); }
    return;
  }
  const d = directionToPlayer(world, e);
  if (d.distance > 2.5) moveEnemy(world, e, d.x, d.z, 3); else prepare(world, e, 60);
}
