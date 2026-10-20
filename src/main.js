import './styles/layout.css';
import './styles/combat.css';
import './styles/main.css';
import './styles/presentation.css';
import './styles/survival.css';
import './styles/immersive.css';
import { createSession } from './core/session.js';
import { createClock } from './core/gameLoop.js';
import { createKeyboard } from './input/keyboard.js';
import { createView } from './rendering/renderer.js';
import { createUI } from './ui/screens.js';
import { createRecords } from './storage/records.js';
import { createAudio } from './audio/audio.js';
import { createSettings } from './ui/settings.js';
import { createRunIdentity } from './core/runIdentity.js';
import { createFullscreen } from './ui/fullscreen.js';

const session = createSession({ newRun: createRunIdentity });
const records = createRecords();
const audio = createAudio();
let recordedWorld = null;
let view, keyboard, clock, frameId, settings, fullscreen, prepared = false, disposed = false;
const ui = createUI({ resume, pause: () => pause('manual'), reset, selectMode,
  getBest: records.read, getRecords: records.list, getGraphics: () => view?.metrics() });
function selectMode(mode) {
  if (!session.setGameMode(mode)) return;
  recordedWorld = null; audio.silence(); view?.reset(); ui.reset(); keyboard?.clear(); clock?.reset(); ui.update(session);
}
function pause(reason) { session.pause(reason); audio.setPlaying(false); keyboard?.clear(); clock?.reset(); ui.update(session); }
function resume() { if (!prepared) return; if (session.mode === 'defeated') reset(); keyboard?.clear(); clock?.reset(); audio.unlock(); audio.setPlaying(true); session.start(); ui.update(session); }
function reset() { session.reset(); recordedWorld = null; audio.silence(); view?.reset(); ui.reset(); keyboard?.clear(); clock?.reset(); ui.update(session); }
function visibility() { if (document.hidden) pause('focus'); }

try {
  view = createView(document.getElementById('arena'), session.world.arena);
  settings = createSettings({ pause, view, audio });
  fullscreen = createFullscreen(document.getElementById('fullscreen'), pause);
  ui.setLoading(true);
  view.prepare(session.world).then(() => { if (!disposed) { prepared = true; ui.setLoading(false); } }).catch(error => { if (!disposed) { console.error(error); ui.error('场景初始化失败，请刷新或尝试支持 WebGL 2 的浏览器。'); } });
  keyboard = createKeyboard({ basis: view.basis, isRunning: () => session.mode === 'running',
    togglePause: () => { if (session.mode === 'running') pause('manual'); else resume(); },
    onBlur: () => pause('focus') });
  clock = createClock(() => {
    const running = session.step(keyboard.sample());
    if (session.world.outcome && recordedWorld !== session.world) { records.saveResult(session.world); recordedWorld = session.world; }
    view.consume(session.world.events); ui.consume(session.world.events);
    audio.consume(session.world.events);
    if (!running) keyboard.clear();
    return running;
  }, () => pause('performance'));
  document.addEventListener('visibilitychange', visibility);
  const draw = now => {
    const alpha = session.mode === 'running' ? clock.advance(now) : 1;
    if (prepared) view.render(session.world, session.mode === 'running' ? alpha : 1);
    ui.update(session);
    frameId = requestAnimationFrame(draw);
  };
  ui.update(session); frameId = requestAnimationFrame(draw);
  // Read-only diagnostic snapshot; no production cheats or setters.
  if (import.meta.env.DEV || new URLSearchParams(location.search).get('diagnostics') === '1') {
    Object.defineProperty(window, '__ND', { configurable: true, value: Object.freeze({
      graphics: () => view.metrics(),
      snapshot: () => structuredClone({ mode: session.mode, reason: session.reason,
        tick: session.world.tick, player: session.world.player, enemies: session.world.enemies,
        projectiles: session.world.projectiles, stats: session.world.stats,
        stage: session.world.stage, pattern: session.world.pattern, gameMode: session.world.gameMode,
        runId: session.world.runId, seed: session.world.seed, rulesVersion: session.world.rulesVersion,
        adaptive: session.world.adaptive, outcome: session.world.outcome, score: session.world.score }),
    }) });
  }
} catch (error) {
  console.error(error); ui.error('请使用支持 WebGL 2 的浏览器并启用硬件加速，然后刷新页面。');
}

function dispose() {
  disposed = true;
  cancelAnimationFrame(frameId); document.removeEventListener('visibilitychange', visibility);
  keyboard?.dispose(); settings?.dispose(); fullscreen?.dispose(); audio.dispose(); view?.dispose(); ui.dispose(); delete window.__ND;
}
if (import.meta.hot) import.meta.hot.dispose(dispose);
