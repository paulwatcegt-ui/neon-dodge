import * as THREE from 'three';
import { GAME } from '../config/gameplay.js';
const NAMES = { idle: /sentinel|idle|stand/i, run: /run|walk/i, dash: /dodgeroll|dash|dodge|roll/i, hit: /hitchest|hit|hurt|damage/i, death: /collapse|death|die|dead/i };
const EXACT = { idle: 'Sentinel', run: 'Run', dash: 'DodgeRoll', hit: 'HitChest', death: 'Collapse' };
export function mapAnimations(clips) {
  return Object.fromEntries(Object.entries(NAMES).map(([state, regex]) => [state,
    clips.find(c => c.name === EXACT[state]) || clips.find(c => regex.test(c.name)) || null]));
}
export function createCharacterAnimation(root, clips, { phantom = false } = {}) {
  const mixer = new THREE.AnimationMixer(root), mapping = mapAnimations(clips);
  let current = null, currentState = '';
  return {
    missing: Object.keys(mapping).filter(key => !mapping[key]),
    describe: () => ({ state: currentState, clip: current?.getClip().name ?? null, time: current?.time ?? 0,
      timeScale: current?.getEffectiveTimeScale() ?? 1,
      mapping: Object.fromEntries(Object.entries(mapping).map(([state, clip]) => [state, clip?.name ?? null])) }),
    update(state, delta) {
      if (state !== currentState) {
        const clip = mapping[state] || mapping.idle;
        const next = clip ? mixer.clipAction(clip) : null;
        if (next && next !== current) {
          const oneShot = ['death', 'hit', 'dash'].includes(state);
          const fade = state === 'dash' || currentState === 'dash' ? 0.025 : state === 'hit' ? 0.04 : 0.1;
          next.reset(); next.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity);
          next.clampWhenFinished = oneShot;
          next.setEffectiveTimeScale(state === 'dash' ? clip.duration / (GAME.dashTicks * GAME.step) :
            state === 'hit' ? clip.duration / 0.24 : phantom && state === 'run' ? 2 : 1);
          next.fadeIn(fade).play();
          current?.fadeOut(fade); current = next;
        }
        currentState = state;
      }
      mixer.update(Math.max(0, delta));
    },
    reset() { mixer.stopAllAction(); mixer.setTime(0); current = null; currentState = ''; },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
}
