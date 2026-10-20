import * as THREE from 'three';
import { inspectGlb } from './glbValidation.js';
import { disposeObjects } from './dispose.js';
import { createCharacterAnimation } from './characterAnimation.js';

export async function loadCharacter(buffer, { phantom = false } = {}) {
  inspectGlb(buffer);
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => {
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    throw Error('模型尝试加载外部资源，请使用完整内嵌 GLB。');
  });
  const gltf = await new GLTFLoader(manager).parseAsync(buffer, '');
  const scenes = gltf.scenes || [gltf.scene];
  let animation;
  try {
    const content = gltf.scene;
    // Keep locomotion under simulation control; retain the authored vertical roll/fall motion.
    const clips = phantom ? gltf.animations.map(clip => {
      const copy = clip.clone();
      for (const track of copy.tracks) if (track.name === 'root.position') {
        for (let i = 0; i < track.values.length; i += 3) { track.values[i] = 0; track.values[i + 2] = 0; }
      }
      return copy;
    }) : gltf.animations;
    animation = createCharacterAnimation(content, clips, { phantom });
    animation.update('idle', 0);
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
    const materials = new Set(), bones = new Set(), skinned = []; let triangles = 0, meshes = 0;
    content.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; if (o.isSkinnedMesh) o.frustumCulled = false; meshes++;
      triangles += ((o.geometry.index?.count || o.geometry.attributes.position?.count || 0) / 3) * (o.isInstancedMesh ? o.count : 1);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
      o.skeleton?.bones.forEach(bone => bones.add(bone));
      if (o.isSkinnedMesh) skinned.push(o);
    });
    if (!meshes) throw Error('模型没有可显示的网格。');
    const groundProbe = phantom ? (await import('./grounding.js')).createGroundProbe(skinned) : null;
    return { root: pivot, animation,
      ground() {
        if (!phantom) return;
        // Bone blending can dip the boots below the authored floor between keyframes.
        // Visual-only lift: preserve airborne poses and never move the collision body.
        pivot.position.y = 0; content.updateWorldMatrix(true, true);
        pivot.position.y = Math.max(0, -groundProbe.minimumY()) + 0.002;
      },
      profile: { meshes, triangles: Math.round(triangles), materials: materials.size, bones: bones.size,
        name: phantom ? 'ND-01 / PHANTOM' : '自定义 GLB', height: 1.7, groundProbeVertices: groundProbe?.vertices ?? 0,
        animations: gltf.animations.map(c => c.name), missing: animation.missing },
      dispose() { animation.dispose(); disposeObjects(scenes); },
    };
  } catch (error) { animation?.dispose(); disposeObjects(scenes); throw error; }
}
