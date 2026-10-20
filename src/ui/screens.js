import { GAME } from '../config/gameplay.js';
import { RUN_TICKS, STAGES } from '../config/difficulty.js';
import { multiplier } from '../simulation/scoring.js';

export function createUI({ resume, pause, reset, getBest = () => ({ score: 0 }), getGraphics = () => null }) {
  const get = id => document.getElementById(id);
  const overlay = get('overlay'), title = get('overlay-title'), description = get('overlay-description');
  const resumeButton = get('resume'), pauseButton = get('pause'), resetButton = get('reset');
  const handlers = [[resumeButton, resume], [pauseButton, pause], [resetButton, reset]];
  handlers.forEach(([button, handler]) => button.addEventListener('click', handler));
  let previousMode = '';
  let feedbackUntil = -1;
  let loading = false;
  return {
    setLoading(value) { loading = value; resumeButton.disabled = value; if (!value) previousMode = ''; },
    reset() { feedbackUntil = -1; get('combat-feedback').textContent = ''; },
    consume(events) {
      for (const e of events) {
        const message = { perfect: '完美闪避 +25', graze: '擦弹 +10', pulseReady: '能量满载',
          pulse: '范围脉冲', damaged: '装甲受损', stage: `阶段 ${e.number} · ${e.name}` }[e.type];
        if (message) { get('combat-feedback').textContent = message; feedbackUntil = e.tick + 60; }
      }
    },
    update(session) {
      const running = session.mode === 'running';
      const finished = session.mode === 'defeated' || session.mode === 'victory';
      overlay.hidden = running;
      pauseButton.disabled = !running;
      resetButton.disabled = !running;
      if (session.mode !== previousMode) {
        previousMode = session.mode;
        if (!running) {
          title.textContent = session.mode === 'ready' ? '进入竞技场' : session.mode === 'victory' ? '挑战完成' : session.mode === 'defeated' ? '本局结束' : '对局已暂停';
          const reasons = { focus: '窗口已失焦。点击继续后重新进入训练。', performance: '检测到较长帧间隔，已暂停以避免跳过碰撞。你可以继续测试。', manual: '休息一下，准备好后继续。' };
          description.textContent = session.mode === 'ready' ? '撑过 180 秒与五个阶段。冲刺前 0.15 秒接触威胁可触发完美闪避；擦弹也可积能。100 能量自动释放范围脉冲。连续闪避和击杀提升计分倍率。' : finished ? `完美闪避 ${session.world.stats.perfect} 次 · 擦弹 ${session.world.stats.graze} 次 · 脉冲 ${session.world.stats.pulses} 次` : reasons[session.reason];
          resumeButton.textContent = session.mode === 'ready' ? '开始测试 ↗' : finished ? '重新训练 ↗' : '继续训练 ↗';
          get('result-summary').hidden = !finished;
          if (finished) {
            get('result-score').textContent = session.world.score.value.toLocaleString();
            get('result-best').textContent = getBest().score.toLocaleString();
            get('result-combo').textContent = session.world.score.bestCombo;
            get('result-time').textContent = `${(session.world.tick / 60).toFixed(1)}s`;
          }
          resumeButton.focus({ preventScroll: true });
        }
      }
      const p = session.world.player;
      if (loading && session.mode === 'ready') resumeButton.textContent = '正在准备场景…';
      const score = session.world.score;
      const remaining = Math.max(0, Math.ceil((RUN_TICKS - session.world.tick) / 60));
      get('score-value').textContent = score.value.toLocaleString();
      get('combo-value').textContent = `${score.combo} 连击 / ×${multiplier(score.combo).toFixed(1)}`;
      get('combo-fill').style.transform = `scaleX(${score.combo ? Math.max(0, (score.expiresAt - session.world.tick) / 180) : 0})`;
      get('time-value').textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
      get('stage-text').textContent = `阶段 ${session.world.stage + 1} / 5 · ${STAGES[session.world.stage].name}`;
      get('health').textContent = '◆'.repeat(p.hp) + '◇'.repeat(3 - p.hp);
      get('energy-value').textContent = `${p.energy} / 100`;
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
    dispose() { handlers.forEach(([button, handler]) => button.removeEventListener('click', handler)); },
  };
}
