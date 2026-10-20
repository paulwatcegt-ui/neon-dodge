import { GAME } from '../config/gameplay.js';
import { STAGES, PATTERNS, MODE_NAMES, RULES_VERSION } from '../config/difficulty.js';
import { multiplier } from '../simulation/scoring.js';
import { PRESSURE_NAMES } from '../simulation/adaptiveDifficulty.js';

export function createUI({ resume, pause, reset, selectMode = () => {}, getBest = () => ({ score: 0 }), getRecords = () => [], getGraphics = () => null }) {
  const get = id => document.getElementById(id);
  const overlay = get('overlay'), title = get('overlay-title'), description = get('overlay-description');
  const resumeButton = get('resume'), pauseButton = get('pause'), resetButton = get('reset');
  const handlers = [[resumeButton, resume], [pauseButton, pause], [resetButton, reset]];
  handlers.forEach(([button, handler]) => button.addEventListener('click', handler));
  const modeSelect = get('game-mode');
  const changeMode = () => selectMode(modeSelect.value);
  modeSelect.addEventListener('change', changeMode);
  let previousMode = '';
  let feedbackUntil = -1;
  let loading = false;
  return {
    setLoading(value) { loading = value; resumeButton.disabled = value; if (!value) previousMode = ''; },
    reset() { previousMode = ''; feedbackUntil = -1; get('combat-feedback').textContent = ''; },
    consume(events) {
      for (const e of events) {
        const message = { perfect: '完美闪避 +25', graze: '擦弹 +10', pulseReady: '能量满载',
          pulse: '防御脉冲 · 瘫痪 1.5s', pulseDenied: '能量不足 · 需要 100', damaged: '装甲受损', stage: `阶段 ${e.number} · ${e.name}`, pattern: `战术切换 · ${e.name}` }[e.type];
        if (message) { get('combat-feedback').textContent = message; feedbackUntil = e.tick + 60; }
      }
    },
    update(session) {
      const running = session.mode === 'running';
      const finished = session.mode === 'defeated';
      const gameMode = session.world.gameMode;
      modeSelect.disabled = !['ready', 'defeated'].includes(session.mode);
      modeSelect.value = gameMode;
      overlay.hidden = running;
      pauseButton.disabled = !running;
      resetButton.disabled = !running;
      if (session.mode !== previousMode) {
        previousMode = session.mode;
        if (!running) {
          title.textContent = session.mode === 'ready' ? '进入竞技场' : session.mode === 'defeated' ? '本局结束' : '对局已暂停';
          const reasons = { focus: '窗口已失焦。点击继续后重新进入训练。', performance: '检测到较长帧间隔，已暂停以避免跳过碰撞。你可以继续测试。', manual: '休息一下，准备好后继续。' };
          description.textContent = session.mode === 'ready' ? '无限生存，八种敌人逐步解锁。WASD 移动，Space 冲刺；0.15 秒完美闪避积能，满 100 后按 E 清弹并瘫痪范围内敌人 1.5 秒。脉冲不造成击杀。标准与练习成绩独立。' : finished ? `完美闪避 ${session.world.stats.perfect} 次 · 擦弹 ${session.world.stats.graze} 次 · 脉冲 ${session.world.stats.pulses} 次` : reasons[session.reason];
          resumeButton.textContent = session.mode === 'ready' ? '开始测试 ↗' : finished ? '重新训练 ↗' : '继续训练 ↗';
          get('result-summary').hidden = !finished;
          if (finished) {
            get('result-score').textContent = session.world.score.value.toLocaleString();
            get('result-best').textContent = getBest(gameMode).score.toLocaleString();
            get('result-combo').textContent = session.world.score.bestCombo;
            get('result-time').textContent = `${(session.world.tick / 60).toFixed(1)}s`;
            get('result-perfect').textContent = session.world.stats.perfect;
          }
          get('board-title').textContent = `${MODE_NAMES[gameMode]} · 本机前 10`;
          get('board-version').textContent = `${RULES_VERSION} · 本地记录，不上传`;
          const rows = getRecords(gameMode);
          get('local-records').replaceChildren(...rows.map((r, i) => {
            const row = document.createElement('li');
            row.textContent = `${i + 1}. ${r.score.toLocaleString()} 分 · ${Math.floor(r.survivalSeconds / 60)}:${String(Math.floor(r.survivalSeconds % 60)).padStart(2, '0')} · 完美 ${r.perfectDodges} · 连击 ${r.maxCombo}`;
            return row;
          }));
          get('board-empty').hidden = rows.length > 0;
          resumeButton.focus({ preventScroll: true });
        }
      }
      const p = session.world.player;
      if (loading && session.mode === 'ready') resumeButton.textContent = '正在准备场景…';
      const score = session.world.score;
      const elapsed = Math.floor(session.world.tick / 60);
      get('score-value').textContent = score.value.toLocaleString();
      get('combo-value').textContent = `${score.combo} 连击 / ×${multiplier(score.combo).toFixed(1)}`;
      get('combo-fill').style.transform = `scaleX(${score.combo ? Math.max(0, (score.expiresAt - session.world.tick) / 180) : 0})`;
      get('time-value').textContent = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
      get('stage-text').textContent = `阶段 ${session.world.stage + 1} / ${STAGES.length} · ${STAGES[session.world.stage].name}`;
      get('pressure-text').textContent = `${MODE_NAMES[gameMode]} · ${gameMode === 'standard' ? '固定规则' : PRESSURE_NAMES[session.world.adaptive.mode]}` + (session.world.pattern >= 0 ? ` · ${PATTERNS[session.world.pattern].name}` : '');
      get('health').textContent = '◆'.repeat(p.hp) + '◇'.repeat(3 - p.hp);
      get('energy-value').textContent = `${p.energy} / 100`;
      get('pulse-hint').textContent=p.energy>=100?'E · 释放脉冲 / 4m':'E · 需要 100 能量';
      get('pulse-hint').parentElement.classList.toggle('is-ready',p.energy>=100);
      get('energy-fill').style.transform = `scaleX(${p.energy / 100})`;
      get('combat-stats').textContent = `完美 ${session.world.stats.perfect} · 擦弹 ${session.world.stats.graze} · 脉冲 ${session.world.stats.pulses}`;
      if (session.world.tick > feedbackUntil) get('combat-feedback').textContent = '';
      get('dash-label').textContent = p.dashRemaining > 0 ? '冲刺中 / DASH' : p.cooldown > 0 ? `${(p.cooldown / 60).toFixed(1)}s / 充能中` : '就绪 / READY';
      get('dash-fill').style.transform = `scaleX(${1 - p.cooldown / GAME.dashCooldownTicks})`;
      get('telemetry').textContent = `X ${p.x.toFixed(2)} / Z ${p.z.toFixed(2)}\nTICK ${session.world.tick} / SIM 60Hz\n${session.mode.toUpperCase()}`;
      const graphics = getGraphics();
      if (graphics && get('telemetry').parentElement.open) get('telemetry').textContent += `\nDRAW ${graphics.calls} / TRIS ${graphics.triangles}\nGEO ${graphics.geometries} / TEX ${graphics.textures}`;
    },
    error(message) {
      overlay.hidden = false; title.textContent = '无法启动训练场'; description.textContent = message;
      resumeButton.hidden = true; pauseButton.disabled = true; resetButton.disabled = true;
    },
    dispose() { handlers.forEach(([button, handler]) => button.removeEventListener('click', handler)); modeSelect.removeEventListener('change', changeMode); },
  };
}
