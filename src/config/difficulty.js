export const RUN_TICKS = 180 * 60;
export const STAGES = Object.freeze([
  { start: 0, name: '启动', cap: 6, spawnEvery: 180, attackers: 3, speed: 1, types: ['chaser'] },
  { start: 1800, name: '交火', cap: 10, spawnEvery: 150, attackers: 4, speed: 1.05, types: ['chaser', 'shooter'] },
  { start: 3600, name: '突进', cap: 14, spawnEvery: 120, attackers: 5, speed: 1.1, types: ['chaser', 'shooter', 'charger'] },
  { start: 6000, name: '封锁', cap: 18, spawnEvery: 105, attackers: 6, speed: 1.15, types: ['chaser', 'shooter', 'charger', 'zoner'] },
  { start: 8400, name: '过载', cap: 24, spawnEvery: 90, attackers: 8, speed: 1.2, types: ['chaser', 'shooter', 'charger', 'zoner'] },
]);
export function stageIndex(tick) {
  let index = 0;
  while (index + 1 < STAGES.length && tick >= STAGES[index + 1].start) index++;
  return index;
}
