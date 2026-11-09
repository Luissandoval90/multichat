// Reproducible Windows assets; no downloads are needed by the installed app.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');
const { createWriteStream } = require('node:fs');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'vendor/piper');
const voiceBase = 'https://huggingface.co/rhasspy/piper-voices/resolve/e7229f7d33a10e145e109b886d661984201ac3c4/es/es_MX/claude/high';
const hash = async file => createHash('sha256').update(await fs.readFile(file)).digest('hex');
async function download(url, file, expected) {
  if (expected && await hash(file).catch(() => '') === expected) return;
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const partial = file + '.partial';
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
  if (expected && await hash(partial) !== expected) throw new Error('Piper asset checksum mismatch');
  await fs.rename(partial, file);
}
async function prepare() {
  await fs.mkdir(destination, { recursive: true });
  const zip = path.join(destination, 'piper_windows_amd64.zip');
  await download('https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip', zip, 'f3c58906402b24f3a96d92145f58acba6d86c9b5db896d207f78dc80811efcea');
  await promisify(execFile)('tar.exe', ['-xf', zip, '-C', destination], { windowsHide: true });
  const assets = path.join(destination, 'piper');
  await download(`${voiceBase}/es_MX-claude-high.onnx`, path.join(assets, 'es_MX-claude-high.onnx'), '3ef40a71ea63852cd8ab7e6fa7d2ecdcfa67a0b47c9c48e3f10e02ee02083ea0');
  await download(`${voiceBase}/es_MX-claude-high.onnx.json`, path.join(assets, 'es_MX-claude-high.onnx.json'), '1afc81f703c0e4cb3b4d7c0dca096b8b54a98806807f0170cf5eb5557723c12d');
  await download(`${voiceBase}/MODEL_CARD`, path.join(assets, 'CLAUDE_MODEL_CARD.txt'));
  await download('https://raw.githubusercontent.com/rhasspy/piper/2023.11.14-2/LICENSE.md', path.join(assets, 'PIPER_LICENSE.txt'));
  await download('https://raw.githubusercontent.com/espeak-ng/espeak-ng/1.51/COPYING', path.join(assets, 'ESPEAK_LICENSE.txt'));
  await download('https://raw.githubusercontent.com/microsoft/onnxruntime/v1.14.1/LICENSE', path.join(assets, 'ONNXRUNTIME_LICENSE.txt'));
  await download('https://www.apache.org/licenses/LICENSE-2.0.txt', path.join(assets, 'CLAUDE_LICENSE.txt'));
  await fs.copyFile(path.join(root, 'PIPER.md'), path.join(assets, 'NOTICES.txt'));
  console.log('Piper and Claude es_MX are ready.');
}
prepare().catch(error => { console.error(error.message); process.exitCode = 1; });
