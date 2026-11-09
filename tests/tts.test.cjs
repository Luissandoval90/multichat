const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(synthesize) {
  const calls = [], audio = [], status = { textContent: '' };
  const synth = { getVoices: () => [], cancel: () => {}, speak: () => { throw new Error('Piper must not use the Windows voice'); }, onvoiceschanged: null };
  const context = { console, document: { getElementById: () => status }, Audio: function(src) {
    this.src = src; this.pause = () => {}; this.play = async () => {}; audio.push(this);
  }, window: { speechSynthesis: synth, overlayAPI: { synthesizeSpeech: data => { calls.push(data); return synthesize(data); }, cancelSpeech: () => {} } } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/tts.js'), 'utf8'), context);
  return { tts: context.window.AppTTS, calls, audio, status };
}
test('Claude is available without Windows voices and reads Spanish chat in order', async () => {
  const f = setup(async () => ({ audio: 'UklGRg==' }));
  f.tts.initVoices(() => {});
  assert.equal(f.tts.getAvailableVoices().some(v => v.voiceURI === 'piper:es_MX-claude-high' && v.lang === 'es-MX'), true);
  f.tts.setVoiceURI('piper:es_MX-claude-high'); f.tts.setTtsEnabled(true);
  f.tts.speakMessage({ nickname: 'Luis', comment: '¡Qué canción tan buena!', platform: 'tiktok' });
  f.tts.speakMessage({ nickname: 'Ana', comment: 'Gracias', platform: 'twitch' });
  await flush(); assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].text, 'Luis dice: ¡Qué canción tan buena!');
  f.audio[0].onended(); await flush();
  assert.equal(f.calls[1].text, 'Ana dice: Gracias');
  f.tts.setTtsEnabled(false);
});
test('disabling speech discards pending synthesis and respects platform filters', async () => {
  let finish;
  const f = setup(() => new Promise(resolve => { finish = resolve; }));
  f.tts.setVoiceURI('piper:es_MX-claude-high'); f.tts.setTtsEnabled(true);
  f.tts.setPlatformTts('twitch', false);
  f.tts.speakMessage({ comment: 'omitido', platform: 'twitch' });
  f.tts.speakMessage({ comment: '!comando', platform: 'tiktok' });
  assert.equal(f.calls.length, 0);
  f.tts.speakMessage({ comment: 'Hola', platform: 'tiktok' });
  f.tts.setTtsEnabled(false); finish({ audio: 'UklGRg==' }); await flush();
  assert.equal(f.audio.length, 0);
});
test('zero volume stays muted for Piper playback', async () => {
  const f = setup(async () => ({ audio: 'UklGRg==' }));
  f.tts.setVoiceURI('piper:es_MX-claude-high');
  f.tts.setTtsVolume(0); f.tts.testVoice('Hola');
  await flush(); assert.equal(f.audio[0].volume, 0);
  f.tts.setTtsEnabled(false);
});
