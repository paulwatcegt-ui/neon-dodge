import { GAME } from '../config/gameplay.js';
import { COMBAT } from '../config/combat.js';
import { contains } from './arena.js';
import { circleEntry, relativePath } from './collision.js';
import { reward } from './energy.js';
import { emit } from '../core/events.js';
import { breakCombo } from './scoring.js';

/** Solve all projectiles by time of impact, rather than array/insertion order. */
export function updateThreats(world, perfectAge = Infinity) {
  const p = world.player;
  const contacts = [];
  for (const b of world.projectiles) {
    b.previousX = b.x; b.previousZ = b.z;
    if (b.attachedTo) {
      const owner = world.enemies.find(e => e.id === b.attachedTo);
      if (!owner) { b.dead = true; continue; }
      b.x = owner.x; b.z = owner.z;
    } else { b.x += b.vx * GAME.step; b.z += b.vz * GAME.step; }
    b.life--;
    const path = relativePath(b, p), radius = GAME.playerRadius + b.radius;
    const impact = circleEntry(...path, radius);
    if (impact !== null) contacts.push({ b, impact });
    if (b.outcome === null && circleEntry(...path, radius + COMBAT.grazeWidth) !== null) {
      if (p.protection > 0) b.outcome = 'ignored';
      else b.pendingGraze = true;
    }
  }
  contacts.sort((a, b) => a.impact - b.impact || a.b.id - b.b.id);
  for (const { b, impact } of contacts) {
    b.dead = true;
    if (p.hp <= 0 || p.protection > 0) { b.outcome ??= 'ignored'; continue; }
    // Half-open [0,9) tick window; collision exactly at 0.15s is not perfect.
    if (b.outcome === null && perfectAge + impact < COMBAT.perfectTicks) {
      reward(world, b, 'perfect');
    } else {
      b.outcome ??= 'hit'; p.hp--; p.protection = COMBAT.protectionTicks;
      breakCombo(world);
      emit(world, 'damaged', { x: p.x, z: p.z, hp: p.hp });
      if (p.hp === 0) emit(world, 'defeated');
    }
  }
  for (const b of world.projectiles) {
    const outsideGraze = Math.hypot(b.x - p.x, b.z - p.z) > GAME.playerRadius + b.radius + COMBAT.grazeWidth;
    // Defer graze until exit so a later impact cannot also get a graze reward.
    if (!b.dead && b.outcome === null && b.pendingGraze && (outsideGraze || b.life <= 0) && p.protection === 0) reward(world, b, 'graze');
    if (b.life <= 0 || !contains(world.arena, b)) b.dead = true;
  }
  world.projectiles = world.projectiles.filter(b => !b.dead);
}
