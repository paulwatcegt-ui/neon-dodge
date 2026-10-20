import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/simulation/world.js';
import { createRecords, RECORDS_KEY } from '../../src/storage/records.js';
import { RULES_VERSION } from '../../src/config/difficulty.js';
function dead(id, mode = 'standard', score = 100) {
  const w = createWorld({ runId: id, mode, seed: 42 });
  w.outcome = 'defeat'; w.player.hp = 0; w.tick = 12000; w.score.value = score;
  w.stats.perfect = 7; w.stats.graze = 5; w.score.bestCombo = 8; return w;
}
test('top ten is sorted, deduplicated, versioned, mode-isolated and survives reload', () => {
  let saved; const storage = { getItem: key => key === RECORDS_KEY ? saved : null, setItem: (_, value) => { saved = value; } };
  const r = createRecords(storage);
  const w = dead('run-1'); assert.equal(r.saveResult(w), true); assert.equal(r.saveResult(w), false);
  assert.equal(r.saveResult(dead('run-1')), false);
  for (let i = 2; i <= 15; i++) r.saveResult(dead(`run-${i}`, 'standard', i * 100));
  r.saveResult(dead('practice-1', 'practice', 99999));
  const reloaded = createRecords(storage); const rows = reloaded.list('standard');
  assert.equal(rows.length, 10); assert.equal(rows[0].score, 1500); assert.equal(rows[9].score, 600);
  assert.equal(reloaded.read('practice').score, 99999); assert.equal(rows[0].gameVersion, RULES_VERSION);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['schemaVersion','gameVersion','mode','runId','seed','score','survivalTicks','survivalSeconds','perfectDodges','grazes','maxCombo'].sort());
  rows[0].score = -1; assert.equal(reloaded.read().score, 1500);
  assert.equal(reloaded.saveResult(dead('run-15')), false);
});
test('unfinished runs, invalid data, old finite rules and storage failures cannot contaminate boards', () => {
  const r = createRecords({ getItem: () => '{bad', setItem() { throw Error('disabled'); } });
  assert.equal(r.read().score, 0); assert.equal(r.saveResult(createWorld()), false);
  const w = dead('valid'); w.rulesVersion = 'finite-v1'; assert.equal(r.saveResult(w), false);
  w.rulesVersion = RULES_VERSION; w.score.value = Infinity; assert.equal(r.saveResult(w), false);
  w.score.value = 100; assert.equal(r.saveResult(w), true); assert.equal(r.read().score, 100);
  const old = createRecords({ getItem: () => JSON.stringify({version:1,score:999999,bestCombo:90,victories:1}) });
  assert.equal(old.read().score, 0);
  const row = r.list()[0];
  const malformed = { schemaVersion: 2, boards: { standard: [row, {...row,runId:'bad-mode',mode:'practice'}, {...row,runId:'bad-score',score:-1}, {...row,runId:'old',gameVersion:'old'}, row] } };
  const loaded = createRecords({ getItem: () => JSON.stringify(malformed) });
  assert.equal(loaded.list().length, 1); assert.equal(loaded.list('practice').length, 0);
});
