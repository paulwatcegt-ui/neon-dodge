import { directionToPlayer, moveEnemy, prepare, recover } from './common.js';
import { normalize } from '../../shared/math.js';
import { shoot } from './ranged.js';
import { COMBAT } from '../../config/combat.js';
export function updateOrbiter(world, e) {
  if (e.state === 'windup') { if (--e.timer === 0) { shoot(world, e, COMBAT.projectileSpeed); e.orbitTicks=90; recover(world, e, 66); } return; }
  e.state = 'orbit';
  e.orbitTicks ??= 90; e.orbitTicks=Math.max(0,e.orbitTicks-1);
  const d = directionToPlayer(world, e), turn = e.id % 2 ? 1 : -1;
  const radial = Math.max(-1, Math.min(1, (d.distance - 6) * 0.5));
  const direction = normalize(d.x * radial - d.z * turn, d.z * radial + d.x * turn);
  moveEnemy(world, e, direction.x, direction.z, 2.5);
  if (e.orbitTicks===0 && d.distance >= 4 && d.distance <= 8) prepare(world, e, 48);
}
