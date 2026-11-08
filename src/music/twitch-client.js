class TwitchMusicClient {
  constructor({ config, save, apiBase = 'https://api.twitch.tv/helix', authBase = 'https://id.twitch.tv/oauth2' }) {
    this.config = config; this.save = save; this.apiBase = apiBase; this.authBase = authBase;
    this.user = null;
  }
  async json(url, options = {}) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
    let data = {}; try { data = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(response.status === 401 ? 'Vuelve a conectar tu cuenta de Twitch.' : response.status === 403 ? 'Twitch no permite esta acción. Revisa los puntos del canal y los permisos.' : response.status === 429 ? 'Twitch limitó las consultas. Espera un momento.' : `Twitch respondió ${response.status}. Revisa las credenciales y la recompensa.`);
      error.status = response.status; error.providerCode = String(data.message || data.error || ''); throw error;
    }
    return data;
  }
  async token(params) {
    const credentials = { client_id: this.config.clientId };
    if (this.config.authFlow !== 'device' && this.config.clientSecret) credentials.client_secret = this.config.clientSecret;
    const data = await this.json(`${this.authBase}/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...credentials, ...params }).toString() });
    this.config.accessToken = data.access_token;
    this.config.refreshToken = data.refresh_token || this.config.refreshToken;
    this.config.expiresAt = Date.now() + data.expires_in * 1000;
    this.save(); return data;
  }
  async exchange(code, redirectUri) { await this.token({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }); return this.validate(); }
  async beginDeviceLogin() {
    const data = await this.json(`${this.authBase}/device`, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({client_id:this.config.clientId,scopes:'channel:manage:redemptions'}).toString() });
    const uri = new URL(data.verification_uri);
    if (uri.protocol !== 'https:' || !['www.twitch.tv','twitch.tv'].includes(uri.hostname) || !data.device_code || !data.user_code) throw new Error('Twitch no devolvió un enlace válido de autorización.');
    if(uri.pathname==='/activate' && !uri.searchParams.has('device-code')) uri.searchParams.set('device-code',data.user_code);
    return { deviceCode:data.device_code,userCode:data.user_code,verificationUri:uri.href,expiresAt:Date.now()+Number(data.expires_in)*1000,intervalMs:Math.max(1000,Number(data.interval || 5)*1000) };
  }
  async checkDeviceLogin(deviceCode) {
    try {
      await this.token({grant_type:'urn:ietf:params:oauth:grant-type:device_code',device_code:deviceCode,scopes:'channel:manage:redemptions'});
      return { connected:true };
    } catch(error) {
      if (/authorization_pending/i.test(error.providerCode)) return { pending:true };
      if (/slow_down/i.test(error.providerCode)) return { pending:true,slowDown:true };
      if (/expired|invalid device code/i.test(error.providerCode)) throw new Error('El código de Twitch venció. Pulsa Conectar Twitch para generar otro.');
      if (/denied/i.test(error.providerCode)) throw new Error('Se canceló la autorización de Twitch.');
      throw error;
    }
  }
  async refresh() {
    if (!this.config.refreshToken) throw new Error('Conecta tu cuenta de Twitch.');
    if (!this.refreshPromise) this.refreshPromise = this.token({ grant_type: 'refresh_token', refresh_token: this.config.refreshToken }).finally(() => { this.refreshPromise = null; });
    return this.refreshPromise;
  }
  async validate() {
    if (!this.config.accessToken) throw new Error('Conecta tu cuenta de Twitch.');
    let data;
    try { data = await this.json(`${this.authBase}/validate`, { headers: { Authorization: `OAuth ${this.config.accessToken}` } }); }
    catch (error) {
      if (error.status !== 401 || !this.config.refreshToken) throw error;
      await this.refresh(); data = await this.json(`${this.authBase}/validate`, { headers: { Authorization: `OAuth ${this.config.accessToken}` } });
    }
    if (data.client_id !== this.config.clientId || !data.scopes?.includes('channel:manage:redemptions')) throw new Error('Vuelve a autorizar Twitch con permisos para las recompensas.');
    this.user = { id: data.user_id, login: data.login };
    this.config.expiresAt = Date.now() + data.expires_in * 1000;
    return this.user;
  }
  async request(path, method = 'GET', body, retry = true) {
    if (this.config.expiresAt && this.config.expiresAt < Date.now() + 60000 && this.config.refreshToken) await this.refresh();
    try {
      return await this.json(`${this.apiBase}/${path}`, { method, headers: { 'Client-Id': this.config.clientId, Authorization: `Bearer ${this.config.accessToken}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    } catch (error) {
      if (error.status !== 401 || !retry || !this.config.refreshToken) throw error;
      await this.refresh(); return this.request(path, method, body, false);
    }
  }
  async createReward(cost = 500) {
    if (!this.user) await this.validate();
    if (this.eligible === false) throw new Error('Este canal no tiene puntos de Twitch: debe ser Afiliado o Partner. Conecta el canal del creador que recibirá los canjes.');
    const base = `channel_points/custom_rewards?broadcaster_id=${encodeURIComponent(this.user.id)}`;
    const body = { title: 'Pedir canción', cost, prompt: 'Escribe el nombre de la canción y su artista. Ejemplo: La flaca - Jarabe de Palo', is_user_input_required: true, should_redemptions_skip_request_queue: false };
    const response = await this.request(base + (this.config.rewardId ? `&id=${encodeURIComponent(this.config.rewardId)}` : ''), this.config.rewardId ? 'PATCH' : 'POST', body);
    const reward = response.data?.[0];
    if (!reward?.id) throw new Error('Twitch no devolvió la recompensa.');
    this.config.rewardId = reward.id; this.config.cost = cost; this.save(); return reward;
  }
  async poll() {
    if (!this.user || !this.config.rewardId) return [];
    const params = new URLSearchParams({ broadcaster_id: this.user.id, reward_id: this.config.rewardId, status: 'UNFULFILLED', first: '50', sort: 'OLDEST' });
    return (await this.request(`channel_points/custom_rewards/redemptions?${params}`)).data || [];
  }
  async checkEligibility() {
    const user = (await this.request('users')).data?.[0];
    if (!user || user.id !== this.user?.id) throw new Error('No se pudo comprobar el canal conectado.');
    this.eligible = ['affiliate','partner'].includes(user.broadcaster_type);
    return this.eligible;
  }
  async setRedemption(id, status) {
    if (!this.user || !['FULFILLED', 'CANCELED'].includes(status)) throw new Error('Canje no válido.');
    const params = new URLSearchParams({ broadcaster_id: this.user.id, reward_id: this.config.rewardId, id });
    return this.request(`channel_points/custom_rewards/redemptions?${params}`, 'PATCH', { status });
  }
}
module.exports = { TwitchMusicClient };
