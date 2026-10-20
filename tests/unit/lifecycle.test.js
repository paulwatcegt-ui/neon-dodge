import test from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../../src/core/gameLoop.js';
import { createSession } from '../../src/core/session.js';
import { createWorld, stepWorld } from '../../src/simulation/world.js';
import { createKeyboard } from '../../src/input/keyboard.js';

test('30/60/144Hz rendering yields identical 10-second simulation', () => {
  const snapshots = [30, 60, 144].map(hz => {
    const world = createWorld();
    world.enemies = []; world.nextSpawnAt = Infinity;
    const clock = createClock(() => {
      const angle = Math.floor(world.tick / 30) * Math.PI / 4;
      stepWorld(world, { x: Math.cos(angle), z: Math.sin(angle), dash: world.tick % 80 === 0 });
    }, () => assert.fail('unexpected overload'));
    clock.advance(0);
    for (let frame = 1; frame <= hz * 10; frame++) clock.advance(frame * 1000 / hz);
    assert.equal(world.tick, 600); return world.player;
  });
  assert.deepEqual(snapshots[0], snapshots[1]); assert.deepEqual(snapshots[1], snapshots[2]);
});

test('pause freezes simulation and reset clears position, dash and tick', () => {
  const session = createSession(); session.start(); session.step({ x: 1, z: 0, dash: true });
  session.pause('focus'); const snapshot = JSON.stringify(session.world);
  for (let i = 0; i < 100; i++) assert.equal(session.step({ x: 1, z: 1 }), false);
  assert.equal(JSON.stringify(session.world), snapshot);
  session.reset(); assert.equal(JSON.stringify(session.world), JSON.stringify(createWorld())); assert.equal(session.mode, 'paused');
});

test('clock discards hidden-time debt and overload never advances simulation', () => {
  let steps = 0, overloads = 0;
  const clock = createClock(() => steps++, () => overloads++);
  clock.advance(0); clock.advance(1000); assert.equal(steps, 0); assert.equal(overloads, 1);
  clock.reset(); clock.advance(100000); clock.advance(100017); assert.equal(steps, 1);
});

test('keyboard consumes dash edge once, ignores repeats, clears on blur and disposes', () => {
  const target = new EventTarget(); let paused = 0;
  const input = createKeyboard({ target, basis: { right: { x: 1, z: 0 }, forward: { x: 0, z: -1 } },
    isRunning: () => true, togglePause: () => paused++, onBlur: () => paused++ });
  function key(type, code, repeat = false) {
    const event = new Event(type, { cancelable: true }); Object.assign(event, { code, repeat }); target.dispatchEvent(event);
  }
  key('keydown', 'KeyW'); key('keydown', 'Space');
  assert.deepEqual(input.sample(), { x: 0, z: -1, dash: true, pulse: false });
  key('keydown', 'Space', true); assert.equal(input.sample().dash, false);
  target.dispatchEvent(new Event('blur')); assert.deepEqual(input.sample(), { x: 0, z: 0, dash: false, pulse: false });
  assert.equal(paused, 1); input.dispose(); key('keydown', 'Escape'); assert.equal(paused, 1);
});
