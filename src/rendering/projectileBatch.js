import * as THREE from 'three';
import { COMBAT } from '../config/combat.js';
import { ENEMIES } from '../config/enemies.js';

/** Render-only pool. Simulation IDs and collision paths remain in simulation/. */
export function createProjectileBatch(scene) {
  const geometry = new THREE.SphereGeometry(COMBAT.projectileRadius, 8, 6);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geometry, material, COMBAT.projectileCap);
  mesh.name = 'projectile-batch'; mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const transform = new THREE.Object3D();
  mesh.setMatrixAt(0, transform.matrix);
  const color = new THREE.Color(0xffba77); mesh.setColorAt(0,color);
  scene.add(mesh);
  return {
    revealForWarmup() {
      const count = mesh.count, visible = mesh.visible;
      mesh.count = Math.max(1, count); mesh.visible = true;
      return () => { mesh.count = count; mesh.visible = visible; };
    },
    update(projectiles, alpha) {
      let count = 0;
      for (const b of projectiles) {
        if (b.kind && b.kind !== 'bullet') continue;
        if (count >= COMBAT.projectileCap) break;
        transform.position.set(b.previousX + (b.x - b.previousX) * alpha, 0.45,
          b.previousZ + (b.z - b.previousZ) * alpha);
        transform.updateMatrix(); mesh.setMatrixAt(count, transform.matrix);
        color.setHex(ENEMIES[b.flavor]?.color ?? 0xffba77); mesh.setColorAt(count++,color);
      }
      mesh.count = count; mesh.visible = count > 0;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    },
    reset() { mesh.count = 0; mesh.visible = false; },
    dispose() { scene.remove(mesh); mesh.dispose(); geometry.dispose(); material.dispose(); },
  };
}
