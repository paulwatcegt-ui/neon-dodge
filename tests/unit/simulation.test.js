import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME } from '../../src/config/gameplay.js';
import { createArena, contains, moveDisk } from '../../src/simulation/arena.js';
import { createWorld, stepWorld } from '../../src/simulation/world.js';
import { groundBasis, screenToWorld } from '../../src/shared/math.js';
import { makeRng } from '../../src/vendor/voxel-survivors/rng.js';

const arena = createArena(GAME.apothem);
const neutral = { x: 0, z: 0, dash: false };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

test('sweeps prevent tunnelling through each of the eight walls', () => {
  for (const n of arena.planes) {
    const result = moveDisk(arena, { x: 0, z: 0 }, { x: n.x * 100, z: n.z * 100 }, GAME.playerRadius, false);
    assert.ok(result.collided); assert.ok(contains(arena, result, GAME.playerRadius));
    near(result.x * n.x + result.z * n.z, GAME.apothem - GAME.playerRadius);
  }
});

test('all eight corners remain inside even under repeated outward motion', () => {
  for (const vertex of arena.vertices) {
    let p = { x: 0, z: 0 };
    for (let i = 0; i < 20; i++) {
      p = moveDisk(arena, p, { x: vertex.x * 10, z: vertex.z * 10 }, GAME.playerRadius);
      assert.ok(contains(arena, p, GAME.playerRadius));
    }
  }
});

test('walking slides along wall while dash stops at first contact', () => {
  const p = { x: 11.5, z: 0 }, delta = { x: 2, z: 1 };
  const walking = moveDisk(arena, p, delta, GAME.playerRadius, true);
  const dashing = moveDisk(arena, p, delta, GAME.playerRadius, false);
  near(walking.x, 11.65); near(walking.z, 1);
  assert.ok(dashing.z < 0.1); assert.ok(contains(arena, dashing, GAME.playerRadius));
});

test('seeded stress test: 20000 mixed movements never leave the octagon', () => {
  const rng = makeRng(42); let p = { x: 0, z: 0 };
  for (let i = 0; i < 20000; i++) {
    p = moveDisk(arena, p, { x: rng.range(-40, 40), z: rng.range(-40, 40) }, GAME.playerRadius, i % 2 === 0);
    assert.ok(contains(arena, p, GAME.playerRadius), `outside at move ${i}`);
  }
});

test('diagonal speed equals axial speed, independent of input magnitude', () => {
  const axis = createWorld(), diagonal = createWorld();
  for (let i = 0; i < 30; i++) {
    stepWorld(axis, { x: 1, z: 0 }); stepWorld(diagonal, { x: 1, z: 1 });
  }
  near(Math.hypot(axis.player.x, axis.player.z), 3);
  near(Math.hypot(diagonal.player.x, diagonal.player.z), 3);
});

test('dash covers 4.8m in exactly 12 steps, cooldown ends after 48', () => {
  const w = createWorld(); stepWorld(w, { x: 1, z: 0, dash: true });
  for (let i = 1; i < 12; i++) stepWorld(w, neutral);
  near(w.player.x, 4.8); assert.equal(w.player.dashRemaining, 0);
  for (let i = 12; i < 48; i++) stepWorld(w, neutral);
  assert.equal(w.player.cooldown, 0);
  stepWorld(w, { ...neutral, dash: true }); assert.equal(w.player.dashRemaining, 11);
});

test('dash direction is locked; blocked dash terminates', () => {
  const w = createWorld(); stepWorld(w, { x: 1, z: 0, dash: true });
  stepWorld(w, { x: 0, z: 1 }); near(w.player.z, 0);
  w.player.x = 11.6; w.player.dashRemaining = 3;
  stepWorld(w, neutral); near(w.player.x, 11.65); assert.equal(w.player.dashRemaining, 0);
});

test('input respects camera ground basis for rotated views', () => {
  for (const direction of [{ x: 0, z: -1 }, { x: -1, z: -1 }, { x: 1, z: 0 }]) {
    const basis = groundBasis(direction);
    const up = screenToWorld(0, 1, basis), right = screenToWorld(1, 0, basis);
    near(up.x * right.x + up.z * right.z, 0);
    near(up.x, basis.forward.x); near(right.z, basis.right.z);
    near(Math.hypot(...Object.values(screenToWorld(1, 1, basis))), 1);
  }
});
