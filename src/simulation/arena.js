const EPSILON = 1e-8;

export function createArena(apothem) {
  const planes = Array.from({ length: 8 }, (_, i) => {
    const angle = i * Math.PI / 4;
    return { x: Math.cos(angle), z: Math.sin(angle), distance: apothem };
  });
  const radius = apothem / Math.cos(Math.PI / 8);
  const vertices = Array.from({ length: 8 }, (_, i) => {
    const angle = (i + 0.5) * Math.PI / 4;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  });
  return { apothem, planes, vertices };
}

export function contains(arena, point, radius = 0) {
  return arena.planes.every(n => n.x * point.x + n.z * point.z <= n.distance - radius + EPSILON);
}

/** Continuous sweep of a disk inside a convex polygon; catches every wall at a corner. */
export function sweep(arena, point, delta, radius) {
  let time = 1;
  let normals = [];
  for (const n of arena.planes) {
    const outward = n.x * delta.x + n.z * delta.z;
    if (outward <= EPSILON) continue;
    const gap = n.distance - radius - n.x * point.x - n.z * point.z;
    const candidate = Math.max(0, gap / outward);
    if (candidate > 1 + EPSILON) continue;
    if (candidate < time - EPSILON) { time = candidate; normals = [n]; }
    else if (Math.abs(candidate - time) <= EPSILON) normals.push(n);
  }
  return { time: Math.min(1, time), normals, hit: normals.length > 0 };
}

export function moveDisk(arena, point, delta, radius, slide = true) {
  let position = { ...point };
  let remaining = { ...delta };
  let collided = false;
  // One wall can lead into an adjacent wall; iteration resolves that corner.
  for (let iteration = 0; iteration < 5; iteration++) {
    const contact = sweep(arena, position, remaining, radius);
    position.x += remaining.x * contact.time;
    position.z += remaining.z * contact.time;
    if (!contact.hit) break;
    collided = true;
    if (!slide) break;
    remaining = { x: remaining.x * (1 - contact.time), z: remaining.z * (1 - contact.time) };
    for (const n of contact.normals) {
      const outward = remaining.x * n.x + remaining.z * n.z;
      if (outward > 0) { remaining.x -= n.x * outward; remaining.z -= n.z * outward; }
    }
    if (Math.hypot(remaining.x, remaining.z) < EPSILON) break;
  }
  return { ...position, collided };
}
