import * as THREE from 'three';
import { createCamera } from './camera.js';
import { createArenaView } from './arenaView.js';
import { createPlayerView } from './playerView.js';
import { createCombatView } from './combatView.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createPost } from './postprocessing.js';
import { createActionEffects } from './actionEffects.js';

export function createView(canvas, arena) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071116);
  scene.fog = new THREE.Fog(0x071116, 50, 110);
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04); scene.environment = environment.texture;
  scene.environmentIntensity = 0.45;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xb6e8ed, 0x13202c, 2.5));
  const light = new THREE.DirectionalLight(0xd7ffef, 3);
  light.position.set(-8, 18, 8); light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, far: 60 });
  light.shadow.normalBias = 0.025; scene.add(light);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x020508, roughness: 1, envMapIntensity: 0.1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.7; ground.receiveShadow = true; scene.add(ground);
  scene.add(createArenaView(arena));
  const player = createPlayerView(); scene.add(player.group);
  const combat = createCombatView(scene);
  const effects = createActionEffects(scene);
  const cameraRig = createCamera();
  const post = createPost(renderer, scene, cameraRig.camera);
  const basePosition = new THREE.Vector3();
  let quality = 'balanced', reducedMotion = false, lastFrame = performance.now(), lastWorld;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false); cameraRig.resize(innerWidth, innerHeight);
    post.resize(innerWidth, innerHeight, renderer.getPixelRatio());
    basePosition.copy(cameraRig.camera.position);
    // Narrow windows move the camera farther away; keep the arena out of fog.
    const distance = cameraRig.camera.position.length();
    scene.fog.near = distance + 15; scene.fog.far = distance + 80;
  }
  resize(); window.addEventListener('resize', resize);
  return {
    basis: cameraRig.basis,
    metrics: () => ({ quality, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }),
    async prepare(world = lastWorld) {
      lastWorld = world;
      player.update(world.player, 1, world.tick); combat.update(world, 1); effects.update(world, reducedMotion);
      const restore = combat.revealForWarmup();
      try { await renderer.compileAsync(scene, cameraRig.camera); post.render(); } finally { restore(); }
      await new Promise(resolve => requestAnimationFrame(resolve));
    },
    consume(events) { combat.consume(events); effects.consume(events); },
    reset() { combat.reset(); effects.reset(); player.reset(); },
    setAsset(asset) { player.setAsset(asset); },
    rotateAsset(angle) { player.rotate(angle); },
    setQuality(value) {
      quality = value; renderer.shadowMap.enabled = value !== 'low';
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, value === 'low' ? 1 : value === 'high' ? 2 : 1.5)); resize();
    },
    setReducedMotion(value) { reducedMotion = value; },
    render(world, alpha) {
      lastWorld = world;
      renderer.info.reset();
      const now = performance.now(), endingDelta = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now;
      player.update(world.player, alpha, world.tick, world.outcome ? endingDelta : 0);
      combat.update(world, alpha);
      const shake = effects.update(world, reducedMotion);
      cameraRig.camera.position.copy(basePosition);
      cameraRig.camera.position.x += Math.sin(world.tick * 1.7) * shake;
      cameraRig.camera.position.y += Math.cos(world.tick * 2.1) * shake;
      if (quality === 'low') renderer.render(scene, cameraRig.camera); else post.render();
    },
    dispose() {
      combat.dispose();
      effects.dispose(); player.dispose(); scene.remove(player.group); post.dispose(); environment.dispose();
      window.removeEventListener('resize', resize);
      const geometries = new Set(), materials = new Set();
      scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose();
    },
  };
}
