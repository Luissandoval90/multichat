// Sistema Avanzado de Text-to-Speech (Voz a Texto) por Plataforma, Filtros y Selección de Voz.

let ttsEnabled = false;
let ttsVolume = 0.85;
let ttsRate = 1.05;
let ttsIncludeNickname = true;
let ttsSkipUrls = true;
let ttsSkipBots = true;
const commonBotNames = new Set(['nightbot', 'streamelements', 'streamlabs', 'moobot', 'fossabot', 'wizebot', 'botrix']);
let customBotNames = new Set();

function normalizeBotName(value) {
  return String(value || '').normalize('NFKC').trim().replace(/^@/, '').toLowerCase();
}

function setSkipBots(value) {
  const next = value !== false;
  if (next !== ttsSkipBots) { cancelSpeech(); piperBusy = false; }
  ttsSkipBots = next;
}

function setBotNames(value) {
  const names = (Array.isArray(value) ? value : String(value || '').slice(0, 2000).split(/[,;\r\n]+/)).slice(0, 100).map(normalizeBotName).filter(Boolean);
  const next = new Set(names);
  if ([...next].sort().join(',') !== [...customBotNames].sort().join(',')) { cancelSpeech(); piperBusy = false; }
  customBotNames = next;
}

function isBotMessage(data) {
  if (!ttsSkipBots) return false;
  if (data.isBot === true) return true;
  return [data.username, data.login, data.userLogin, data.userId, data.nickname].some(value => {
    const name = normalizeBotName(value);
    return commonBotNames.has(name) || customBotNames.has(name);
  });
}
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
  if (ttsIncludeNickname !== !!val) { cancelSpeech(); piperBusy = false; }
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

const speechGraphemes = new Intl.Segmenter('es', { granularity: 'grapheme' });
const emojiGrapheme = /[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Presentation}\u20e3]/u;

function removeSpeechEmojis(text) {
  return Array.from(speechGraphemes.segment(String(text || '')), ({ segment }) =>
    emojiGrapheme.test(segment) ? ' ' : segment
  ).join('').replace(/\s+/g, ' ').trim();
}

function cleanCommentForTts(text, emotes) {
  if (!text) return '';
  let cleaned = String(text);
  // Only text-replacing emotes have a length. Image insertions must keep adjacent text.
  const ranges = (Array.isArray(emotes) ? emotes : []).slice(0, 100)
    .filter(e => e && Number.isInteger(e.index) && Number.isInteger(e.length) &&
      e.index >= 0 && e.length > 0 && e.index + e.length <= cleaned.length)
    .sort((a, b) => a.index - b.index);
  let cursor = 0;
  let plain = '';
  for (const range of ranges) {
    if (range.index > cursor) plain += cleaned.slice(cursor, range.index);
    plain += ' ';
    cursor = Math.max(cursor, range.index + range.length);
  }
  cleaned = removeSpeechEmojis(plain + cleaned.slice(cursor)).replace(/ +([,.;:!?])/g, '$1');

  // Omitir enlaces web si está activado
  if (ttsSkipUrls) {
    cleaned = cleaned.replace(/https?:\/\/\S+/gi, 'enlace');
  }

  // Filtrar comandos de bots si empiezan con !, /, ., ?, #
  if (/^[!/.?#]/.test(cleaned)) return '';

  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : '';
}

function speakMessage(data = {}) {
  const { nickname, comment, platform } = data;
  if (!ttsEnabled || !comment || data.isEmoteOnly === true || isBotMessage(data)) return;

  // Verificar si TTS está habilitado para esta plataforma
  if (platform && ttsPlatforms[platform] === false) {
    return;
  }

  const cleanComment = cleanCommentForTts(comment, data.emotes);
  if (!cleanComment) return;

  // Limitar longitud para evitar spam
  const truncated = cleanComment.length > 120 ? cleanComment.slice(0, 120) + '...' : cleanComment;
  const userNick = removeSpeechEmojis(nickname) || 'Usuario';
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
  setSkipBots,
  setBotNames,
  setSkipUrls,
  testVoice,
  speakMessage,
  getAvailableVoices: () => availableVoices,
  getSelectedVoiceURI: () => selectedVoiceURI,
  getTtsPlatforms: () => ({ ...ttsPlatforms }),
};
