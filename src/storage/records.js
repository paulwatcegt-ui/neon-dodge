import { RULES_VERSION, MODE_NAMES } from '../config/difficulty.js';
// Preserve earlier rule sets rather than overwriting their scores on the first new run.
export const RECORDS_KEY = `neon-dodge.records.v2.${RULES_VERSION}`;
const valid = n => Number.isSafeInteger(n) && n >= 0;
const validMode = mode => Object.hasOwn(MODE_NAMES, mode);
function cleanRecord(r, mode) {
  if (!r || r.schemaVersion !== 2 || r.gameVersion !== RULES_VERSION || r.mode !== mode ||
    typeof r.runId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(r.runId) ||
    !valid(r.seed) || r.seed > 0xffffffff || ![r.score, r.survivalTicks, r.perfectDodges, r.grazes, r.maxCombo].every(valid)) return null;
  return { schemaVersion: 2, gameVersion: RULES_VERSION, mode, runId: r.runId, seed: r.seed,
    score: r.score, survivalTicks: r.survivalTicks, survivalSeconds: r.survivalTicks / 60,
    perfectDodges: r.perfectDodges, grazes: r.grazes, maxCombo: r.maxCombo };
}
function compare(a, b) {
  return b.score - a.score || b.survivalTicks - a.survivalTicks || b.perfectDodges - a.perfectDodges || (a.runId < b.runId ? -1 : a.runId > b.runId ? 1 : 0);
}
function normalize(rows, mode) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  return rows.slice(0, 1000).map(r => cleanRecord(r, mode)).filter(r => {
    if (!r || seen.has(r.runId)) return false; seen.add(r.runId); return true;
  }).sort(compare).slice(0, 10);
}
export function createRecords(storage) {
  if (storage === undefined) { try { storage = globalThis.localStorage; } catch { storage = null; } }
  const boards = { standard: [], practice: [] };
  const savedRuns = new WeakSet();
  try {
    const raw = storage?.getItem(RECORDS_KEY);
    const data = raw && raw.length <= 1000000 ? JSON.parse(raw) : null;
    if (data?.schemaVersion === 2) for (const mode of Object.keys(boards)) boards[mode] = normalize(data.boards?.[mode], mode);
  } catch { /* Keep in-memory boards when storage is unavailable or malformed. */ }
  return {
    read(mode = 'standard') { return { score: validMode(mode) ? boards[mode][0]?.score ?? 0 : 0 }; },
    list(mode = 'standard') { return validMode(mode) ? boards[mode].map(r => ({ ...r })) : []; },
    saveResult(world) {
      if (world.outcome !== 'defeat' || world.player.hp !== 0 || savedRuns.has(world) || !validMode(world.gameMode)) return false;
      const row = cleanRecord({ schemaVersion: 2, gameVersion: world.rulesVersion, mode: world.gameMode,
        runId: world.runId, seed: world.seed, score: world.score.value, survivalTicks: world.tick,
        perfectDodges: world.stats.perfect, grazes: world.stats.graze, maxCombo: world.score.bestCombo }, world.gameMode);
      if (!row) return false;
      savedRuns.add(world);
      if (boards[row.mode].some(r => r.runId === row.runId)) return false;
      boards[row.mode] = normalize([...boards[row.mode], row], row.mode);
      try { storage?.setItem(RECORDS_KEY, JSON.stringify({ schemaVersion: 2, boards })); } catch { /* Gameplay continues. */ }
      return true;
    },
  };
}
