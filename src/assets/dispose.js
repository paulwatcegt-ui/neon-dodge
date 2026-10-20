export function disposeObjects(roots) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), images = new Set();
  for (const root of roots) root.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) materials.add(m);
  });
  for (const m of materials) for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
  for (const t of textures) { if (t.image) images.add(t.image); t.dispose(); }
  for (const image of images) image.close?.();
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}
