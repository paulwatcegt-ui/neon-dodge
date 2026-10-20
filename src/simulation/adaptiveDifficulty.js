import { STAGES, endlessTier } from '../config/difficulty.js';
import { emit } from '../core/events.js';

export const PRESSURE_NAMES = Object.freeze({ relief: '缓冲', standard: '标准', pressure: '强化' });
const WINDOW = 900; // 15 seconds of simulation, independent of render time.
const REVIEW = 300;
const HOLD = 600;

export function createAdaptiveDifficulty() {
  return { mode: 'standard', changedAt: 0, lastDamageAt: -WINDOW,
    hp: 3, perfect: 0, graze: 0, samples: [] };
}

/** Limits affect future spawns/attack starts only; active threats retain their timing. */
export function difficultyLimits(world) {
  const stage = STAGES[world.stage], mode = world.gameMode === 'practice' ? world.adaptive.mode : 'standard';
  const interval = stage.spawnEvery - endlessTier(world.tick);
  return {
    cap: mode === 'relief' ? Math.max(3, Math.floor(stage.cap * 0.75)) : stage.cap,
    attackers: mode === 'relief' ? Math.max(1, stage.attackers - 1) : stage.attackers,
    spawnEvery: Math.max(30, Math.round(interval * (mode === 'relief' ? 1.4 : mode === 'pressure' ? 0.85 : 1))),
  };
}

/** Called after combat. Rewards are counted, never inferred from score or wall time. */
export function updateAdaptiveDifficulty(world) {
  if (world.gameMode !== 'practice') return;
  const a = world.adaptive, tick = world.tick;
  const damaged = world.player.hp < a.hp;
  if (damaged) a.lastDamageAt = tick;
  a.hp = world.player.hp;
  const perfect = world.stats.perfect - a.perfect, graze = world.stats.graze - a.graze;
  a.perfect = world.stats.perfect; a.graze = world.stats.graze;
  // At most one bucket per simulation second, even during dense pulse/dodge events.
  if (perfect || graze) {
    const second = Math.floor(tick / 60), last = a.samples.at(-1);
    if (last?.second === second) { last.perfect += perfect; last.graze += graze; }
    else a.samples.push({ second, perfect, graze });
  }
  a.samples = a.samples.filter(s => s.second * 60 > tick - WINDOW);
  if (world.player.hp <= 0 || world.outcome) return;
  let next = a.mode;
  if (damaged || world.player.hp === 1) next = 'relief';
  else if (tick % REVIEW === 0 && tick - a.changedAt >= HOLD) {
    if (tick - a.lastDamageAt < WINDOW) next = 'relief';
    else {
      const perfects = a.samples.reduce((sum, s) => sum + s.perfect, 0);
      const grazes = a.samples.reduce((sum, s) => sum + s.graze, 0);
      next = tick >= WINDOW && world.player.hp === 3 && perfects >= 2 && perfects + grazes >= 8 ? 'pressure' : 'standard';
    }
  }
  if (next === a.mode) return;
  a.mode = next; a.changedAt = tick;
  // Relief grants a full spawn interval; never delete an existing enemy or attack.
  if (next === 'relief') world.nextSpawnAt = Math.max(world.nextSpawnAt, tick + difficultyLimits(world).spawnEvery);
  emit(world, 'pressure', { mode: next, name: PRESSURE_NAMES[next] });
}
