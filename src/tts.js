// Sistema Avanzado de Text-to-Speech (Voz a Texto) por Plataforma, Filtros y Selección de Voz.

let ttsEnabled = false;
let ttsVolume = 0.85;
let ttsRate = 1.05;
let ttsIncludeNickname = true;
let ttsSkipUrls = true;
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

function setIncludeNickname(val) {
  ttsIncludeNickname = !!val;
}

function setSkipUrls(val) {
  ttsSkipUrls = !!val;
}

function getSelectedVoice() {
  if (!availableVoices || availableVoices.length === 0) {
    availableVoices = synth ? synth.getVoices() : [];
  }
  if (selectedVoiceURI) {
    const found = availableVoices.find(v => v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI);
    if (found) return found;
  }
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

function cleanCommentForTts(text) {
  if (!text) return '';
  let cleaned = text.trim();

  // Omitir enlaces web si está activado
  if (ttsSkipUrls) {
    cleaned = cleaned.replace(/https?:\/\/\S+/gi, 'enlace');
  }

  // Filtrar comandos de bots si empiezan con !, /, ., ?, #
  if (/^[!/.?#]/.test(cleaned)) return '';

  return cleaned;
}

function speakMessage({ nickname, comment, platform }) {
  if (!ttsEnabled || !synth || !comment) return;

  // Verificar si TTS está habilitado para esta plataforma
  if (platform && ttsPlatforms[platform] === false) {
    return;
  }

  const cleanComment = cleanCommentForTts(comment);
  if (!cleanComment) return;

  // Limitar longitud para evitar spam
  const truncated = cleanComment.length > 120 ? cleanComment.slice(0, 120) + '...' : cleanComment;
  const userNick = nickname || 'Usuario';
  const textToRead = ttsIncludeNickname ? `${userNick} dice: ${truncated}` : truncated;

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
  setIncludeNickname,
  setSkipUrls,
  testVoice,
  speakMessage,
  getAvailableVoices: () => availableVoices,
  getSelectedVoiceURI: () => selectedVoiceURI,
  getTtsPlatforms: () => ({ ...ttsPlatforms }),
};
