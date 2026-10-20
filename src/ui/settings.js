import { MAX_GLB_BYTES } from '../assets/glbValidation.js';
export function createSettings({ pause, view, audio }) {
  const get = id => document.getElementById(id), panel = get('settings');
  const file = get('model-file'), status = get('model-status'), sound = get('sound-toggle');
  let generation = 0, disposed = false, soundEnabled = true;
  const listeners = [];
  function on(element, type, fn) { element.addEventListener(type, fn); listeners.push(() => element.removeEventListener(type, fn)); }
  on(panel, 'toggle', () => { if (panel.open) pause('manual'); });
  on(panel, 'keydown', e => { if (e.code === 'Escape') { panel.open = false; e.stopPropagation(); } });
  on(get('quality'), 'change', e => { pause('manual'); view.setQuality(e.target.value); });
  on(get('reduced-motion'), 'change', e => view.setReducedMotion(e.target.checked));
  get('reduced-motion').checked = matchMedia('(prefers-reduced-motion: reduce)').matches;
  view.setReducedMotion(get('reduced-motion').checked);
  on(sound, 'click', () => { soundEnabled = !soundEnabled; audio.setEnabled(soundEnabled);
    sound.textContent = soundEnabled ? '音效：开' : '音效：关'; sound.setAttribute('aria-pressed', String(soundEnabled)); });
  on(get('model-rotation'), 'change', e => view.rotateAsset(Number(e.target.value) * Math.PI / 180));
  on(get('model-reset'), 'click', () => {
    generation++; view.setAsset(null); file.value = ''; get('model-rotation').value = '0'; status.textContent = '临时机械体 T-00 · 尚未导入 ND-01';
  });
  on(file, 'change', async () => {
    const selected = file.files[0]; if (!selected) return;
    pause('manual'); const token = ++generation;
    status.textContent = '正在检查并加载模型…';
    try {
      if (!/\.glb$/i.test(selected.name)) throw Error('请选择 .glb 单文件模型。');
      if (selected.size > MAX_GLB_BYTES) throw Error('模型超过 30 MB，请先优化。');
      const { loadCharacter } = await import('../assets/assetLoader.js');
      const asset = await loadCharacter(await selected.arrayBuffer());
      if (disposed || token !== generation) { asset.dispose(); return; }
      view.setAsset(asset); get('model-rotation').value = '0';
      await view.prepare();
      if (disposed || token !== generation) return;
      const p = asset.profile;
      status.textContent = `${selected.name} · ${p.triangles.toLocaleString()} 三角面 / ${p.materials} 材质 / ${p.bones} 骨骼。` +
        (p.missing.length ? ` 缺少动画：${p.missing.join('、')}。` : ' 五种动作已识别。') +
        (p.triangles > 100000 || p.materials > 16 ? ' 建议进一步优化模型预算。' : '') + ' 模型朝向不正确时可调整下方选项。';
    } catch (error) { if (!disposed && token === generation) status.textContent = `导入失败：${error.message} 当前角色保持不变。`; }
  });
  return { dispose() { disposed = true; generation++; listeners.forEach(remove => remove()); } };
}
