// Sistema de Text-to-Speech (Voz a Texto) usando Web Speech API nativa de Windows.

let ttsEnabled = false;
let ttsVolume = 0.8;
let synth = window.speechSynthesis || null;

function setTtsEnabled(enabled) {
  ttsEnabled = !!enabled;
  if (!ttsEnabled && synth) {
    synth.cancel();
  }
}

function setTtsVolume(vol) {
  ttsVolume = Math.max(0, Math.min(1, Number(vol) || 0.8));
}

function speakMessage({ nickname, comment, platform }) {
  if (!ttsEnabled || !synth || !comment) return;

  // Filtrar comandos de bots si empiezan con !, /, ., ?
  const cleanComment = comment.trim();
  if (/^[!/.?#]/.test(cleanComment)) return;

  // Limitar longitud para evitar spam
  const truncated = cleanComment.length > 140 ? cleanComment.slice(0, 140) + '...' : cleanComment;
  const textToRead = `${nickname} dice: ${truncated}`;

  try {
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.volume = ttsVolume;
    utterance.rate = 1.05; // Velocidad ligeramente ágil para directos

    const voices = synth.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es')) || voices[0];
    if (esVoice) utterance.voice = esVoice;

    synth.speak(utterance);
  } catch (err) {
    console.warn('[TTS] Error leyendo mensaje:', err);
  }
}

window.AppTTS = {
  setTtsEnabled,
  setTtsVolume,
  speakMessage,
};
