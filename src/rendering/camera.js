import * as THREE from 'three';
import { groundBasis } from '../shared/math.js';
import { createArena } from '../simulation/arena.js';
import { GAME } from '../config/gameplay.js';

export function createCamera(arena = createArena(GAME.apothem)) {
  const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 200);
  const direction = new THREE.Vector3(0, -0.75, -1).normalize();
  const basis = groundBasis(direction);
  camera.position.copy(direction).multiplyScalar(-50); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const points = arena.vertices.flatMap(p => [-0.7, 0.4].map(y => new THREE.Vector3(p.x, y, p.z)));
  const viewBounds = new THREE.Box3().setFromPoints(points.map(p => p.clone().applyMatrix4(camera.matrixWorldInverse)));
  function resize(width, height) {
    const aspect = width / height;
    const halfHeight = Math.max((viewBounds.max.y - viewBounds.min.y) / 2,
      (viewBounds.max.x - viewBounds.min.x) / (2 * aspect)) / 0.84;
    const cx = (viewBounds.min.x + viewBounds.max.x) / 2, cy = (viewBounds.min.y + viewBounds.max.y) / 2;
    camera.left = cx - halfHeight * aspect; camera.right = cx + halfHeight * aspect;
    camera.top = cy + halfHeight; camera.bottom = cy - halfHeight;
    camera.updateProjectionMatrix();
  }
  function framing() {
    camera.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromPoints(arena.vertices.map(p => new THREE.Vector3(p.x, 0, p.z).project(camera)));
    return { left: bounds.min.x, right: bounds.max.x, top: bounds.max.y, bottom: bounds.min.y };
  }
  return { camera, basis, resize, framing };
}
