import * as THREE from 'three';
import { COMBAT } from '../config/combat.js';

export function createCombatView(scene) {
  const enemies = new Map(), bullets = new Map();
  const bodyGeometries = { shooter: new THREE.OctahedronGeometry(0.48), chaser: new THREE.BoxGeometry(0.65, 0.65, 0.65),
    charger: new THREE.ConeGeometry(0.45, 0.95, 3), zoner: new THREE.CylinderGeometry(0.48, 0.48, 0.5, 6) };
  const colors = { shooter: 0xec9b75, chaser: 0xed7184, charger: 0xc69bff, zoner: 0xe5d06c };
  const bodyMaterials = Object.fromEntries(Object.entries(colors).map(([type, color]) => [type,
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12, metalness: 0.4, roughness: 0.5 })]));
  const bulletGeometry = new THREE.SphereGeometry(COMBAT.projectileRadius, 8, 6);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffba77 });
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff865c, transparent: true, opacity: 0.65 });
  const ringGeometry = new THREE.RingGeometry(0.94, 1, 64);
  const rings = Array.from({ length: 12 }, () => {
    const mesh = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.visible = false; scene.add(mesh);
    return { mesh, start: -100, duration: 1, radius: 1 };
  });
  function sync(map, entities, create) {
    const live = new Set(entities.map(e => e.id));
    for (const [id, object] of map) if (!live.has(id)) {
      scene.remove(object); object.userData.line?.geometry.dispose(); object.userData.warning?.material.dispose();
      if (object.userData.ownMaterial) object.material.dispose(); map.delete(id);
    }
    for (const e of entities) if (!map.has(e.id)) { const object = create(e); map.set(e.id, object); scene.add(object); }
  }
  return {
    revealForWarmup() {
      const states = [];
      for (const mesh of [...rings.map(r => r.mesh), ...[...enemies.values()].flatMap(o => [o.userData.line, o.userData.warning])]) {
        states.push([mesh, mesh.visible]); mesh.visible = true;
      }
      return () => states.forEach(([mesh, visible]) => { mesh.visible = visible; });
    },
    consume(events) {
      for (const event of events) {
        if (!['pulse', 'perfect', 'graze', 'damaged'].includes(event.type)) continue;
        const ring = rings.find(r => !r.mesh.visible) || rings.reduce((a, b) => a.start < b.start ? a : b);
        ring.start = event.tick; ring.duration = event.type === 'pulse' ? COMBAT.pulseVisualTicks : 20;
        ring.radius = event.type === 'pulse' ? COMBAT.pulseRadius : event.type === 'perfect' ? 1.4 : 0.8;
        ring.mesh.position.set(event.x, 0.08, event.z); ring.mesh.visible = true;
        ring.mesh.material.color.setHex({ pulse: 0x73f6ce, perfect: 0x9beeff, graze: 0xffdb8b, damaged: 0xff5f64 }[event.type]);
      }
    },
    update(world, alpha) {
      sync(enemies, world.enemies, e => {
        const group = new THREE.Group();
        const body = new THREE.Mesh(bodyGeometries[e.type], bodyMaterials[e.type]); body.position.y = 0.6; body.castShadow = true; group.add(body);
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const line = new THREE.Line(geometry, lineMaterial); group.add(line); group.userData.line = line;
        const warning = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: colors[e.type], side: THREE.DoubleSide,
          transparent: true, opacity: 0.7, depthWrite: false }));
        warning.rotation.x = -Math.PI / 2; group.add(warning); group.userData.warning = warning;
        return group;
      });
      for (const e of world.enemies) {
        const object = enemies.get(e.id);
        object.position.set(e.previousX + (e.x - e.previousX) * alpha, 0, e.previousZ + (e.z - e.previousZ) * alpha);
        const line = object.userData.line;
        line.visible = e.state === 'windup' && (e.type === 'shooter' || e.type === 'charger');
        const warning = object.userData.warning;
        warning.visible = e.state === 'windup' && (e.type === 'chaser' || e.type === 'zoner');
        if (warning.visible) {
          const melee = e.type === 'chaser';
          warning.position.set(melee ? e.aimX * 0.65 : e.targetX - object.position.x, 0.055,
            melee ? e.aimZ * 0.65 : e.targetZ - object.position.z);
          warning.scale.setScalar(melee ? 0.85 : 1.4);
          warning.material.opacity = 0.35 + 0.55 * (1 - e.timer / e.windupTicks);
        }
        const positions = line.geometry.attributes.position;
        positions.setXYZ(0, 0, 0.06, 0);
        positions.setXYZ(1, e.targetX - object.position.x, 0.06, e.targetZ - object.position.z);
        positions.needsUpdate = true; line.geometry.computeBoundingSphere();
        object.children[0].scale.setScalar(e.state === 'windup' ? 1 + 0.15 * (1 - e.timer / e.windupTicks) : 1);
      }
      sync(bullets, world.projectiles, b => {
        if (!b.kind || b.kind === 'bullet') return new THREE.Mesh(bulletGeometry, bulletMaterial);
        const mesh = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: b.kind === 'zone' ? 0xe5d06c : 0xc69bff,
          transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
        mesh.rotation.x = -Math.PI / 2; mesh.scale.setScalar(b.radius); mesh.userData.ownMaterial = true; return mesh;
      });
      for (const b of world.projectiles) bullets.get(b.id).position.set(
        b.previousX + (b.x - b.previousX) * alpha, b.kind && b.kind !== 'bullet' ? 0.07 : 0.45,
        b.previousZ + (b.z - b.previousZ) * alpha);
      for (const r of rings) {
        const progress = (world.tick - r.start) / r.duration;
        r.mesh.visible = progress >= 0 && progress < 1;
        if (r.mesh.visible) {
          r.mesh.scale.setScalar(r.radius * Math.max(0.01, progress));
          r.mesh.material.opacity = 0.9 * (1 - progress);
        }
      }
    },
    reset() {
      for (const objects of [enemies, bullets]) {
        for (const o of objects.values()) {
          scene.remove(o); o.userData.line?.geometry.dispose(); o.userData.warning?.material.dispose();
          if (o.userData.ownMaterial) o.material.dispose();
        }
        objects.clear();
      }
      for (const r of rings) { r.start = -100; r.mesh.visible = false; }
    },
    dispose() {
      this.reset(); Object.values(bodyGeometries).forEach(g => g.dispose()); Object.values(bodyMaterials).forEach(m => m.dispose());
      bulletGeometry.dispose(); bulletMaterial.dispose();
      lineMaterial.dispose(); ringGeometry.dispose();
      rings.forEach(r => { scene.remove(r.mesh); r.mesh.material.dispose(); });
    },
  };
}
