import * as THREE from 'three';
import { groundBasis } from '../shared/math.js';

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 200);
  const direction = new THREE.Vector3(0, -1.25, -1).normalize();
  const basis = groundBasis(direction);
  function resize(width, height) {
    camera.aspect = width / height;
    // Bound a sphere around the entire arena; reserve space for the interface.
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    const distance = 13.2 / Math.sin(Math.min(vertical, horizontal)) * 1.25;
    camera.position.copy(direction).multiplyScalar(-distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  return { camera, basis, resize };
}
