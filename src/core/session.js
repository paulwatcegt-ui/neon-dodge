import { createWorld, stepWorld } from '../simulation/world.js';

export function createSession() {
  return {
    mode: 'ready', reason: '', world: createWorld(),
    start() { if (this.world.player.hp > 0 && !this.world.outcome) { this.mode = 'running'; this.reason = ''; } },
    pause(reason = 'manual') { if (this.mode === 'running') { this.mode = 'paused'; this.reason = reason; } },
    reset() { this.world = createWorld(); },
    step(command) {
      if (this.mode !== 'running') return false;
      stepWorld(this.world, command);
      if (this.world.player.hp <= 0) { this.mode = 'defeated'; return false; }
      if (this.world.outcome === 'victory') { this.mode = 'victory'; return false; }
      return true;
    },
  };
}
