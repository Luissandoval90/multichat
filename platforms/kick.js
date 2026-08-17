// Conexión al chat en vivo y eventos de Kick.com usando Pusher WebSocket.
// Expone: connect(channelSlug, callbacks) -> { disconnect() }

const WebSocket = require('ws');
const https = require('https');

const PUSHER_WS_URL = 'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false';
const MAX_RECONNECT_DELAY_MS = 30000;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': 'https://kick.com/',
        'Origin': 'https://kick.com',
      },
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Kick API respondió ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(new Error('Respuesta de Kick no es JSON válido'));
        }
      });
    }).on('error', reject);
  });
}

function parseKickEmotes(content) {
  const emoteRegex = /\[emote:(\d+):([^\]]*)\]/g;
  let plainText = '';
  const emotes = [];
  let lastIndex = 0;
  let match;

  while ((match = emoteRegex.exec(content)) !== null) {
    plainText += content.slice(lastIndex, match.index);
    emotes.push({
      index: plainText.length,
      url: `https://files.kick.com/emotes/${match[1]}/fullsize`,
    });
    lastIndex = emoteRegex.lastIndex;
  }
  plainText += content.slice(lastIndex);

  return { text: plainText, emotes };
}

async function resolveChannel(slug) {
  const data = await fetchJson(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`);
  if (!data || !data.chatroom || !data.chatroom.id) {
    throw new Error('No se encontró el canal de Kick (¿está bien escrito el usuario?)');
  }
  return {
    chatroomId: data.chatroom.id,
    channelId: data.id || (data.user && data.user.id),
    profilePic: data.user?.profile_pic || null,
    viewers: data.livestream?.viewer_count || 0,
  };
}

function connect(slug, callbacks, options = {}) {
  let ws = null;
  let stopped = false;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let pingInterval = null;
  let viewerPollTimer = null;

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY_MS);
    reconnectAttempt++;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!stopped) start();
    }, delay);
  }

  async function pollViewers() {
    if (stopped) return;
    try {
      const data = await fetchJson(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`);
      const viewers = data?.livestream?.viewer_count || 0;
      if (callbacks.onViewers) {
        callbacks.onViewers({ platform: 'kick', viewers });
      }
    } catch (e) {}
  }

  async function start() {
    let channelInfo;
    try {
      channelInfo = await resolveChannel(slug);
      if (callbacks.onViewers) {
        callbacks.onViewers({ platform: 'kick', viewers: channelInfo.viewers });
      }
    } catch (err) {
      callbacks.onStatus({ connected: false, error: 'Kick: ' + (err.message || String(err)) });
      scheduleReconnect();
      return;
    }

    const { chatroomId, channelId } = channelInfo;
    ws = new WebSocket(PUSHER_WS_URL);

    // Consulta periódica de espectadores cada 25 segundos
    viewerPollTimer = setInterval(pollViewers, 25000);

    ws.on('open', () => {
      // Suscripción al chatroom
      ws.send(JSON.stringify({
        event: 'pusher:subscribe',
        data: { auth: '', channel: `chatrooms.${chatroomId}.v2` },
      }));

      // Suscripción al canal
      if (channelId) {
        ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { auth: '', channel: `channel.${channelId}` },
        }));
      }

      pingInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
        }
      }, 25000);
    });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.event === 'pusher_internal:subscription_succeeded') {
        reconnectAttempt = 0;
        callbacks.onStatus({ connected: true });
        return;
      }

      if (msg.event === 'pusher:error') {
        callbacks.onStatus({ connected: false, error: 'Kick: error de conexión Pusher' });
        return;
      }

      let data;
      try {
        data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
      } catch {
        return;
      }

      // Mensajes de chat
      if (msg.event === 'App\\Events\\ChatMessageEvent') {
        const { text, emotes } = parseKickEmotes(data.content || '');
        callbacks.onChat({
          platform: 'kick',
          userId: String(data.sender?.id || data.sender?.username),
          nickname: data.sender?.username,
          comment: text,
          avatarUrl: data.sender?.profile_pic || null,
          color: data.sender?.identity?.color || null,
          emotes,
          badges: data.sender?.identity?.badges || [],
        });
      }

      // Suscripciones
      if (msg.event === 'App\\Events\\SubscriptionEvent' || msg.event === 'App\\Events\\GiftedSubscriptionsEvent') {
        callbacks.onGift({
          platform: 'kick',
          userId: String(data.user_id || data.username),
          nickname: data.username || data.gifter_username || 'Usuario',
          avatarUrl: null,
          giftName: msg.event.includes('Gifted') ? `Regaló ${data.gifted_usernames?.length || 1} Subs` : 'Suscripción Kick',
          giftImageUrl: null,
          repeatCount: 1,
        });
      }

      // Seguidores
      if (msg.event === 'App\\Events\\FollowersUpdated' || msg.event === 'FollowersUpdated') {
        if (data.username || data.follower) {
          callbacks.onFollow?.({
            platform: 'kick',
            userId: String(data.user_id || data.id || data.username),
            nickname: data.username || data.follower?.username || data.follower,
            avatarUrl: data.profile_pic || data.follower?.profile_pic || null,
          });
        }
      }
    });

    ws.on('close', () => {
      if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
      if (viewerPollTimer) { clearInterval(viewerPollTimer); viewerPollTimer = null; }
      if (stopped) return;
      callbacks.onStatus({ connected: false, error: 'Kick desconectado, reintentando…' });
      scheduleReconnect();
    });

    ws.on('error', () => {});
  }

  start();

  return {
    disconnect() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingInterval) clearInterval(pingInterval);
      if (viewerPollTimer) clearInterval(viewerPollTimer);
      if (ws) {
        ws.removeAllListeners();
        ws.close();
      }
    },
  };
}

module.exports = { connect };
