import { COMBAT } from '../config/combat.js';
import { emit } from '../core/events.js';

export function releasePulse(world, requested = false) {
  if (!requested || world.player.hp <= 0 || world.outcome) return false;
  const p = world.player;
  if (p.energy < COMBAT.energyMax) { emit(world,'pulseDenied'); return false; }
  p.energy -= COMBAT.energyMax;
  const within = e => Math.hypot(e.x - p.x, e.z - p.z) <= COMBAT.pulseRadius;
  const affected = world.enemies.filter(within), affectedIds = new Set(affected.map(e=>e.id));
  const before = world.projectiles.length;
  world.projectiles = world.projectiles.filter(b=>!within(b)&&!(b.attachedTo&&affectedIds.has(b.attachedTo)));
  for(const e of affected){
    e.state='stunned';e.stunUntil=world.tick+COMBAT.stunTicks;e.timer=0;e.burstRemaining=0;e.orbitTicks=90;
    delete e.threatId;
  }
  world.stats.pulses++;
  emit(world,'pulse',{x:p.x,z:p.z,stunned:affected.length,cleared:before-world.projectiles.length});
  // Clearing and stunning never award score, combo, energy or kills.
  return true;
}
