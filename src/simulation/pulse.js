import { COMBAT } from '../config/combat.js';
import { emit } from '../core/events.js';
import { awardScore } from './scoring.js';

export function releasePulse(world) {
  if (world.player.hp <= 0 || world.pulseQueuedAt === null || world.pulseQueuedAt >= world.tick) return;
  const p = world.player;
  if (p.energy < COMBAT.energyMax) { world.pulseQueuedAt = null; return; }
  p.energy -= COMBAT.energyMax; world.pulseQueuedAt = null;
  const within = e => Math.hypot(e.x - p.x, e.z - p.z) <= COMBAT.pulseRadius;
  const victims = world.enemies.filter(within);
  const victimIds = new Set(victims.map(e => e.id));
  world.enemies = world.enemies.filter(e => !within(e));
  world.projectiles = world.projectiles.filter(b => !within(b) && !(b.attachedTo && victimIds.has(b.attachedTo)));
  for (const victim of victims) { awardScore(world, 'kill'); emit(world, 'enemyKilled', { x: victim.x, z: victim.z, enemyType: victim.type }); }
  world.stats.kills += victims.length; world.stats.pulses++;
  emit(world, 'pulse', { x: p.x, z: p.z, kills: victims.length });
  // Pulse kills and projectile clearing intentionally generate no energy.
}
