import * as THREE from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';

/** For rigid one-bone armor, a convex hull preserves the minimum in every orientation.
 * Keep original vertex indices so skinning and material geometry remain untouched.
 */
export function createGroundProbe(meshes) {
  const probes = meshes.map(mesh => {
    const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
    const groups = new Map(); let rigid = true;
    for (let i = 0; i < position.count; i++) {
      if (skinWeight.getX(i) !== 1 || skinWeight.getY(i) || skinWeight.getZ(i) || skinWeight.getW(i)) { rigid = false; break; }
      const bone = skinIndex.getX(i);
      if (!groups.has(bone)) groups.set(bone, []);
      const point = new THREE.Vector3().fromBufferAttribute(position, i); point.vertexIndex = i;
      groups.get(bone).push(point);
    }
    if (!rigid) return { mesh, indices: Array.from({length:position.count}, (_,i)=>i) };
    const indices = [];
    for (const points of groups.values()) {
      if (points.length < 8) { indices.push(...points.map(p=>p.vertexIndex)); continue; }
      const hull = new ConvexHull().setFromPoints(points), exterior = new Set();
      for (const face of hull.faces) {
        let edge = face.edge;
        do { exterior.add(edge.head().point.vertexIndex); edge = edge.next; } while (edge !== face.edge);
      }
      indices.push(...(exterior.size ? exterior : points.map(p=>p.vertexIndex)));
    }
    return { mesh, indices };
  });
  const vertex = new THREE.Vector3();
  return {
    vertices: probes.reduce((sum,p)=>sum+p.indices.length,0),
    minimumY() {
      let minimum = Infinity;
      for (const {mesh,indices} of probes) for (const index of indices) {
        mesh.getVertexPosition(index, vertex).applyMatrix4(mesh.matrixWorld);
        minimum = Math.min(minimum, vertex.y);
      }
      return minimum;
    },
  };
}
