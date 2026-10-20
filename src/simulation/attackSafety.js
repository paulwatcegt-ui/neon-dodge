import { GAME } from '../config/gameplay.js';
import { contains, moveDisk } from './arena.js';
import { ACTIVE_ATTACK_STATES } from '../config/enemies.js';

function distanceToSegment(p, a, b) {
  const x = b.x - a.x, z = b.z - a.z, squared = x * x + z * z;
  const t = squared ? Math.max(0, Math.min(1, ((p.x - a.x) * x + (p.z - a.z) * z) / squared)) : 0;
  return Math.hypot(p.x - a.x - t * x, p.z - a.z - t * z);
}
function covered(point, attack) {
  if (attack.type === 'spread') return [-Math.PI/9,0,Math.PI/9].some(angle=>distanceToSegment(point,attack,
    {x:attack.x+(attack.aimX*Math.cos(angle)-attack.aimZ*Math.sin(angle))*30,z:attack.z+(attack.aimX*Math.sin(angle)+attack.aimZ*Math.cos(angle))*30})<0.16+GAME.playerRadius+0.15);
  if (attack.type === 'blaster') return Math.hypot(point.x - attack.x, point.z - attack.z) < 2 + GAME.playerRadius + 0.15;
  if (attack.type === 'zoner') return Math.hypot(point.x - attack.targetX, point.z - attack.targetZ) < 1.4 + GAME.playerRadius + 0.15;
  if (attack.type === 'chaser') return Math.hypot(point.x - attack.x - attack.aimX * 0.65, point.z - attack.z - attack.aimZ * 0.65) < 0.85 + GAME.playerRadius;
  return distanceToSegment(point, attack, { x: attack.targetX, z: attack.targetZ }) < (attack.type === 'charger' ? 0.5 : 0.16) + GAME.playerRadius + 0.15;
}

/** Conservative admission check, using walking only (never assumes dash is ready).
 * Reserve two adjacent sampled escape positions before adding a high-risk windup.
 * This is a discrete scheduling guard, not a proof for every possible player path.
 */
export function hasEscapePositions(world, candidate, ticks) {
  const radius = Math.min(3, GAME.moveSpeed * ticks * GAME.step * 0.8);
  const active = world.enemies.filter(e => ACTIVE_ATTACK_STATES.includes(e.state));
  const safe = [];
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12;
    const point = moveDisk(world.arena, world.player, { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }, GAME.playerRadius);
    if (!contains(world.arena, point, GAME.playerRadius) || Math.hypot(point.x - world.player.x, point.z - world.player.z) < 1.5 ||
      covered(point, candidate) || active.some(e => covered(point, e))) { safe.push(false); continue; }
    const blocked = world.projectiles.some(b => {
      if (b.life < ticks) return false;
      const end = { x: b.x + b.vx * ticks * GAME.step, z: b.z + b.vz * ticks * GAME.step };
      return distanceToSegment(point, b, end) < b.radius + GAME.playerRadius + 0.15;
    });
    safe.push(!blocked);
  }
  return safe.some((value, i) => value && safe[(i + 1) % safe.length]);
}
