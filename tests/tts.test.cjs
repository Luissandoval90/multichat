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
test('bot messages are silent by default while human moderators are still read', async () => {
  const f = setup(async () => ({ audio: 'UklGRg==' }));
  f.tts.setTtsEnabled(true);
  for (const nickname of ['Nightbot', '@StreamElements', 'STREAMLABS', 'Moobot', 'BotRix']) f.tts.speakMessage({ nickname, comment: 'Síguenos en redes', platform: 'twitch' });
  f.tts.speakMessage({ nickname: 'Automatico', comment: 'Aviso', isBot: true, platform: 'kick' });
  assert.equal(f.calls.length, 0, 'Bot announcements must not reach synthesis');
  f.tts.speakMessage({ nickname: 'Ana', comment: 'Hola', isModerator: true, platform: 'twitch' });
  await flush(); assert.equal(f.calls[0].text, 'Ana dice: Hola');
  f.tts.setTtsEnabled(false);
});
test('custom bots can be muted by login and bot filtering can be disabled', async () => {
  const f = setup(async () => ({ audio: 'UklGRg==' }));
  assert.equal(typeof f.tts.setBotNames, 'function');
  f.tts.setBotNames('@mi_bot, avisos_del_canal, Bot del canal'); f.tts.setTtsEnabled(true);
  f.tts.speakMessage({ nickname: 'Nombre visible', username: 'MI_BOT', comment: 'Aviso', platform: 'twitch' });
  f.tts.speakMessage({ nickname: 'avisos_del_canal', comment: 'Aviso', platform: 'youtube' });
  f.tts.speakMessage({ nickname: 'Bot del canal', comment: 'Aviso', platform: 'youtube' });
  assert.equal(f.calls.length, 0);
  f.tts.setSkipBots(false);
  f.tts.speakMessage({ nickname: 'Nightbot', comment: 'Permitido', platform: 'twitch' });
  await flush(); assert.equal(f.calls[0].text, 'Nightbot dice: Permitido');
  f.tts.setTtsEnabled(false);
});
test('the username switch affects speech immediately and discards queued old formatting', async () => {
  const f = setup(async () => ({ audio: 'UklGRg==' }));
  f.tts.setTtsEnabled(true); f.tts.setIncludeNickname(false);
  f.tts.speakMessage({ nickname: 'Ana', comment: 'Solo el mensaje', platform: 'tiktok' });
  f.tts.speakMessage({ nickname: 'Luis', comment: 'Pendiente', platform: 'tiktok' });
  await flush(); assert.equal(f.calls[0].text, 'Solo el mensaje');
  f.tts.setIncludeNickname(true);
  f.tts.speakMessage({ nickname: 'Ana', comment: 'Con nombre', platform: 'tiktok' });
  await flush();
  assert.equal(f.calls[1].text, 'Ana dice: Con nombre');
  assert.equal(f.calls.length, 2);
  f.tts.setTtsEnabled(false);
});
test('Twitch emote names are removed by their ranges while Spanish text is preserved', async () => {
  const f = setup(async () => ({ audio: 'UklGRg==' }));
  f.tts.setTtsEnabled(true); f.tts.setIncludeNickname(false);
  const comment = 'Hola Kappa, qué tal LUL amigos';
  f.tts.speakMessage({ nickname:'Ana', comment, platform:'twitch', emotes:[{index:comment.indexOf('Kappa'),length:5},{index:comment.indexOf('LUL'),length:3}] });
  await flush(); assert.equal(f.calls[0].text, 'Hola, qué tal amigos');
  f.tts.setTtsEnabled(false);
});
test('emoji-only and emote-only messages never produce speech or a spoken nickname', async () => {
  const f = setup(async () => ({ audio: 'UklGRg==' })); f.tts.setTtsEnabled(true);
  for (const comment of ['😂😂','👨‍👩‍👧‍👦 ❤️ 🇵🇪','👍🏽 1️⃣','!!! :)']) f.tts.speakMessage({ nickname:'Ana', comment, platform:'tiktok' });
  f.tts.speakMessage({ nickname:'Ana', comment:'Kappa', platform:'twitch', emotes:[{index:0,length:5}] });
  f.tts.speakMessage({ nickname:'Ana', comment:'customEmote', platform:'twitch', isEmoteOnly:true });
  assert.equal(f.calls.length, 0);
});
test('mixed emojis are silent without removing numbers, accents or user text', async () => {
  const f = setup(async () => ({ audio: 'UklGRg==' })); f.tts.setTtsEnabled(true); f.tts.setIncludeNickname(false);
  f.tts.speakMessage({ comment:'¡Qué día! 🔥 Somos 123, a las 20:30 👍🏽. Precio: 12,50 € 🇲🇽', platform:'youtube' });
  await flush(); assert.equal(f.calls[0].text, '¡Qué día! Somos 123, a las 20:30. Precio: 12,50 €');
  f.tts.setTtsEnabled(false);
});
test('inserted image emotes with no text length do not delete neighboring words', async () => {
  const f = setup(async () => ({ audio: 'UklGRg==' })); f.tts.setTtsEnabled(true); f.tts.setIncludeNickname(false);
  f.tts.speakMessage({ comment:'Hola mundo', platform:'kick', emotes:[{index:5,url:'https://native.example/emote.webp'},{index:-3,length:4},{index:99,length:5}] });
  await flush(); assert.equal(f.calls[0].text, 'Hola mundo'); f.tts.setTtsEnabled(false);
});
test('emojis in a displayed username are also omitted when username reading is enabled', async () => {
  const f = setup(async () => ({ audio: 'UklGRg==' })); f.tts.setTtsEnabled(true);
  f.tts.speakMessage({ nickname:'Ana 💜', comment:'Hola 😀 amigos', platform:'tiktok' });
  await flush(); assert.equal(f.calls[0].text, 'Ana dice: Hola amigos'); f.tts.setTtsEnabled(false);
});
