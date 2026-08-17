// Sistema Avanzado de Text-to-Speech (Voz a Texto) por Plataforma y Selección de Voz.

let ttsEnabled = false;
let ttsVolume = 0.85;
let ttsRate = 1.05;
let selectedVoiceURI = '';
let synth = window.speechSynthesis || null;
let availableVoices = [];

// Activación de TTS por plataforma individual
let ttsPlatforms = {
  tiktok: true,
  twitch: true,
  kick: true,
  youtube: true,
};

function initVoices(callback) {
  if (!synth) return;

  function load() {
    availableVoices = synth.getVoices() || [];
    if (callback && availableVoices.length > 0) {
      callback(availableVoices);
    }
  }

  load();
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = load;
  }
}

function setTtsEnabled(enabled) {
  ttsEnabled = !!enabled;
  if (!ttsEnabled && synth) {
    synth.cancel();
  }
}

function setPlatformTts(platform, enabled) {
  if (ttsPlatforms.hasOwnProperty(platform)) {
    ttsPlatforms[platform] = !!enabled;
  }
}

function setTtsPlatformsConfig(platformsConfig) {
  if (platformsConfig && typeof platformsConfig === 'object') {
    ttsPlatforms = { ...ttsPlatforms, ...platformsConfig };
  }
}

function setVoiceURI(uri) {
  selectedVoiceURI = uri || '';
}

function setTtsVolume(vol) {
  ttsVolume = Math.max(0, Math.min(1, Number(vol) || 0.85));
}

function setTtsRate(rate) {
  ttsRate = Math.max(0.5, Math.min(2.0, Number(rate) || 1.05));
}

function getSelectedVoice() {
  if (!availableVoices || availableVoices.length === 0) {
    availableVoices = synth ? synth.getVoices() : [];
  }
  if (selectedVoiceURI) {
    const found = availableVoices.find(v => v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI);
    if (found) return found;
  }
  // Fallback a voz en español si existe
  const esVoice = availableVoices.find(v => v.lang.startsWith('es'));
  return esVoice || availableVoices[0] || null;
}

function testVoice(textToSpeak) {
  if (!synth) return;
  synth.cancel();

  const text = textToSpeak || 'Hola, esta es una prueba de voz para tu chat en vivo.';
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = ttsVolume;
  utterance.rate = ttsRate;

  const voice = getSelectedVoice();
  if (voice) utterance.voice = voice;

  synth.speak(utterance);
}

function speakMessage({ nickname, comment, platform }) {
  if (!ttsEnabled || !synth || !comment) return;

  // Verificar si TTS está habilitado para esta plataforma específica
  if (platform && ttsPlatforms[platform] === false) {
    return;
  }

  // Filtrar comandos de bots si empiezan con !, /, ., ?, #
  const cleanComment = comment.trim();
  if (/^[!/.?#]/.test(cleanComment)) return;

  // Limitar longitud para evitar spam
  const truncated = cleanComment.length > 130 ? cleanComment.slice(0, 130) + '...' : cleanComment;
  const textToRead = `${nickname} dice: ${truncated}`;

  try {
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.volume = ttsVolume;
    utterance.rate = ttsRate;

    const voice = getSelectedVoice();
    if (voice) utterance.voice = voice;

    synth.speak(utterance);
  } catch (err) {
    console.warn('[TTS] Error leyendo mensaje:', err);
  }
}

window.AppTTS = {
  initVoices,
  setTtsEnabled,
  setPlatformTts,
  setTtsPlatformsConfig,
  setVoiceURI,
  setTtsVolume,
  setTtsRate,
  testVoice,
  speakMessage,
  getAvailableVoices: () => availableVoices,
  getSelectedVoiceURI: () => selectedVoiceURI,
  getTtsPlatforms: () => ({ ...ttsPlatforms }),
};
