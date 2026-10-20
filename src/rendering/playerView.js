import * as THREE from 'three';
import { createMech } from './mech.js';
import { disposeObjects } from '../assets/dispose.js';
export function createPlayerView() {
  const group = new THREE.Group(), mech = createMech(); group.add(mech.group);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.39, 48),
    new THREE.MeshBasicMaterial({ color: 0x73f6ce, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; group.add(ring);
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    pixels[(y * 32 + x) * 4 + 3] = Math.round(90 * Math.max(0, 1 - Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5)) ** 2);
  }
  const texture = new THREE.DataTexture(pixels, 32, 32); texture.needsUpdate = true;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.9),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; group.add(shadow);
  let asset = null, lastTick = null, lastState = '';
  return {
    group,
    setAsset(next) {
      if (asset) { group.remove(asset.root); asset.dispose(); }
      asset = next; lastTick = null; lastState = ''; mech.group.visible = !asset;
      if (asset) group.add(asset.root);
    },
    rotate(angle) { if (asset) asset.root.rotation.y = angle; },
    reset() { lastTick = null; lastState = ''; asset?.animation.reset(); },
    update(player, alpha, tick, endingDelta = 0) {
      group.position.set(player.previousX + (player.x - player.previousX) * alpha, 0,
        player.previousZ + (player.z - player.previousZ) * alpha);
      group.rotation.y = Math.atan2(player.facingX, player.facingZ);
      const moving = Math.hypot(player.x - player.previousX, player.z - player.previousZ) > 0.0001;
      const delta = lastTick === null ? 0 : Math.max(0, tick - lastTick) / 60;
      lastTick = tick;
      mech.update(player, tick, moving);
      const state = player.hp <= 0 ? 'death' : player.dashRemaining > 0 ? 'dash' : player.protection > 30 ? 'hit' : moving ? 'run' : 'idle';
      asset?.animation.update(state, player.hp <= 0 ? endingDelta : delta);
      if (state !== lastState || delta > 0 || endingDelta > 0) asset?.ground?.();
      lastState = state;
      ring.scale.setScalar(player.dashRemaining > 0 ? 1.3 : 1);
      ring.material.color.setHex(player.protection > 0 ? 0xff607f : 0x73f6ce);
    },
    describe: () => asset ? { ...asset.profile, animation: asset.animation.describe() } : { name: 'T-00', animation: null },
    dispose() { if (asset) { group.remove(asset.root); asset.dispose(); asset = null; } disposeObjects([group]); },
  };
}
