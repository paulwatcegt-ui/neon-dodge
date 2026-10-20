import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const render = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.18, 0.3, 2.2);
  const output = new OutputPass();
  composer.addPass(render); composer.addPass(bloom); composer.addPass(output);
  return { render: () => composer.render(),
    resize(width, height, ratio) { composer.setPixelRatio(ratio); composer.setSize(width, height); },
    dispose() { bloom.dispose(); output.dispose(); composer.dispose(); },
  };
}
