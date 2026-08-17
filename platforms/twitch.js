// Conexión anónima (solo lectura) al chat de Twitch usando tmi.js.
// Expone: connect(channel, callbacks, options) -> { disconnect() }
// options: { twitchClientId, twitchClientSecret }

const tmi = require('tmi.js');
const https = require('https');

let cachedAppToken = null;
const avatarCache = new Map();
const pendingAvatarLookups = new Map();

function httpsRequestJson(urlStr, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers,
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Twitch API respondió ${res.statusCode}: ${raw.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error('Respuesta de Twitch no es JSON válido'));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAppAccessToken(clientId, clientSecret) {
  const now = Date.now();
  if (cachedAppToken && cachedAppToken.clientId === clientId && cachedAppToken.expiresAt > now + 60000) {
    return cachedAppToken.token;
  }

  const body = `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`;
  const data = await httpsRequestJson('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body,
  });

  cachedAppToken = {
    token: data.access_token,
    clientId,
    expiresAt: now + (data.expires_in || 3000) * 1000,
  };
  return cachedAppToken.token;
}

async function fetchAvatarUrl(login, clientId, clientSecret) {
  const key = login.toLowerCase();
  if (avatarCache.has(key)) return avatarCache.get(key);
  if (pendingAvatarLookups.has(key)) return pendingAvatarLookups.get(key);

  const lookup = (async () => {
    try {
      const token = await getAppAccessToken(clientId, clientSecret);
      const data = await httpsRequestJson(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(key)}`, {
        headers: { 'Client-Id': clientId, 'Authorization': `Bearer ${token}` },
      });
      const url = data.data?.[0]?.profile_image_url || null;
      avatarCache.set(key, url);
      return url;
    } catch {
      avatarCache.set(key, null);
      return null;
    } finally {
      pendingAvatarLookups.delete(key);
    }
  })();

  pendingAvatarLookups.set(key, lookup);
  return lookup;
}

function connect(channel, callbacks, options = {}) {
  const hasCredentials = !!(options.twitchClientId && options.twitchClientSecret);
  const cleanChannel = channel.toLowerCase().replace(/^#/, '');
  let viewerPollTimer = null;
  let stopped = false;

  async function pollViewers() {
    if (stopped || !hasCredentials) return;
    try {
      const token = await getAppAccessToken(options.twitchClientId, options.twitchClientSecret);
      const data = await httpsRequestJson(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(cleanChannel)}`, {
        headers: { 'Client-Id': options.twitchClientId, 'Authorization': `Bearer ${token}` },
      });
      const viewers = data?.data?.[0]?.viewer_count || 0;
      if (callbacks.onViewers) {
        callbacks.onViewers({ platform: 'twitch', viewers });
      }
    } catch (e) {}
  }

  const client = new tmi.Client({
    options: { skipMembership: true },
    connection: { reconnect: true, secure: true, maxReconnectAttempts: Infinity },
    channels: [cleanChannel],
  });

  client.on('connected', () => {
    callbacks.onStatus({ connected: true });
    if (hasCredentials) {
      pollViewers();
      viewerPollTimer = setInterval(pollViewers, 30000);
    }
  });

  client.on('disconnected', (reason) => {
    callbacks.onStatus({ connected: false, error: 'Twitch desconectado: ' + (reason || 'reintentando…') });
  });

  function emitChatWithAvatar(username, payload) {
    callbacks.onChat(payload);
    if (!hasCredentials) return;

    fetchAvatarUrl(username, options.twitchClientId, options.twitchClientSecret).then(avatarUrl => {
      if (avatarUrl) callbacks.onChat({ ...payload, avatarUrl, _avatarUpdate: true });
    });
  }

  client.on('message', (ch, tags, message, self) => {
    if (self) return;

    const emotePositions = tags.emotes;
    const emotes = [];
    if (emotePositions) {
      for (const emoteId of Object.keys(emotePositions)) {
        for (const range of emotePositions[emoteId]) {
          const [start] = range.split('-').map(Number);
          emotes.push({
            index: start,
            length: range.split('-').reduce((a, b) => Number(b) - Number(a) + 1),
            url: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/2.0`,
          });
        }
      }
    }

    emitChatWithAvatar(tags.username, {
      platform: 'twitch',
      userId: tags['user-id'] || tags.username,
      nickname: tags['display-name'] || tags.username,
      comment: message,
      avatarUrl: null,
      color: tags.color || null,
      emotes,
      badges: tags.badges || null,
    });
  });

  client.on('cheer', (ch, tags, message) => {
    callbacks.onGift({
      platform: 'twitch',
      userId: tags['user-id'] || tags.username,
      nickname: tags['display-name'] || tags.username,
      avatarUrl: null,
      giftName: `${tags.bits} bits`,
      giftImageUrl: null,
      repeatCount: 1,
    });
  });

  client.on('subscription', (ch, username, method, message, tags) => {
    callbacks.onGift({
      platform: 'twitch',
      userId: tags['user-id'] || username,
      nickname: tags['display-name'] || username,
      avatarUrl: null,
      giftName: 'Nueva suscripción',
      giftImageUrl: null,
      repeatCount: 1,
    });
  });

  client.on('resub', (ch, username, months, message, tags) => {
    callbacks.onGift({
      platform: 'twitch',
      userId: tags['user-id'] || username,
      nickname: tags['display-name'] || username,
      avatarUrl: null,
      giftName: `Resub (${months} meses)`,
      giftImageUrl: null,
      repeatCount: 1,
    });
  });

  client.on('subgift', (ch, username, streakMonths, recipient, methods, tags) => {
    callbacks.onGift({
      platform: 'twitch',
      userId: tags['user-id'] || username,
      nickname: tags['display-name'] || username,
      avatarUrl: null,
      giftName: `Regaló sub a ${recipient}`,
      giftImageUrl: null,
      repeatCount: 1,
    });
  });

  client.on('submysterygift', (ch, username, numbOfSubs, methods, tags) => {
    callbacks.onGift({
      platform: 'twitch',
      userId: tags['user-id'] || username,
      nickname: tags['display-name'] || username,
      avatarUrl: null,
      giftName: `Regaló ${numbOfSubs} subs`,
      giftImageUrl: null,
      repeatCount: numbOfSubs || 1,
    });
  });

  client.connect().catch(err => {
    callbacks.onStatus({ connected: false, error: err.message || String(err) });
  });

  return {
    disconnect() {
      stopped = true;
      if (viewerPollTimer) clearInterval(viewerPollTimer);
      client.disconnect().catch(() => {});
    },
  };
}

module.exports = { connect };
