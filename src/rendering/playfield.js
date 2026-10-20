/** Reserved HUD rails keep the actual rendering viewport free of persistent controls. */
export function playfieldRect(width, height) {
  const narrow = width < 760;
  const rail = narrow ? 0 : width < 1100 ? 112 : 156;
  const top = narrow ? 146 : 58, bottom = narrow ? 126 : 78;
  return { x: rail, y: top, width: Math.max(1, width - rail * 2), height: Math.max(1, height - top - bottom) };
}
