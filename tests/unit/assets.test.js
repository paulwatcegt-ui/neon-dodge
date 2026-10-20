import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeGlb } from '../fixtures/glb.js';
import { inspectGlb } from '../../src/assets/glbValidation.js';
import { loadCharacter } from '../../src/assets/assetLoader.js';
import { mapAnimations } from '../../src/assets/characterAnimation.js';
import { createAudio } from '../../src/audio/audio.js';

test('GLB validation rejects malformed headers, truncation, external dependencies and unsupported compression', () => {
  assert.equal(inspectGlb(makeGlb()).asset.version, '2.0');
  assert.throws(() => inspectGlb(new ArrayBuffer(8)), /有效/);
  const broken = makeGlb(); new DataView(broken).setUint32(8, 1, true);
  assert.throws(() => inspectGlb(broken), /完整/);
  assert.throws(() => inspectGlb(makeGlb({ external: true })), /内嵌/);
  assert.throws(() => inspectGlb(makeGlb({ compressed: true })), /未压缩/);
});

test('real GLTFLoader normalizes a model, identifies five animations, advances poses and freezes on zero delta', async () => {
  const asset = await loadCharacter(makeGlb());
  assert.equal(asset.profile.triangles, 1); assert.equal(asset.profile.meshes, 1); assert.deepEqual(asset.profile.missing, []);
  asset.root.updateMatrixWorld(true); const bounds = new THREE.Box3().setFromObject(asset.root);
  assert.ok(Math.abs(bounds.min.y) < 1e-6); assert.ok(Math.abs(bounds.max.y - 1.7) < 1e-6);
  asset.animation.update('run', 0.5); const node = asset.root.getObjectByName('Robot');
  assert.ok(node.position.y > 0); const y = node.position.y;
  asset.animation.update('run', 0); assert.equal(node.position.y, y);
  asset.animation.update('dash', 0.1); asset.animation.reset();
  let disposed = 0; node.geometry.addEventListener('dispose', () => disposed++);
  asset.dispose(); assert.equal(disposed, 1);
});

test('missing animation clips are reported instead of inventing animations', async () => {
  const asset = await loadCharacter(makeGlb({ animated: false }));
  assert.equal(asset.profile.missing.length, 5); assert.doesNotThrow(() => asset.animation.update('death', 0.1)); asset.dispose();
  const run = { name: 'Running' }, idle = { name: 'Idle' };
  assert.equal(mapAnimations([run, idle]).run, run);
});

test('audio remains gesture-gated, pauses silence voices and mute prevents playback', () => {
  let created = 0, started = 0, stopped = 0;
  const previous = globalThis.AudioContext;
  const parameter = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  globalThis.AudioContext = class {
    state = 'running'; currentTime = 0; destination = {};
    constructor() { created++; }
    resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
    createOscillator() { return { frequency: parameter(), connect() {}, disconnect() {}, start() { started++; }, stop() { stopped++; } }; }
    createGain() { return { gain: parameter(), connect() {}, disconnect() {} }; }
  };
  try {
    const audio = createAudio(), event = [{ type: 'dash', tick: 1 }];
    audio.setPlaying(true); audio.consume(event); assert.equal(created, 0);
    audio.unlock(); audio.consume(event); assert.equal(created, 1); assert.equal(started, 1);
    audio.setPlaying(false); assert.ok(stopped > 1);
    audio.setEnabled(false); audio.setPlaying(true); audio.consume([{ type: 'pulse', tick: 2 }]); assert.equal(started, 1);
    audio.dispose();
  } finally { globalThis.AudioContext = previous; }
});
