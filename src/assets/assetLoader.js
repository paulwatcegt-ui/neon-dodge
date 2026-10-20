import * as THREE from 'three';
import { inspectGlb } from './glbValidation.js';
import { disposeObjects } from './dispose.js';
import { createCharacterAnimation } from './characterAnimation.js';

export async function loadCharacter(buffer) {
  inspectGlb(buffer);
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => {
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    throw Error('模型尝试加载外部资源，请使用完整内嵌 GLB。');
  });
  const gltf = await new GLTFLoader(manager).parseAsync(buffer, '');
  const scenes = gltf.scenes || [gltf.scene];
  try {
    const content = gltf.scene;
    content.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(content);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y < 1e-5) throw Error('模型没有可见的有效高度。');
    const center = bounds.getCenter(new THREE.Vector3());
    const normalization = new THREE.Group(), pivot = new THREE.Group();
    normalization.add(content);
    normalization.scale.setScalar(1.7 / size.y);
    normalization.position.set(-center.x * normalization.scale.x, -bounds.min.y * normalization.scale.y, -center.z * normalization.scale.z);
    pivot.add(normalization);
    const materials = new Set(), bones = new Set(); let triangles = 0, meshes = 0;
    content.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; meshes++;
      triangles += ((o.geometry.index?.count || o.geometry.attributes.position?.count || 0) / 3) * (o.isInstancedMesh ? o.count : 1);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
      o.skeleton?.bones.forEach(bone => bones.add(bone));
    });
    if (!meshes) throw Error('模型没有可显示的网格。');
    const animation = createCharacterAnimation(content, gltf.animations);
    return { root: pivot, animation,
      profile: { meshes, triangles: Math.round(triangles), materials: materials.size, bones: bones.size,
        animations: gltf.animations.map(c => c.name), missing: animation.missing },
      dispose() { animation.dispose(); disposeObjects(scenes); },
    };
  } catch (error) { disposeObjects(scenes); throw error; }
}
