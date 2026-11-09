const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { PiperService, VOICE_ID } = require('../src/piper');

test('Piper speaks through stdin, applies speed, returns WAV and removes temporary audio', async () => {
  let output, command, input;
  const service = new PiperService({ directory: path.join(__dirname, '../vendor/piper/piper'), spawn: (file, args, options) => {
    command = { file, args, options };
    output = args[args.indexOf('--output_file') + 1];
    const child = new EventEmitter(); child.stderr = new EventEmitter();
    child.stdin = new EventEmitter();
    child.stdin.end = text => { input = text; setImmediate(async () => {
      const wav = Buffer.alloc(100); wav.write('RIFF'); wav.write('WAVE', 8);
      await fs.writeFile(output, wav); child.emit('close', 0);
    }); };
    return child;
  }});
  const result = await service.synthesize({ text: '¡Hola México! " & |', voice: VOICE_ID, rate: 1.25 });
  assert.equal(input, '¡Hola México! " & |\n');
  assert.equal(command.options.shell, false);
  assert.equal(command.options.windowsHide, true);
  assert.equal(command.args[command.args.indexOf('--length_scale') + 1], '0.8');
  assert.equal(Buffer.from(result.audio, 'base64').toString('ascii', 0, 4), 'RIFF');
  await assert.rejects(fs.access(path.dirname(output)));
});

test('Piper cancellation kills active synthesis and rejects late output', async () => {
  let killed = false, started;
  const ready = new Promise(resolve => { started = resolve; });
  const service = new PiperService({ directory: os.tmpdir(), spawn: () => {
    const child = new EventEmitter(); child.stderr = new EventEmitter(); child.stdin = new EventEmitter();
    child.stdin.end = () => started();
    child.kill = () => { killed = true; setImmediate(() => child.emit('close', 1)); };
    return child;
  }});
  const result = service.synthesize({ text: 'Cancelar', voice: VOICE_ID });
  await ready; service.cancel();
  await assert.rejects(result, /cancelada/);
  assert.equal(killed, true);
});

test('Piper rejects unsupported voices and excessive text before launching a process', async () => {
  const service = new PiperService({ directory: os.tmpdir(), spawn: () => { throw new Error('must not spawn'); } });
  await assert.rejects(service.synthesize({ text: 'hola', voice: '../../other.exe' }), /voz/);
  await assert.rejects(service.synthesize({ text: 'a'.repeat(401), voice: VOICE_ID }), /texto/);
});
