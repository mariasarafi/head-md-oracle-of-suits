/// lightweight WebAudio helper used by sketch.js
let audioCtx = null;

function _ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // resume on first user gesture if suspended
    if (audioCtx.state === 'suspended') {
      const resumeOnce = () => {
        audioCtx.resume().catch(()=>{});
        window.removeEventListener('pointerdown', resumeOnce);
        window.removeEventListener('keydown', resumeOnce);
      };
      window.addEventListener('pointerdown', resumeOnce, { once: true });
      window.addEventListener('keydown', resumeOnce, { once: true });
    }
  }
  return audioCtx;
}

function playBeep(freq = 880, duration = 0.12, type = 'sine') {
  try {
    const ctx = _ensureAudio();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.stop(now + duration + 0.02);
  } catch (e) {
    console.warn('playBeep failed:', e);
  }
}

