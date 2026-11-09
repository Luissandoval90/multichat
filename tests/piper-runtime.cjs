const { PiperService, VOICE_ID } = require('../src/piper');
const path = require('node:path');
const assert = require('node:assert/strict');
const directory = path.resolve(process.argv[2] || path.join(__dirname, '../vendor/piper/piper'));
(async () => {
  const piper = new PiperService({ directory });
  const result = await piper.synthesize({ voice: VOICE_ID, text: '¡Hola! ¿Qué canción quieres escuchar? Hablo español de México.', rate: 1.05 });
  const wav = Buffer.from(result.audio, 'base64');
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.ok(wav.length > 10000);
  console.log(`PASS: bundled Claude produces Spanish PCM WAV offline (${wav.length} bytes)`);
})().catch(error => { console.error(error); process.exitCode = 1; });
