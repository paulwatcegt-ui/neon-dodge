import { updateShooter } from './enemies/shooter.js';
import { updateChaser } from './enemies/chaser.js';
import { updateCharger } from './enemies/charger.js';
import { updateZoner } from './enemies/zoner.js';
import { updateSpread } from './enemies/spread.js';
import { updateSniper } from './enemies/sniper.js';
import { updateOrbiter } from './enemies/orbiter.js';
import { updateBlaster } from './enemies/blaster.js';
export { fireProjectile } from './enemies/shooter.js';
const UPDATE = { shooter: updateShooter, chaser: updateChaser, charger: updateCharger, zoner: updateZoner,
  spread: updateSpread, sniper: updateSniper, orbiter: updateOrbiter, blaster: updateBlaster };
export function spawnEnemy(world, x, z, type = 'shooter') {
  if (!UPDATE[type]) throw new Error('Unknown enemy type: ' + type);
  world.enemies.push({ id: world.nextEntityId++, type, x, z, previousX: x, previousZ: z,
    state: 'approach', timer: 0, windupTicks: 42, aimX: 0, aimZ: 1, targetX: x, targetZ: z });
}
export function updateEnemies(world) {
  // Rotate scheduling priority so full-cap scenes do not starve later enemy IDs.
  for (let i = 0; i < world.enemies.length; i++) {
    const e = world.enemies[(i + Math.floor(world.tick / 12)) % world.enemies.length];
    e.previousX = e.x; e.previousZ = e.z;
    if (e.state==='stunned') { if(world.tick<e.stunUntil)continue; e.state='approach'; }
    if (e.state === 'recover') { if (--e.timer <= 0) e.state = 'approach'; continue; }
    UPDATE[e.type](world, e);
  }
}
