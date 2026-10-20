import * as THREE from 'three';
import { ENEMIES } from '../config/enemies.js';
export function createEnemyVisuals() {
  const geometries = {
    shooter: new THREE.OctahedronGeometry(0.48), chaser: new THREE.BoxGeometry(0.65,0.65,0.65),
    charger: new THREE.ConeGeometry(0.45,0.95,3), zoner: new THREE.CylinderGeometry(0.48,0.48,0.5,6),
    spread: new THREE.TorusGeometry(0.34,0.14,5,8), sniper: new THREE.CylinderGeometry(0.16,0.3,1.25,5),
    orbiter: new THREE.IcosahedronGeometry(0.5,0), blaster: new THREE.DodecahedronGeometry(0.5,0),
  };
  geometries.spread.rotateX(Math.PI/2); geometries.sniper.rotateX(Math.PI/2);
  const materials=Object.fromEntries(Object.entries(ENEMIES).map(([type,e])=>[type,new THREE.MeshStandardMaterial({color:e.color,emissive:e.color,emissiveIntensity:0.2,metalness:0.5,roughness:0.4})]));
  const detail = new THREE.BoxGeometry(0.1,0.1,0.4), ring = new THREE.TorusGeometry(0.62,0.035,4,16);
  const accent=new THREE.MeshBasicMaterial({color:0xd5faff});
  return {
    create(type) {
      const group=new THREE.Group(),body=new THREE.Mesh(geometries[type],materials[type]); body.castShadow=true;group.add(body);
      if(type==='spread')for(const x of [-0.24,0,0.24]){const barrel=new THREE.Mesh(detail,accent);barrel.position.set(x,0,0.45);group.add(barrel);}
      if(type==='sniper'){const scope=new THREE.Mesh(detail,accent);scope.position.set(0,0.25,0.12);scope.scale.set(0.7,0.7,1.2);group.add(scope);}
      if(type==='orbiter'){const orbit=new THREE.Mesh(ring,accent);orbit.rotation.x=Math.PI/3;group.add(orbit);}
      if(type==='blaster'){const fuse=new THREE.Mesh(detail,accent);fuse.rotation.x=Math.PI/2;fuse.position.y=0.55;group.add(fuse);}
      return group;
    },
    dispose(){Object.values(geometries).forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());detail.dispose();ring.dispose();accent.dispose();},
  };
}
