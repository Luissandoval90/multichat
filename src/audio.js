// Sistema de Alertas Sonoras y Efectos de Sonido (!SFX) mediante Web Audio API

let audioCtx = null;
let soundEnabled = true;
let soundVolume = 0.7;

let sfxEnabled = true;
let sfxVolume = 0.75;
let lastSfxTime = 0;
const SFX_COOLDOWN_MS = 4000; // 4 segundos de cooldown anti-spam entre comandos

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

function setSfxEnabled(enabled) {
  sfxEnabled = !!enabled;
}

function setSfxVolume(vol) {
  sfxVolume = Math.max(0, Math.min(1, Number(vol) || 0.75));
}

// Alerta de Nuevo Seguidor (Campanada suave de bienvenida)
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

// ==========================================================================
// Sintetizadores de Efectos de Sonido para Comandos del Chat (!SFX)
// ==========================================================================

// !aplausos / !clap (Simulación de ovación con ruido modulado)
function playApplauseSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const duration = 2.2;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Ruido blanco con modulación aleatoria para simular palmadas
      const t = i / ctx.sampleRate;
      const envelope = Math.sin((t / duration) * Math.PI);
      const clapPulse = Math.random() > 0.85 ? 1.5 : 0.4;
      output[i] = (Math.random() * 2 - 1) * envelope * clapPulse;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.55 * sfxVolume, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);
  } catch (e) {
    console.warn('[Audio] Error en sfx aplausos:', e);
  }
}

// !risa / !jaja / !lol (Tonos oscilantes estilo caricatura)
function playLaughSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const bursts = [0, 0.22, 0.44, 0.66, 0.88];
    bursts.forEach((startOffset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const baseFreq = 380 + (i % 2 === 0 ? 60 : 0);
      osc.frequency.setValueAtTime(baseFreq, now + startOffset);
      osc.frequency.linearRampToValueAtTime(baseFreq - 80, now + startOffset + 0.16);

      gain.gain.setValueAtTime(0.01, now + startOffset);
      gain.gain.linearRampToValueAtTime(0.3 * sfxVolume, now + startOffset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + startOffset);
      osc.stop(now + startOffset + 0.2);
    });
  } catch (e) {
    console.warn('[Audio] Error en sfx risa:', e);
  }
}

// !gg (Acorde de victoria gamer C - G - C)
function playGgSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const chords = [
      { f: 523.25, t: 0 },    // C5
      { f: 659.25, t: 0.12 }, // E5
      { f: 783.99, t: 0.24 }, // G5
      { f: 1046.50, t: 0.36 },// C6
    ];

    chords.forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now + t);

      gain.gain.setValueAtTime(0.01, now + t);
      gain.gain.linearRampToValueAtTime(0.25 * sfxVolume, now + t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t);
      osc.stop(now + t + 0.65);
    });
  } catch (e) {
    console.warn('[Audio] Error en sfx GG:', e);
  }
}

// !airhorn / !corneta (Bocina clásica de stream)
function playAirhornSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const blasts = [0, 0.16, 0.32, 0.48];
    const freqs = [466.16, 523.25]; // Bb4, C5

    blasts.forEach((blastOffset) => {
      freqs.forEach(f => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now + blastOffset);
        osc.frequency.linearRampToValueAtTime(f - 15, now + blastOffset + 0.12);

        gain.gain.setValueAtTime(0.01, now + blastOffset);
        gain.gain.linearRampToValueAtTime(0.35 * sfxVolume, now + blastOffset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + blastOffset + 0.13);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + blastOffset);
        osc.stop(now + blastOffset + 0.15);
      });
    });
  } catch (e) {
    console.warn('[Audio] Error en sfx airhorn:', e);
  }
}

// !f / !rip (Tono melancólico/triste)
function playFSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.exponentialRampToValueAtTime(164.81, now + 1.2); // E3

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4 * sfxVolume, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.9);
  } catch (e) {
    console.warn('[Audio] Error en sfx F:', e);
  }
}

// !alerta / !atencion (Campanilla de aviso rápida)
function playAlertSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [1046.50, 1318.51].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + (idx * 0.1));

      gain.gain.setValueAtTime(0.01, now + (idx * 0.1));
      gain.gain.linearRampToValueAtTime(0.4 * sfxVolume, now + (idx * 0.1) + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.1) + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + (idx * 0.1));
      osc.stop(now + (idx * 0.1) + 0.45);
    });
  } catch (e) {
    console.warn('[Audio] Error en sfx alerta:', e);
  }
}

// Procesador de Comandos SFX desde el Chat con Cooldown
function processChatSfxCommand(commentText) {
  if (!sfxEnabled || !commentText) return false;

  const now = Date.now();
  if (now - lastSfxTime < SFX_COOLDOWN_MS) {
    return false; // Ignorar por cooldown anti-spam
  }

  const clean = commentText.trim().toLowerCase();

  if (/^!(aplauso|aplausos|clap|bravos?)\b/.test(clean)) {
    playApplauseSound();
    lastSfxTime = now;
    return true;
  }
  if (/^!(risa|risas|jaja|jajaja|lol|xd)\b/.test(clean)) {
    playLaughSound();
    lastSfxTime = now;
    return true;
  }
  if (/^!(gg|victoria|win|goodgame)\b/.test(clean)) {
    playGgSound();
    lastSfxTime = now;
    return true;
  }
  if (/^!(airhorn|corneta|bocina|fiesta)\b/.test(clean)) {
    playAirhornSound();
    lastSfxTime = now;
    return true;
  }
  if (/^!(f|rip|triste|sad)\b/.test(clean)) {
    playFSound();
    lastSfxTime = now;
    return true;
  }
  if (/^!(alerta|atencion|aviso|ding)\b/.test(clean)) {
    playAlertSound();
    lastSfxTime = now;
    return true;
  }

  return false;
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
  setSfxEnabled,
  setSfxVolume,
  processChatSfxCommand,
  playApplauseSound,
  playLaughSound,
  playGgSound,
  playAirhornSound,
  playFSound,
  playAlertSound,
};
