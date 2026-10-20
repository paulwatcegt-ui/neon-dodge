const BASE = { graze: 20, perfect: 100, kill: 50 };
export const COMBO_TICKS = 180;
export function multiplier(combo) { return Math.min(4, 1 + Math.floor(Math.max(0, combo - 1) / 5) * 0.5); }
export function awardScore(world, action) {
  if (world.outcome || world.player.hp <= 0 || !Object.hasOwn(BASE, action)) return;
  const s = world.score;
  // Pulse kills cannot build, refresh or multiply dodge combo.
  if (action === 'kill') { s.value += BASE.kill; return; }
  if (s.combo > 0 && world.tick >= s.expiresAt) s.combo = 0;
  s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo); s.expiresAt = world.tick + COMBO_TICKS;
  s.value += BASE[action] * multiplier(s.combo);
}
export function breakCombo(world) { world.score.combo = 0; world.score.expiresAt = 0; }
export function updateScore(world) { if (world.score.combo > 0 && world.tick >= world.score.expiresAt) breakCombo(world); }
