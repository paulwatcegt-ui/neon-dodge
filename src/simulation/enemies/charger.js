import { directionToPlayer, moveEnemy, prepare, recover, threat } from './common.js';
export function updateCharger(world, e) {
  if (e.state === 'windup') {
    if (--e.timer === 0) {
      e.state = 'charge'; e.timer = 30;
      e.threatId = threat(world, { kind: 'charge', ownerId: e.id, x: e.x, z: e.z, radius: 0.5, life: 31, attachedTo: e.id });
    } return;
  }
  if (e.state === 'charge') {
    const moved = moveEnemy(world, e, e.aimX, e.aimZ, e.chargeSpeed, 1);
    if (--e.timer <= 0 || moved.collided) {
      const attack = world.projectiles.find(b => b.id === e.threatId);
      if (attack) attack.life = 1;
      recover(world, e, 72);
    } return;
  }
  const d = directionToPlayer(world, e);
  if (d.distance > 9) moveEnemy(world, e, d.x, d.z, 2);
  else prepare(world, e, 48);
}
