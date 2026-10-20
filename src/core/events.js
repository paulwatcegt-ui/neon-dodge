/** Events live for one simulation step; the host consumes them before the next step. */
export function emit(world, type, data = {}) {
  world.events.push({ ...data, type, tick: world.tick, id: world.nextEventId++ });
}
