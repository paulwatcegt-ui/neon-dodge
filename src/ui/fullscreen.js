export function createFullscreen(button, pause, target = document.documentElement) {
  let disposed = false;
  function sync() {
    const active = Boolean(document.fullscreenElement);
    button.textContent = active ? '退出全屏' : '全屏';
    button.setAttribute('aria-pressed', String(active));
  }
  async function toggle() {
    pause('manual');
    try {
      if (document.fullscreenElement) await document.exitFullscreen(); else await target.requestFullscreen();
      if (!disposed) { button.title = ''; sync(); }
    } catch { if (!disposed) button.title = '浏览器未允许全屏，可稍后重试'; }
  }
  if (!target.requestFullscreen || !document.fullscreenEnabled) { button.disabled = true; button.title = '浏览器不支持全屏'; }
  button.addEventListener('click', toggle); document.addEventListener('fullscreenchange', sync); sync();
  return { dispose() { disposed = true; button.removeEventListener('click', toggle); document.removeEventListener('fullscreenchange', sync); } };
}
