import * as THREE from 'three';
import { createMech } from './mech.js';
import { disposeObjects } from '../assets/dispose.js';
export function createPlayerView() {
  const group = new THREE.Group(), mech = createMech(); group.add(mech.group);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.39, 48),
    new THREE.MeshBasicMaterial({ color: 0x73f6ce, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; group.add(ring);
  let asset = null, lastTick = null;
  return {
    group,
    setAsset(next) {
      if (asset) { group.remove(asset.root); asset.dispose(); }
      asset = next; lastTick = null; mech.group.visible = !asset;
      if (asset) group.add(asset.root);
    },
    rotate(angle) { if (asset) asset.root.rotation.y = angle; },
    reset() { lastTick = null; asset?.animation.reset(); },
    update(player, alpha, tick, endingDelta = 0) {
      group.position.set(player.previousX + (player.x - player.previousX) * alpha, 0,
        player.previousZ + (player.z - player.previousZ) * alpha);
      group.rotation.y = Math.atan2(player.facingX, player.facingZ);
      const moving = Math.hypot(player.x - player.previousX, player.z - player.previousZ) > 0.0001;
      const delta = lastTick === null ? 0 : Math.max(0, tick - lastTick) / 60;
      lastTick = tick;
      mech.update(player, tick, moving);
      const state = player.hp <= 0 ? 'death' : player.dashRemaining > 0 ? 'dash' : player.protection > 0 ? 'hit' : moving ? 'run' : 'idle';
      asset?.animation.update(state, player.hp <= 0 ? endingDelta : delta);
      ring.scale.setScalar(player.dashRemaining > 0 ? 1.3 : 1);
      ring.material.color.setHex(player.protection > 0 ? 0xff607f : 0x73f6ce);
    },
    dispose() { if (asset) { group.remove(asset.root); asset.dispose(); asset = null; } disposeObjects([group]); },
  };
}
