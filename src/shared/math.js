export function normalize(x, z) {
  const length = Math.hypot(x, z);
  return length > 1e-9 ? { x: x / length, z: z / length } : { x: 0, z: 0 };
}

/** Input axes: positive horizontal = screen right; positive vertical = screen up. */
export function screenToWorld(horizontal, vertical, basis) {
  return normalize(
    basis.right.x * horizontal + basis.forward.x * vertical,
    basis.right.z * horizontal + basis.forward.z * vertical,
  );
}

export function groundBasis(direction) {
  const forward = normalize(direction.x, direction.z);
  if (Math.hypot(forward.x, forward.z) < 0.5) throw new Error('Camera must look across the ground');
  return { forward, right: { x: -forward.z, z: forward.x } };
}
