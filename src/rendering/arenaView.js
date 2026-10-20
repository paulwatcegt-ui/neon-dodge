import * as THREE from 'three';

export function createArenaView(arena) {
  const group = new THREE.Group();
  const radius = arena.apothem / Math.cos(Math.PI / 8);
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.65, 8),
    new THREE.MeshStandardMaterial({ color: 0x13232b, roughness: 0.8, metalness: 0.3 }));
  slab.rotation.y = Math.PI / 8; slab.position.y = -0.34;
  slab.receiveShadow = true; group.add(slab);

  const positions = [0, 0, 0];
  for (const p of arena.vertices) positions.push(p.x, 0, p.z);
  const indices = [];
  for (let i = 0; i < 8; i++) indices.push(0, (i + 1) % 8 + 1, i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const surface = new THREE.Mesh(geometry,
    new THREE.MeshStandardMaterial({ color: 0x081720, metalness: 0.35, roughness: 0.65, envMapIntensity: 0.22 }));
  surface.receiveShadow = true; group.add(surface);

  const grid = [];
  for (let axis = 0; axis < 2; axis++) for (let offset = -11; offset <= 11; offset++) {
    let low = -Infinity, high = Infinity;
    for (const n of arena.planes) {
      const variable = axis === 0 ? n.x : n.z;
      const fixed = axis === 0 ? n.z : n.x;
      const gap = n.distance - 0.08 - fixed * offset;
      if (variable > 1e-8) high = Math.min(high, gap / variable);
      if (variable < -1e-8) low = Math.max(low, gap / variable);
    }
    if (low <= high) grid.push(...(axis === 0 ? [low, 0.015, offset, high, 0.015, offset] : [offset, 0.015, low, offset, 0.015, high]));
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3));
  group.add(new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({ color: 0x1f424a, transparent: true, opacity: 0.6 })));

  for (const inset of [0, 0.18, 0.6]) {
    const points = arena.vertices.map(p => new THREE.Vector3(p.x * (1 - inset / radius), 0.035, p.z * (1 - inset / radius)));
    group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: inset === 0.6 ? 0x25454f : 0x73f6ce })));
  }
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xf5ae79 });
  for (const n of arena.planes) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.045, 0.11), markerMat);
    marker.position.set(n.x * 11.6, 0.04, n.z * 11.6);
    marker.rotation.y = -Math.atan2(n.z, n.x) + Math.PI / 2;
    group.add(marker);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.52, 64),
    new THREE.MeshBasicMaterial({ color: 0x35646b, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.025; group.add(ring);
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x55ffd6, emissive: 0x32ffb7, emissiveIntensity: 2.2 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x162c3d, metalness: 0.7, roughness: 0.3 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xee7dc4, emissive: 0xda328c, emissiveIntensity: 1.8 });
  for (let i = 0; i < arena.vertices.length; i++) {
    const p = arena.vertices[i], q = arena.vertices[(i + 1) % 8];
    const length = Math.hypot(q.x - p.x, q.z - p.z);
    for (const y of [-0.35, -0.12]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(length - 0.25, 0.04, 0.05), i % 2 ? railMaterial : accentMaterial);
      rail.position.set((p.x + q.x) / 2, y, (p.z + q.z) / 2); rail.rotation.y = -Math.atan2(q.z - p.z, q.x - p.x); group.add(rail);
    }
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, 0.65, 6), trimMaterial);
    pillar.position.set(p.x * 0.98, 0.1, p.z * 0.98); group.add(pillar);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.1), railMaterial);
    lamp.position.copy(pillar.position); lamp.position.y = 0.2; group.add(lamp);
  }
  return group;
}
