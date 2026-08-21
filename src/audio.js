// Sistema de Alertas Sonoras mediante Web Audio API
// Incluye sonidos de seguidores, regalos y clips generados

let audioCtx = null;
let soundEnabled = true;
let soundVolume = 0.7;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function setSoundEnabled(enabled) {
  soundEnabled = !!enabled;
}

function setSoundVolume(vol) {
  soundVolume = Math.max(0, Math.min(1, Number(vol) || 0.7));
}

// Alerta de Nuevo Seguidor (Campanada suave)
function playFollowSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.4 * soundVolume, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.12);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.8);
  } catch (e) {
    console.warn('[Audio] Error reproduciendo follow sound:', e);
  }
}

// Alerta de Regalo / Donación (Fanfarria brillante)
function playGiftSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + (index * 0.08));

      gain.gain.setValueAtTime(0.01, now + (index * 0.08));
      gain.gain.linearRampToValueAtTime(0.35 * soundVolume, now + (index * 0.08) + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (index * 0.08) + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + (index * 0.08));
      osc.stop(now + (index * 0.08) + 0.55);
    });
  } catch (e) {
    console.warn('[Audio] Error reproduciendo gift sound:', e);
  }
}

// Alerta de Clip Grabado (Fanfarria cinemática)
function playClipSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const fanfareNotes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    fanfareNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + (idx * 0.09));

      gain.gain.setValueAtTime(0.01, now + (idx * 0.09));
      gain.gain.linearRampToValueAtTime(0.4 * soundVolume, now + (idx * 0.09) + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.09) + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + (idx * 0.09));
      osc.stop(now + (idx * 0.09) + 0.75);
    });
  } catch (e) {
    console.warn('[Audio] Error en clip sound:', e);
  }
}

window.AudioAlerts = {
  setSoundEnabled,
  setSoundVolume,
  playFollowSound,
  playGiftSound,
  playClipSound,
};
