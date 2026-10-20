import { screenToWorld } from '../shared/math.js';

const movement = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
export function createKeyboard({ target = window, basis, isRunning, togglePause, onBlur }) {
  const held = new Set();
  let dash = false, pulse = false;
  function clear() { held.clear(); dash = false; pulse = false; }
  function keydown(event) {
    if (event.target?.closest?.('#settings')) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return;
    if (event.code === 'Space' || event.code === 'KeyE' || movement.has(event.code)) event.preventDefault();
    if (event.code === 'Escape' && !event.repeat) { togglePause(); return; }
    if (!isRunning()) return;
    if (movement.has(event.code)) held.add(event.code);
    if (event.code === 'Space' && !event.repeat) dash = true;
    if (event.code === 'KeyE' && !event.repeat) pulse = true;
  }
  function keyup(event) { held.delete(event.code); }
  function blur() { clear(); onBlur(); }
  target.addEventListener('keydown', keydown);
  target.addEventListener('keyup', keyup);
  target.addEventListener('blur', blur);
  return {
    clear,
    sample() {
      const direction = screenToWorld(Number(held.has('KeyD')) - Number(held.has('KeyA')),
        Number(held.has('KeyW')) - Number(held.has('KeyS')), basis);
      const command = { ...direction, dash, pulse }; dash = false; pulse = false; return command;
    },
    dispose() {
      target.removeEventListener('keydown', keydown); target.removeEventListener('keyup', keyup);
      target.removeEventListener('blur', blur); clear();
    },
  };
}
