const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const VOICE_ID = 'piper:es_MX-claude-high';

class PiperService {
  constructor({ directory, spawn: launch = spawn }) {
    this.directory = directory;
    this.launch = launch;
    this.active = null;
  }
  cancel() {
    if (!this.active) return;
    this.active.cancelled = true;
    this.active.child?.kill();
  }
  async synthesize({ text, voice = VOICE_ID, rate = 1 } = {}) {
    if (voice !== VOICE_ID) throw new Error('La voz solicitada no está disponible.');
    if (typeof text !== 'string' || !text.trim() || text.length > 400) throw new Error('El texto debe tener entre 1 y 400 caracteres.');
    this.cancel();
    const job = { cancelled: false, child: null };
    this.active = job;
    let folder;
    try {
      folder = await fs.mkdtemp(path.join(os.tmpdir(), 'multichat-voice-'));
      if (job.cancelled) throw new Error('Lectura cancelada.');
      const output = path.join(folder, 'speech.wav');
      const speed = Math.max(0.5, Math.min(2, Number(rate) || 1));
      await new Promise((resolve, reject) => {
        const child = this.launch(path.join(this.directory, 'piper.exe'), [
          '--model', path.join(this.directory, 'es_MX-claude-high.onnx'),
          '--output_file', output, '--length_scale', String(1 / speed), '--sentence_silence', '0.12',
        ], { windowsHide: true, shell: false, cwd: this.directory, stdio: ['pipe', 'ignore', 'pipe'] });
        job.child = child;
        const timer = setTimeout(() => { child.kill(); reject(new Error('La voz tardó demasiado. Vuelve a probar.')); }, 30000);
        const finish = error => { clearTimeout(timer); error ? reject(error) : resolve(); };
        child.once('error', () => finish(new Error('No se pudo iniciar la voz Claude. Reinstala la versión completa de MultiChat.')));
        child.stderr.on('data', () => {});
        child.stdin.on('error', () => {});
        child.once('close', code => finish(job.cancelled ? new Error('Lectura cancelada.') : code === 0 ? null : new Error('No se pudo generar la voz Claude. Vuelve a probar.')));
        child.stdin.end(text.trim().replace(/[\r\n]+/g, ' ') + '\n');
      });
      if (job.cancelled) throw new Error('Lectura cancelada.');
      const wav = await fs.readFile(output);
      if (wav.length > 8 * 1024 * 1024 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') throw new Error('La voz generó un audio inválido.');
      return { audio: wav.toString('base64') };
    } finally {
      if (this.active === job) this.active = null;
      if (folder) await fs.rm(folder, { recursive: true, force: true, maxRetries: 3 });
    }
  }
}
module.exports = { PiperService, VOICE_ID };
