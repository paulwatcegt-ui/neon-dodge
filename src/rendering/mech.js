import * as THREE from 'three';

/** Original procedural stand-in; not the final ND-01 asset. */
export function createMech() {
  const group = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color: 0xa7c5c7, metalness: 0.55, roughness: 0.48 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x172b37, metalness: 0.65, roughness: 0.4 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x66cdb6, emissive: 0x37b99b, emissiveIntensity: 0.65 });
  function box(parent, dimensions, position, material = armor) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
    mesh.position.set(...position); mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  box(group, [0.52, 0.53, 0.34], [0, 1.1, 0]);
  box(group, [0.24, 0.1, 0.07], [0, 1.18, 0.2], glow);
  box(group, [0.37, 0.26, 0.3], [0, 0.73, 0], dark);
  box(group, [0.35, 0.3, 0.32], [0, 1.54, 0]);
  box(group, [0.28, 0.08, 0.04], [0, 1.55, 0.18], glow);
  box(group, [0.35, 0.35, 0.18], [0, 1.12, -0.26], dark);
  const limbs = [];
  for (const sign of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sign * 0.41, 1.24, 0); group.add(arm);
    box(arm, [0.26, 0.24, 0.34], [0, 0.03, 0]);
    box(arm, [0.18, 0.43, 0.21], [0, -0.3, 0], dark);
    box(arm, [0.12, 0.18, 0.04], [0, -0.28, 0.13], glow);
    const leg = new THREE.Group(); leg.position.set(sign * 0.17, 0.7, 0); group.add(leg);
    box(leg, [0.23, 0.45, 0.27], [0, -0.22, 0]);
    box(leg, [0.21, 0.22, 0.25], [0, -0.5, 0], dark);
    box(leg, [0.25, 0.12, 0.39], [0, -0.65, 0.06]);
    limbs.push({ arm, leg, sign });
  }
  return { group,
    update(player, tick, moving) {
      const phase = tick * 0.22, amplitude = moving ? 0.55 : 0;
      for (const { arm, leg, sign } of limbs) { leg.rotation.x = Math.sin(phase) * amplitude * sign; arm.rotation.x = -leg.rotation.x * 0.65; }
      group.rotation.x = player.dashRemaining > 0 ? 0.22 : 0;
      group.rotation.z = player.hp <= 0 ? 0.9 : 0;
      glow.emissiveIntensity = player.protection > 0 ? 0.35 : player.dashRemaining > 0 ? 0.95 : 0.65;
    },
  };
}
