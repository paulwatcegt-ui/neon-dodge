import { directionToPlayer, moveEnemy, prepare, recover } from './common.js';
import { shoot } from './ranged.js';
import { COMBAT } from '../../config/combat.js';
export function updateSniper(world, e) {
  if (e.state === 'windup') {
    if (--e.timer === 0) { shoot(world, e, COMBAT.sniperSpeed); e.state = 'burst'; e.timer = 8; e.burstRemaining = 2; }
    return;
  }
  if (e.state === 'burst') {
    if (--e.timer === 0) { shoot(world, e, COMBAT.sniperSpeed); if (--e.burstRemaining === 0) recover(world, e, 150); else e.timer = 8; }
    return;
  }
  const d = directionToPlayer(world, e);
  if (d.distance < 6) { e.state = 'relocate'; if(moveEnemy(world, e, -d.x, -d.z, 2).distance>1e-8)return; }
  else if (d.distance > 10 && moveEnemy(world, e, d.x, d.z, 1.5).distance>1e-8) return;
  prepare(world, e, 90);
}
