/** Earliest segment/circle intersection, including an already overlapping start. */
export function circleEntry(x0, z0, x1, z1, radius) {
  const c = x0 * x0 + z0 * z0 - radius * radius;
  if (c <= 0) return 0;
  const dx = x1 - x0, dz = z1 - z0;
  const a = dx * dx + dz * dz;
  if (a < 1e-14) return null;
  const b = 2 * (x0 * dx + z0 * dz);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

export function relativePath(threat, player) {
  return [threat.previousX - player.previousX, threat.previousZ - player.previousZ,
    threat.x - player.x, threat.z - player.z];
}
