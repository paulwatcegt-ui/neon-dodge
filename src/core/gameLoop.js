import { GAME } from '../config/gameplay.js';

export function createClock(step, overload) {
  let previous = null;
  let accumulator = 0;
  return {
    reset() { previous = null; accumulator = 0; },
    advance(now) {
      if (previous === null) { previous = now; return 0; }
      accumulator += Math.max(0, (now - previous) / 1000);
      previous = now;
      if (accumulator > GAME.step * GAME.maxCatchupSteps + 1e-8) {
        accumulator = 0; overload(); return 0;
      }
      while (accumulator + 1e-10 >= GAME.step) {
        accumulator = Math.max(0, accumulator - GAME.step);
        if (step() === false) { accumulator = 0; break; }
      }
      return accumulator / GAME.step;
    },
  };
}
