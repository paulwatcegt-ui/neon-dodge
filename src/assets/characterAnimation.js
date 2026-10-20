import * as THREE from 'three';
const NAMES = { idle: /idle|stand/i, run: /run|walk/i, dash: /dash|dodge|roll/i, hit: /hit|hurt|damage/i, death: /death|die|dead/i };
export function mapAnimations(clips) {
  return Object.fromEntries(Object.entries(NAMES).map(([state, regex]) => [state, clips.find(c => regex.test(c.name)) || null]));
}
export function createCharacterAnimation(root, clips) {
  const mixer = new THREE.AnimationMixer(root), mapping = mapAnimations(clips);
  let current = null, currentState = '';
  return {
    missing: Object.keys(mapping).filter(key => !mapping[key]),
    update(state, delta) {
      if (state !== currentState) {
        const clip = mapping[state] || mapping.idle;
        const next = clip ? mixer.clipAction(clip) : null;
        if (next && next !== current) {
          next.reset(); next.setLoop(state === 'death' || state === 'hit' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
          next.clampWhenFinished = state === 'death' || state === 'hit'; next.fadeIn(0.12).play();
          current?.fadeOut(0.12); current = next;
        }
        currentState = state;
      }
      mixer.update(Math.max(0, delta));
    },
    reset() { mixer.stopAllAction(); mixer.setTime(0); current = null; currentState = ''; },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
}
