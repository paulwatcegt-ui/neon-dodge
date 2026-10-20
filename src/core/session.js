import { createWorld, stepWorld } from '../simulation/world.js';

export function createSession({ newRun, ...options } = {}) {
  const makeWorld = () => createWorld({ ...options, ...newRun?.() });
  return {
    mode: 'ready', reason: '', world: makeWorld(),
    start() { if (this.world.player.hp > 0 && !this.world.outcome) { this.mode = 'running'; this.reason = ''; } },
    pause(reason = 'manual') { if (this.mode === 'running') { this.mode = 'paused'; this.reason = reason; } },
    reset() { this.world = makeWorld(); },
    setGameMode(mode) {
      if (!['ready', 'defeated'].includes(this.mode)) return false;
      const world = createWorld({ ...options, ...newRun?.(), mode });
      options.mode = mode; this.world = world; this.mode = 'ready'; this.reason = ''; return true;
    },
    step(command) {
      if (this.mode !== 'running') return false;
      stepWorld(this.world, command);
      if (this.world.player.hp <= 0) { this.mode = 'defeated'; return false; }
      return true;
    },
  };
}
