const KEY = 'neon-dodge.records.v1';
const valid = n => Number.isSafeInteger(n) && n >= 0;
export function createRecords(storage) {
  if (storage === undefined) { try { storage = globalThis.localStorage; } catch { storage = null; } }
  let best = { score: 0, bestCombo: 0, victories: 0 };
  const savedRuns = new WeakSet();
  try {
    const data = JSON.parse(storage?.getItem(KEY) || 'null');
    if (data?.version === 1 && valid(data.score) && valid(data.bestCombo) && valid(data.victories)) {
      best = { score: data.score, bestCombo: data.bestCombo, victories: data.victories };
    }
  } catch { /* Disabled storage or malformed data: retain an in-memory record. */ }
  return {
    read: () => ({ ...best }),
    saveResult(world) {
      if (!world.outcome || savedRuns.has(world)) return;
      savedRuns.add(world);
      best.score = Math.max(best.score, world.score.value);
      best.bestCombo = Math.max(best.bestCombo, world.score.bestCombo);
      if (world.outcome === 'victory') best.victories++;
      try { storage?.setItem(KEY, JSON.stringify({ version: 1, ...best })); } catch { /* Gameplay continues. */ }
    },
  };
}
