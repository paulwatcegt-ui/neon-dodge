export const RULES_VERSION = 'endless-1.0.0';
export const MODE_NAMES = Object.freeze({ standard: '标准挑战', practice: '自适应练习' });
export const STAGES = Object.freeze([
  { start: 0, name: '交火', cap: 8, spawnEvery: 60, attackers: 4, speed: 1.1, recovery: 0.9, types: ['chaser', 'shooter'] },
  { start: 900, name: '突进', cap: 12, spawnEvery: 54, attackers: 5, speed: 1.15, recovery: 0.85, types: ['chaser', 'shooter', 'charger'] },
  { start: 2100, name: '封锁', cap: 16, spawnEvery: 48, attackers: 6, speed: 1.2, recovery: 0.8, types: ['chaser', 'shooter', 'charger', 'zoner'] },
  { start: 3900, name: '过载', cap: 20, spawnEvery: 42, attackers: 7, speed: 1.25, recovery: 0.75, types: ['chaser', 'shooter', 'charger', 'zoner'] },
  { start: 7200, name: '无限高压', cap: 24, spawnEvery: 36, attackers: 8, speed: 1.3, recovery: 0.7, types: ['chaser', 'shooter', 'charger', 'zoner'] },
]);
export const PATTERNS = Object.freeze([
  { name: '猎杀推进', focus: ['chaser', 'charger'] },
  { name: '交叉火力', focus: ['shooter', 'chaser'] },
  { name: '区域围堵', focus: ['zoner', 'shooter'] },
]);
export function patternIndex(tick) { return tick < 7200 ? -1 : Math.floor((tick - 7200) / 1200) % PATTERNS.length; }
export function endlessTier(tick) { return Math.min(5, Math.max(0, Math.floor((tick - 7200) / 3600))); }
export function stageIndex(tick) {
  let index = 0;
  while (index + 1 < STAGES.length && tick >= STAGES[index + 1].start) index++;
  return index;
}
