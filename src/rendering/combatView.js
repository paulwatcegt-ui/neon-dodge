import * as THREE from 'three';
import { COMBAT } from '../config/combat.js';
import { createProjectileBatch } from './projectileBatch.js';
import { createEnemyVisuals } from './enemyVisuals.js';
import { ENEMIES } from '../config/enemies.js';

export function createCombatView(scene) {
  const enemies = new Map(), bullets = new Map();
  const visuals = createEnemyVisuals();
  const colors = Object.fromEntries(Object.entries(ENEMIES).map(([type,e])=>[type,e.color]));
  const projectileBatch = createProjectileBatch(scene);
  const lineMaterials = Object.fromEntries(Object.entries(colors).map(([type,color])=>[type,new THREE.LineBasicMaterial({color,transparent:true,opacity:type==='sniper'?1:0.7})]));
  const ringGeometry = new THREE.RingGeometry(0.94, 1, 64);
  const chargeWarningGeometry = new THREE.PlaneGeometry(1, 1);
  const stunMaterial = new THREE.MeshBasicMaterial({color:0x9beeff,transparent:true,opacity:0.85,side:THREE.DoubleSide,depthWrite:false});
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
      const restoreProjectiles = projectileBatch.revealForWarmup();
      const states = [];
      for (const mesh of [...rings.map(r => r.mesh), ...[...enemies.values()].flatMap(o => [o.userData.line, o.userData.warning, o.userData.stun])]) {
        states.push([mesh, mesh.visible]); mesh.visible = true;
      }
      return () => { restoreProjectiles(); states.forEach(([mesh, visible]) => { mesh.visible = visible; }); };
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
        const body = visuals.create(e.type); body.position.y = 0.6; group.add(body);
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(18),3));
        const line = new THREE.LineSegments(geometry, lineMaterials[e.type]); group.add(line); group.userData.line = line;
        const warning = new THREE.Mesh(['charger','sniper'].includes(e.type) ? chargeWarningGeometry : ringGeometry, new THREE.MeshBasicMaterial({ color: colors[e.type], side: THREE.DoubleSide,
          transparent: true, opacity: 0.7, depthWrite: false }));
        warning.rotation.x = -Math.PI / 2; group.add(warning); group.userData.warning = warning;
        const stun=new THREE.Mesh(ringGeometry,stunMaterial);stun.rotation.x=-Math.PI/2;stun.scale.setScalar(0.7);stun.position.y=0.06;stun.visible=false;group.add(stun);group.userData.stun=stun;
        return group;
      });
      for (const e of world.enemies) {
        const object = enemies.get(e.id);
        object.position.set(e.previousX + (e.x - e.previousX) * alpha, 0, e.previousZ + (e.z - e.previousZ) * alpha);
        object.userData.stun.visible=e.state==='stunned';
        object.children[0].rotation.z=e.state==='stunned'?Math.sin(world.tick*0.2)*0.12:0;
        const line = object.userData.line;
        const aiming = e.state === 'windup' || e.state === 'burst';
        line.visible = aiming && ['shooter','charger','spread','sniper','orbiter'].includes(e.type);
        const warning = object.userData.warning;
        warning.visible = aiming && ['chaser','charger','zoner','sniper','blaster'].includes(e.type);
        if (warning.visible) {
          if (['charger','sniper'].includes(e.type)) {
            const dx = e.targetX - e.x, dz = e.targetZ - e.z;
            warning.position.set(dx / 2, 0.055, dz / 2);
            warning.rotation.z = Math.atan2(dx, dz);
            warning.scale.set(e.type==='sniper'?0.32:1, Math.hypot(dx, dz), 1);
            warning.material.opacity = (e.type==='sniper'?0.22:0.12) + 0.18 * (1 - e.timer / e.windupTicks);
          } else {
          const melee = e.type === 'chaser';
          warning.position.set(melee ? e.aimX * 0.65 : e.targetX - object.position.x, 0.055,
            melee ? e.aimZ * 0.65 : e.targetZ - object.position.z);
          warning.scale.setScalar(melee ? 0.85 : e.type==='blaster'?2:1.4);
          warning.material.opacity = 0.35 + 0.55 * (1 - e.timer / e.windupTicks);
          }
        }
        const positions = line.geometry.attributes.position;
        const angles=e.type==='spread'?[-Math.PI/9,0,Math.PI/9]:[0];
        angles.forEach((angle,i)=>{
          positions.setXYZ(i*2,0,0.06,0);
          positions.setXYZ(i*2+1,e.type==='spread'?(e.aimX*Math.cos(angle)-e.aimZ*Math.sin(angle))*10:e.targetX-object.position.x,
            0.06,e.type==='spread'?(e.aimX*Math.sin(angle)+e.aimZ*Math.cos(angle))*10:e.targetZ-object.position.z);
        });line.geometry.setDrawRange(0,angles.length*2);
        positions.needsUpdate = true; line.geometry.computeBoundingSphere();
        if (['spread','sniper','orbiter'].includes(e.type)) object.children[0].rotation.y=Math.atan2(e.aimX,e.aimZ);
        object.children[0].scale.setScalar(e.state === 'windup' ? 1 + 0.15 * (1 - e.timer / e.windupTicks) : 1);
      }
      projectileBatch.update(world.projectiles, alpha);
      const areas = world.projectiles.filter(b => b.kind && b.kind !== 'bullet');
      sync(bullets, areas, b => {
        const mesh = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: b.kind === 'zone' ? 0xe5d06c : b.kind==='blast'?0xb4ff53:0xc69bff,
          transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
        mesh.rotation.x = -Math.PI / 2; mesh.scale.setScalar(b.radius); mesh.userData.ownMaterial = true; return mesh;
      });
      for (const b of areas) bullets.get(b.id).position.set(
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
      projectileBatch.reset();
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
      this.reset(); visuals.dispose();
      projectileBatch.dispose();
      Object.values(lineMaterials).forEach(m=>m.dispose()); ringGeometry.dispose(); chargeWarningGeometry.dispose(); stunMaterial.dispose();
      rings.forEach(r => { scene.remove(r.mesh); r.mesh.material.dispose(); });
    },
  };
}
