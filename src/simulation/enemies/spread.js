import { directionToPlayer, moveEnemy, prepare, recover } from './common.js';
import { shoot } from './ranged.js';
import { COMBAT } from '../../config/combat.js';
export function updateSpread(world, e) {
  if (e.state === 'windup') {
    if (--e.timer === 0) { for (const angle of [-Math.PI / 9, 0, Math.PI / 9]) shoot(world, e, COMBAT.spreadSpeed, angle); recover(world, e, 100); }
    return;
  }
  const d = directionToPlayer(world, e);
  if (d.distance > 7.5 || d.distance < 4) { const sign = d.distance < 4 ? -1 : 1; if(moveEnemy(world, e, d.x * sign, d.z * sign, 1.6).distance>1e-8)return; }
  prepare(world, e, 54);
}
