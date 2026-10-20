const NOTES = { dash: [180, 420, 0.12], perfect: [660, 1320, 0.22], graze: [820, 1000, 0.06],
  pulse: [170, 45, 0.35], damaged: [120, 50, 0.15], victory: [660, 990, 0.4], defeated: [220, 55, 0.5] };
export function createAudio() {
  let context = null, enabled = true, playing = false, disposed = false, lastTick = -1, tickNotes = 0;
  const voices = new Set();
  return {
    unlock() {
      if (disposed || !enabled) return;
      try {
        context ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
        context.resume().catch(() => {});
      } catch { /* Audio is optional; the game remains playable. */ }
    },
    setEnabled(value) { enabled = value; if (!value) this.silence(); else this.unlock(); },
    setPlaying(value) { playing = value; if (!value) this.silence(); },
    consume(events) {
      if (!playing || !enabled || context?.state !== 'running') return;
      for (const e of events) {
        const note = NOTES[e.type]; if (!note) continue;
        if (e.tick !== lastTick) { lastTick = e.tick; tickNotes = 0; }
        if (tickNotes++ >= 3 || voices.size >= 12) continue;
        const [start, end, duration] = note, oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = e.type === 'pulse' || e.type === 'damaged' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(start, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(end, context.currentTime + duration);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
        oscillator.connect(gain); gain.connect(context.destination); voices.add(oscillator);
        oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(); oscillator.stop(context.currentTime + duration);
      }
    },
    silence() { for (const voice of voices) { try { voice.stop(); } catch {} } voices.clear(); },
    dispose() { disposed = true; this.silence(); context?.close().catch(() => {}); },
  };
}
