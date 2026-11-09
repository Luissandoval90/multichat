// Sistema Avanzado de Text-to-Speech (Voz a Texto) por Plataforma, Filtros y Selección de Voz.

let ttsEnabled = false;
let ttsVolume = 0.85;
let ttsRate = 1.05;
let ttsIncludeNickname = true;
let ttsSkipUrls = true;
let selectedVoiceURI = '';
let synth = window.speechSynthesis || null;
let availableVoices = [];
const PIPER_VOICE = { voiceURI: 'piper:es_MX-claude-high', name: 'Claude · Español de México · Piper', lang: 'es-MX', localService: true };
let speechQueue = [], speechGeneration = 0, playingAudio = null, releaseAudio = null;

function cancelSpeech() {
  speechGeneration++;
  speechQueue = [];
  synth?.cancel();
  playingAudio?.pause();
  releaseAudio?.();
  playingAudio = null;
  releaseAudio = null;
  window.overlayAPI?.cancelSpeech?.();
}

function voiceStatus(message = '') {
  const status = document.getElementById('tts-status');
  if (status) status.textContent = message;
}

async function drainSpeech(generation) {
  while (generation === speechGeneration && speechQueue.length) {
    const job = speechQueue.shift();
    try {
      const result = await window.overlayAPI.synthesizeSpeech(job);
      if (generation !== speechGeneration) return;
      const audio = new Audio('data:audio/wav;base64,' + result.audio);
      playingAudio = audio;
      audio.volume = ttsVolume;
      await new Promise((resolve, reject) => {
        releaseAudio = resolve;
        audio.onended = resolve;
        audio.onerror = () => reject(new Error('No se pudo reproducir la voz.'));
        audio.play().catch(reject);
      });
      if (generation === speechGeneration) { playingAudio = null; releaseAudio = null; }
    } catch (error) {
      if (generation === speechGeneration) voiceStatus(error.message || 'No se pudo leer el mensaje.');
    }
  }
}

function speakText(text) {
  voiceStatus();
  if (selectedVoiceURI === PIPER_VOICE.voiceURI || !selectedVoiceURI) {
    if (!window.overlayAPI?.synthesizeSpeech) { voiceStatus('La voz Claude está disponible en la aplicación de escritorio.'); return; }
    // Keep a busy chat from accumulating minutes of delayed speech.
    if (speechQueue.length >= 10) return;
    const wasIdle = !playingAudio && speechQueue.length === 0 && !piperBusy;
    speechQueue.push({ text: text.slice(0, 400), voice: PIPER_VOICE.voiceURI, rate: ttsRate });
    if (wasIdle) {
      const generation = speechGeneration;
      piperBusy = true;
      drainSpeech(generation).finally(() => { if (generation === speechGeneration) piperBusy = false; });
    }
    return;
  }
  if (!synth) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-MX';
  utterance.volume = ttsVolume;
  utterance.rate = ttsRate;
  const voice = getSelectedVoice();
  if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
  synth.speak(utterance);
}
let piperBusy = false;

// Activación de TTS por plataforma individual
let ttsPlatforms = {
  tiktok: true,
  twitch: true,
  kick: true,
  youtube: true,
};

function initVoices(callback) {
  function load() {
    availableVoices = [PIPER_VOICE, ...(synth?.getVoices() || [])];
    if (callback && availableVoices.length > 0) {
      callback(availableVoices);
    }
  }

  load();
  if (synth && synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = load;
  }
}

function setTtsEnabled(enabled) {
  ttsEnabled = !!enabled;
  if (!ttsEnabled) { cancelSpeech(); piperBusy = false; }
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
  if (selectedVoiceURI !== uri) { cancelSpeech(); piperBusy = false; }
  selectedVoiceURI = uri || '';
}

function setTtsVolume(vol) {
  ttsVolume = Number.isFinite(Number(vol)) ? Math.max(0, Math.min(1, Number(vol))) : 0.85;
  if (playingAudio) playingAudio.volume = ttsVolume;
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
  cancelSpeech(); piperBusy = false;
  speakText(textToSpeak || 'Hola, soy Claude. Hablo español de México. ¡Bienvenidos al chat! ¿Qué canción quieren escuchar?');
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
  if (!ttsEnabled || !comment) return;

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
    speakText(textToRead);
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
