import * as THREE from 'three';
import { hash01 } from '../vendor/voxel-survivors/rng.js';
export function createActionEffects(scene) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(128 * 3), colors = new Float32Array(128 * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; scene.add(points);
  const particles = Array.from({ length: 128 }, () => ({ born: -1000, life: 1 })); let cursor = 0;
  const trailMaterial = new THREE.MeshBasicMaterial({ color: 0x52ffd1, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const trailGeometry = new THREE.PlaneGeometry(0.5, 1.3);
  const trails = Array.from({ length: 16 }, () => {
    const mesh = new THREE.Mesh(trailGeometry, trailMaterial.clone()); mesh.rotation.x = -Math.PI / 2; mesh.visible = false; scene.add(mesh);
    return { mesh, born: -1000 };
  });
  let lastTrailTick = -1, lastImpact = -1000, strength = 0;
  return {
    consume(events) {
      for (const e of events) {
        if (!['dash', 'perfect', 'pulse', 'enemyKilled', 'damaged'].includes(e.type)) continue;
        if (e.type !== 'dash') { lastImpact = e.tick; strength = e.type === 'pulse' ? 0.1 : 0.04; }
        const count = e.type === 'pulse' ? 32 : 10;
        for (let i = 0; i < count; i++) {
          const p = particles[cursor++ % particles.length];
          const angle = hash01(e.id, i) * Math.PI * 2, speed = 0.7 + hash01(e.id, i, 1) * 2.5;
          Object.assign(p, { born: e.tick, life: e.type === 'pulse' ? 36 : 24, x: e.x, z: e.z,
            vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed, vy: 1 + hash01(e.id, i, 2) * 2,
            color: e.type === 'damaged' ? [2.5, 0.2, 0.4] : [0.4, 2.2, 1.6] });
        }
      }
    },
    update(world, reduced) {
      const tick = world.tick;
      if (!reduced && world.player.dashRemaining > 0 && tick !== lastTrailTick && tick % 2 === 0) {
        const t = trails[(tick / 2) % trails.length]; t.born = tick;
        t.mesh.position.set(world.player.x, 0.05, world.player.z); t.mesh.rotation.z = -Math.atan2(world.player.dashX, world.player.dashZ);
        lastTrailTick = tick;
      }
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i], age = tick - p.born, alive = !reduced && age >= 0 && age < p.life;
        const time = age / 60;
        positions.set(alive ? [p.x + p.vx * time, Math.max(0.05, 0.3 + p.vy * time - 3 * time * time), p.z + p.vz * time] : [0, -100, 0], i * 3);
        colors.set(alive ? p.color.map(c => c * (1 - age / p.life)) : [0, 0, 0], i * 3);
      }
      geometry.attributes.position.needsUpdate = true; geometry.attributes.color.needsUpdate = true;
      for (const t of trails) { const age = tick - t.born; t.mesh.visible = !reduced && age >= 0 && age < 18; t.mesh.material.opacity = Math.max(0, 0.2 * (1 - age / 18)); }
      return reduced ? 0 : strength * Math.max(0, 1 - (tick - lastImpact) / 12);
    },
    reset() { particles.forEach(p => { p.born = -1000; }); trails.forEach(t => { t.born = -1000; t.mesh.visible = false; }); lastTrailTick = -1; lastImpact = -1000; },
    dispose() { scene.remove(points); geometry.dispose(); material.dispose(); trailGeometry.dispose(); trailMaterial.dispose(); trails.forEach(t => { scene.remove(t.mesh); t.mesh.material.dispose(); }); },
  };
}
