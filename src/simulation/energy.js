import { COMBAT } from '../config/combat.js';
import { emit } from '../core/events.js';
import { awardScore } from './scoring.js';

export function reward(world, threat, outcome) {
  if (threat.outcome !== null || world.player.hp <= 0) return;
  threat.outcome = outcome;
  const amount = outcome === 'perfect' ? COMBAT.perfectEnergy : COMBAT.grazeEnergy;
  const previousEnergy = world.player.energy;
  world.player.energy = Math.min(COMBAT.energyMax, world.player.energy + amount);
  world.stats[outcome]++;
  awardScore(world, outcome);
  emit(world, outcome, { x: world.player.x, z: world.player.z, amount, threatId: threat.id });
  if (world.player.energy === COMBAT.energyMax && previousEnergy < COMBAT.energyMax) {
    emit(world, 'pulseReady');
  }
}
