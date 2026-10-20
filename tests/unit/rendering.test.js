import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createProjectileBatch } from '../../src/rendering/projectileBatch.js';
import { createArenaView } from '../../src/rendering/arenaView.js';
import { createArena } from '../../src/simulation/arena.js';
import { createCombatView } from '../../src/rendering/combatView.js';
import { createWorld } from '../../src/simulation/world.js';
import { spawnEnemy, updateEnemies } from '../../src/simulation/enemies.js';

test('projectile instances interpolate in world space, skip areas and clear stale slots', () => {
  const scene = new THREE.Scene(), batch = createProjectileBatch(scene);
  const mesh = scene.getObjectByName('projectile-batch'), matrix = new THREE.Matrix4();
  const threats = [{ id: 1, previousX: 0, x: 4, previousZ: -4, z: 0 },
    { id: 2, kind: 'zone', previousX: 9, x: 9, previousZ: 9, z: 9 }];
  const before = structuredClone(threats);
  batch.update(threats, 0.25); assert.equal(mesh.count, 1);
  mesh.getMatrixAt(0, matrix);
  const p = new THREE.Vector3().setFromMatrixPosition(matrix);
  assert.ok(p.distanceTo(new THREE.Vector3(1, 0.45, -3)) < 1e-6);
  assert.deepEqual(threats, before);
  batch.update([], 1); assert.equal(mesh.count, 0); assert.equal(mesh.visible, false);
  const restore = batch.revealForWarmup(); assert.equal(mesh.count, 1);
  restore(); assert.equal(mesh.count, 0); assert.equal(mesh.visible, false);
  batch.update(Array.from({ length: 110 }, () => threats[0]), 1); assert.equal(mesh.count, 96);
  batch.reset(); assert.equal(mesh.count, 0);
  let disposed = 0;
  for (const resource of [mesh, mesh.geometry, mesh.material]) resource.addEventListener('dispose', () => disposed++);
  batch.dispose(); assert.equal(disposed, 3); assert.equal(scene.children.length, 0);
});

test('arena batches retain all eight markers, pillars, lamps and sixteen rails', () => {
  const arena = createArena(12), group = createArenaView(arena), matrix = new THREE.Matrix4();
  for (const name of ['arena-markers', 'arena-pillars', 'arena-lamps', 'arena-rails-0', 'arena-rails-1']) {
    assert.equal(group.getObjectByName(name).count, 8);
  }
  for (let i = 0; i < 8; i++) {
    group.getObjectByName('arena-pillars').getMatrixAt(i, matrix);
    const p = new THREE.Vector3().setFromMatrixPosition(matrix), vertex = arena.vertices[i];
    assert.ok(Math.abs(p.x - vertex.x * 0.98) < 1e-5); assert.ok(Math.abs(p.z - vertex.z * 0.98) < 1e-5);
    for (let j = 0; j < 2; j++) {
      group.getObjectByName(`arena-rails-${i % 2}`).getMatrixAt(Math.floor(i / 2) * 2 + j, matrix);
      const p = new THREE.Vector3().setFromMatrixPosition(matrix), next = arena.vertices[(i + 1) % 8];
      assert.ok(Math.abs(p.x - (vertex.x + next.x) / 2) < 1e-5);
      assert.ok(Math.abs(p.z - (vertex.z + next.z) / 2) < 1e-5);
      assert.ok(Math.abs(p.y - [-0.35, -0.12][j]) < 1e-5);
    }
  }
});

test('combat view retains area threats alongside batches, resets and fully detaches resources', () => {
  const scene = new THREE.Scene(), view = createCombatView(scene), w = createWorld();
  w.enemies = [];
  w.projectiles = [{ id: 100, kind: 'bullet', previousX: 0, previousZ: 0, x: 1, z: 1 },
    { id: 101, kind: 'zone', radius: 1.4, previousX: 3, previousZ: 3, x: 3, z: 3 }];
  view.update(w, 1); assert.equal(scene.getObjectByName('projectile-batch').count, 1);
  const area = scene.children.find(o => o.userData.ownMaterial);
  assert.equal(area.scale.x, 1.4); assert.equal(area.position.x, 3);
  view.reset(); assert.equal(scene.getObjectByName('projectile-batch').count, 0);
  assert.equal(scene.children.includes(area), false);
  view.dispose(); assert.equal(scene.children.length, 0);
});

test('diagonal charger corridor aligns with the locked line and covers its full width', () => {
  const scene = new THREE.Scene(), view = createCombatView(scene), w = createWorld();
  w.enemies = []; spawnEnemy(w, -5, -5, 'charger'); updateEnemies(w); view.update(w, 1);
  scene.updateMatrixWorld(true);
  const e = w.enemies[0], warning = scene.children.find(o => o.userData.warning)?.userData.warning;
  assert.ok(warning.visible);
  const start = new THREE.Vector3(0, -0.5, 0).applyMatrix4(warning.matrixWorld);
  const end = new THREE.Vector3(0, 0.5, 0).applyMatrix4(warning.matrixWorld);
  const axis = end.clone().sub(start).normalize();
  assert.ok(Math.abs(axis.x * e.aimX + axis.z * e.aimZ) > 0.9999);
  assert.ok(Math.abs(start.distanceTo(end) - Math.hypot(e.targetX - e.x, e.targetZ - e.z)) < 1e-6);
  assert.equal(warning.scale.x, 1); view.dispose();
});
