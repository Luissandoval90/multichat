const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const { SongQueue } = require('./queue');
const { BrowserBridge } = require('./browser-bridge');
const { TwitchMusicClient } = require('./twitch-client');
const appConfig = require('./app-config.json');

class MusicService {
  constructor({ directory, safeStorage, openExternal, onChange, publicClientId = appConfig.twitchClientId, clientFactory = options => new TwitchMusicClient(options) }) {
    this.publicClientId = publicClientId; this.makeClient = clientFactory; this.deviceSession = null;
    this.file = path.join(directory, 'music-private.bin'); this.safeStorage = safeStorage;
    this.openExternal = openExternal; this.onChange = onChange; this.message = '';
    this.config = { cost: 500, enabled: false, pairingCode: randomBytes(24).toString('hex') };
    let saved = {};
    try { saved = JSON.parse(safeStorage.decryptString(fs.readFileSync(this.file))); Object.assign(this.config, saved.config); }
    catch (error) { if (error.code !== 'ENOENT') this.message = 'No se pudo recuperar la conexión de música. Vuelve a vincular Twitch.'; }
    this.queue = new SongQueue({ rewardId: this.config.rewardId });
    this.queue.pending = Array.isArray(saved.queue?.pending) ? saved.queue.pending.slice(0, 30) : [];
    if (saved.queue?.current) this.queue.current = { ...saved.queue.current, status: 'error', error: 'MultiChat se reinició. Revisa Spotify antes de reintentar este pedido.' };
    this.queue.seen = new Set([...(saved.seen || []).slice(-2000), ...this.queue.pending.map(i => i.id), ...(this.queue.current ? [this.queue.current.id] : [])]);
    this.updates = new Map(saved.updates || []);
    this.client = this.makeClient({ config: this.config, save: () => this.save() });
    this.bridge = new BrowserBridge({ queue: this.queue, code: this.config.pairingCode, onChange: () => this.changed() });
    this.bridge.on('played', item => {
      if (item.id.startsWith('test-') || item.fulfilled) return;
      if (this.queue.current?.id === item.id) this.queue.current.fulfilled = true;
      this.updates.set(item.id, 'FULFILLED'); this.save(); this.syncUpdates().catch(error => this.report(error));
    });
    this.busy = false;
  }
  save() {
    if (!this.safeStorage.isEncryptionAvailable()) throw new Error('Windows no pudo proteger las credenciales. No se guardaron claves sin cifrar.');
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const data = JSON.stringify({ config: this.config, queue: this.queue.snapshot(), seen: [...this.queue.seen], updates: [...this.updates] });
    fs.writeFileSync(`${this.file}.tmp`, this.safeStorage.encryptString(data));
    fs.renameSync(`${this.file}.tmp`, this.file);
  }
  changed() { try { this.save(); } catch (error) { this.message = error.message; } this.onChange(this.state()); }
  report(error) { this.message = error.message || 'No se pudo completar la acción.'; this.changed(); }
  state() {
    return { ...this.queue.snapshot(), cost: this.config.cost, pointsEligible: this.client.eligible ?? null, browserPairing: this.bridge.pairing, authorization: this.deviceSession ? { userCode:this.deviceSession.userCode,verificationUri:this.deviceSession.verificationUri,expiresAt:this.deviceSession.expiresAt } : null,
      enabled: this.config.enabled, twitch: this.client.user?.login || '', rewardReady: !!this.config.rewardId,
      browser: this.bridge.connected, paused: this.bridge.paused, message: this.message };
  }
  async start() {
    try { await this.bridge.start(); }
    catch { this.message = 'El puerto de música está ocupado. Cierra otras versiones de MultiChat y vuelve a abrir esta.'; }
    if (this.config.accessToken) { try { await this.client.validate(); await this.client.checkEligibility(); } catch (error) { this.message = error.message; } }
    this.timer = setInterval(() => this.poll(), 5000);
    this.validationTimer = setInterval(() => { if (this.config.accessToken) this.client.validate().catch(error => { this.client.user = null; this.report(error); }); }, 3600000);
    this.changed();
  }
  async syncUpdates() {
    if (this.syncing || !this.client.user) return;
    this.syncing = true;
    try { for (const [id, status] of this.updates) { await this.client.setRedemption(id, status); this.updates.delete(id); this.save(); } }
    finally { this.syncing = false; }
  }
  async poll() {
    if (this.busy || !this.client.user || this.deviceSession) return;
    this.busy = true;
    try {
      await this.syncUpdates();
      if (!this.config.enabled || !this.config.rewardId) return;
      for (const event of await this.client.poll()) {
        if (this.updates.has(event.id)) continue;
        const result = this.queue.add(event);
        if (!result.accepted && !result.ignored) {
          await this.client.setRedemption(event.id, 'CANCELED');
          this.queue.seen.add(event.id); this.message = `${event.user_name || 'Espectador'}: ${result.error} Se devolvieron los puntos.`;
        }
      }
      this.bridge.pump(); this.changed();
    } catch (error) { this.report(error); }
    finally { this.busy = false; }
  }
  async login() {
    if (this.deviceSession) return;
    if (!/^[A-Za-z0-9]{6,128}$/.test(this.publicClientId)) throw new Error('La aplicación de Twitch no está configurada en esta versión.');
    const candidate = this.makeClient({config:{clientId:this.publicClientId,authFlow:'device'},save:()=>{}});
    const device = await candidate.beginDeviceLogin();
    this.deviceSession = {...device,client:candidate};
    this.message = 'Autoriza tu cuenta en Twitch. También puedes hacerlo desde tu teléfono usando el código.';
    this.changed();
    this.scheduleAuthorization(this.deviceSession);
    try { await this.openExternal(device.verificationUri); }
    catch { this.message = 'Abre el enlace de Twitch y escribe el código que aparece aquí.'; this.changed(); }
  }
  scheduleAuthorization(session) {
    clearTimeout(this.deviceTimer);
    this.deviceTimer = setTimeout(()=>this.checkDeviceAuthorization(session),session.intervalMs);
  }
  async checkDeviceAuthorization(session) {
    if(this.deviceSession!==session) return;
    try {
      if(Date.now()>session.expiresAt) throw new Error('El código de Twitch venció. Pulsa Conectar Twitch para generar otro.');
      const result = await session.client.checkDeviceLogin(session.deviceCode);
      if(this.deviceSession!==session) return;
      if(result.pending) {
        if(result.slowDown) session.intervalMs+=5000;
        this.scheduleAuthorization(session);return;
      }
      const user = await session.client.validate();
      const eligible = await session.client.checkEligibility();
      if(this.deviceSession!==session) return;
      if(this.config.ownerId && this.config.ownerId!==user.id) {
        if(this.queue.current || this.queue.pending.length || this.updates.size) throw new Error('Resuelve los pedidos del canal anterior antes de conectar otro canal.');
        delete this.config.rewardId; this.queue.rewardId='';this.config.enabled=false;
      }
      Object.assign(this.config,session.client.config,{ownerId:user.id});
      delete this.config.clientSecret;
      this.client.user=user;this.client.eligible=eligible;this.deviceSession=null;
      this.message = eligible ? 'Twitch conectado. Crea tu recompensa y vincula Spotify.' : 'Cuenta conectada. Los canjes de puntos necesitan un canal Afiliado o Partner. Puedes probar Spotify sin puntos.';
      this.changed();
    } catch(error) {
      if(this.deviceSession!==session) return;
      this.deviceSession=null;this.report(error);
    }
  }
  async action(type, data = {}) {
    if (type === 'login') await this.login();
    else if (type === 'cancel-login') { clearTimeout(this.deviceTimer); this.deviceSession=null; this.message='Conexión cancelada.';this.changed(); }
    else if (type === 'approve-browser') { this.bridge.approvePair(data.id); this.changed(); }
    else if (type === 'create-reward') {
      const cost = Number(data.cost || 500);
      if (!Number.isInteger(cost) || cost < 1 || cost > 1000000) throw new Error('Elige un coste entre 1 y 1.000.000 de puntos.');
      const reward = await this.client.createReward(cost);
      this.queue.rewardId = reward.id; this.config.enabled = true;
      this.message = `Recompensa activa: ${cost} puntos. Los espectadores deben escribir canción y artista.`; this.changed();
    } else if (type === 'enabled') { this.config.enabled = !!data.enabled; this.changed(); }
    else if (type === 'pause') { this.bridge.paused = !this.bridge.paused; this.bridge.pump(); this.changed(); }
    else if (type === 'retry') this.bridge.retry();
    else if (type === 'test') {
      if (!this.bridge.connected) throw new Error('Conecta la extensión de Brave antes de probar.');
      const result = this.queue.add({ id: `test-${randomBytes(8).toString('hex')}`, user_id: 'local-test', user_name: 'Prueba local', user_input: data.query, reward: { id: this.queue.rewardId } });
      if (!result.accepted) throw new Error(result.error || 'No se pudo añadir la prueba.');
      this.bridge.pump(); this.changed();
    } else if (type === 'remove') {
      const item = [this.queue.current, ...this.queue.pending].find(item => item?.id === data.id);
      if (!item) return this.state();
      if (!item.fulfilled && item.status !== 'playing' && !item.id.startsWith('test-')) {
        if (this.queue.current?.id === item.id) {
          this.queue.fail(item.id, 'Devolviendo los puntos…');
          if (this.bridge.connected) this.bridge.client.send(JSON.stringify({ type: 'cancel', id: item.id }));
        }
        await this.client.setRedemption(item.id, 'CANCELED');
      }
      this.bridge.cancel(item.id); this.changed();
    } else throw new Error('Acción de música no válida.');
    return this.state();
  }
  close() { clearInterval(this.timer); clearInterval(this.validationTimer); clearTimeout(this.deviceTimer); this.deviceSession=null; return this.bridge.close(); }
}
module.exports = { MusicService };
