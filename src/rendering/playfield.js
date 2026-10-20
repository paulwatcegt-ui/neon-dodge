/** Safe projection region within a full-window canvas, clear of the floating HUD. */
export function playfieldRect(width, height) {
  const narrow = width < 760;
  const rail = narrow ? 8 : 12;
  const top = narrow ? 156 : 112, bottom = narrow ? 126 : 78;
  return { x: rail, y: top, width: Math.max(1, width - rail * 2), height: Math.max(1, height - top - bottom) };
}
