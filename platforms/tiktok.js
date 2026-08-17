// Conexión al chat en vivo y eventos de TikTok usando TikTool (@tiktool/live).
// Expone: connect(username, callbacks, options) -> { disconnect() }

const { TikTokLive } = require('@tiktool/live');

const MAX_RECONNECT_DELAY_MS = 30000;

function connect(username, callbacks, options = {}) {
  let client = null;
  let currentUsername = username.replace(/^@/, '').trim();
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let stopped = false;

  function scheduleReconnect() {
    if (stopped || !currentUsername || reconnectTimer) return;
    const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempt), MAX_RECONNECT_DELAY_MS);
    reconnectAttempt++;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!stopped) start();
    }, delay);
  }

  function emitFollow(user) {
    if (!user) return;
    console.log('[TikTok] ¡Nuevo seguidor!', user.nickname || user.uniqueId);
    if (callbacks.onFollow) {
      callbacks.onFollow({
        platform: 'tiktok',
        userId: user.uniqueId || user.id || 'tiktok_user',
        nickname: user.nickname || user.uniqueId || 'Usuario de TikTok',
        avatarUrl: user.profilePicture || user.avatarLargeUrl || null,
      });
    }
  }

  function start() {
    console.log('[TikTok/TikTool] Iniciando conexión para usuario:', currentUsername);

    if (!options.tiktoolApiKey) {
      callbacks.onStatus({ 
        connected: false, 
        error: 'TikTok requiere una clave gratuita de tik.tools (solo se pone una vez)' 
      });
      return;
    }

    if (client) {
      try {
        client.removeAllListeners();
        client.disconnect();
      } catch (e) {}
    }

    try {
      client = new TikTokLive({
        uniqueId: currentUsername,
        apiKey: options.tiktoolApiKey,
        autoReconnect: false,
      });

      client.on('connected', () => {
        console.log('[TikTok/TikTool] Conectado. Room ID:', client.roomId);
        reconnectAttempt = 0;
        callbacks.onStatus({ connected: true });
      });

      client.on('disconnected', (code, reason) => {
        if (stopped) return;
        console.warn('[TikTok/TikTool] Desconectado:', code, reason);
        callbacks.onStatus({ connected: false, error: 'TikTok desconectado, reintentando…' });
        scheduleReconnect();
      });

      client.on('error', (err) => {
        console.error('[TikTok/TikTool] ERROR:', err);
        const msg = err.message || String(err);
        callbacks.onStatus({ 
          connected: false, 
          error: msg.includes('LIVE has ended') ? 'El usuario no está en vivo en TikTok' : 'TikTok: ' + msg 
        });
        scheduleReconnect();
      });

      // Chat estándar
      client.on('chat', (event) => {
        callbacks.onChat({
          platform: 'tiktok',
          userId: event.user?.uniqueId || event.user?.id,
          nickname: event.user?.nickname || event.user?.uniqueId,
          comment: event.comment,
          avatarUrl: event.user?.profilePicture || event.user?.avatarLargeUrl,
          emotes: (event.emotes || []).map(e => ({
            index: e.placeInComment,
            url: e.imageUrl,
          })),
        });
      });

      // Chat solo con emotes
      client.on('emoteChat', (event) => {
        callbacks.onChat({
          platform: 'tiktok',
          userId: event.user?.uniqueId || event.user?.id,
          nickname: event.user?.nickname || event.user?.uniqueId,
          comment: '',
          avatarUrl: event.user?.profilePicture || event.user?.avatarLargeUrl,
          emotes: event.emoteUrl ? [{ index: 0, url: event.emoteUrl }] : [],
        });
      });

      // Likes en tiempo real y contador total
      client.on('like', (event) => {
        if (callbacks.onLike) {
          callbacks.onLike({
            platform: 'tiktok',
            userId: event.user?.uniqueId || event.user?.id,
            nickname: event.user?.nickname || event.user?.uniqueId,
            likeCount: event.likeCount || 1,
            totalLikes: event.totalLikes || 0,
          });
        }
      });

      // Espectadores en vivo (Viewer count)
      client.on('roomUserSeq', (event) => {
        const count = event.viewerCount || event.totalViewers || 0;
        if (callbacks.onViewers) {
          callbacks.onViewers({
            platform: 'tiktok',
            viewers: count,
          });
        }
      });

      // Eventos sociales (Seguidores y Compartidos)
      client.on('social', (event) => {
        if (event.action === 'share') {
          if (callbacks.onShare) {
            callbacks.onShare({
              platform: 'tiktok',
              userId: event.user?.uniqueId || event.user?.id,
              nickname: event.user?.nickname || event.user?.uniqueId,
              avatarUrl: event.user?.profilePicture || event.user?.avatarLargeUrl || null,
            });
          }
        } else if (event.action === 'follow' || !event.action) {
          emitFollow(event.user);
        }
      });

      // Usuario entra o sigue
      client.on('member', (event) => {
        if (event.action === 2) {
          emitFollow(event.user);
        } else if (event.action === 3 && callbacks.onShare) {
          callbacks.onShare({
            platform: 'tiktok',
            userId: event.user?.uniqueId || event.user?.id,
            nickname: event.user?.nickname || event.user?.uniqueId,
          });
        } else if (callbacks.onJoin) {
          callbacks.onJoin({
            platform: 'tiktok',
            userId: event.user?.uniqueId || event.user?.id,
            nickname: event.user?.nickname || event.user?.uniqueId,
          });
        }
      });

      // Follow directo
      client.on('follow', (event) => {
        emitFollow(event.user || event);
      });

      // Regalos con diamantes y cantidad de combo
      client.on('gift', (event) => {
        if (event.giftType !== 1 || event.repeatEnd) {
          callbacks.onGift({
            platform: 'tiktok',
            userId: event.user?.uniqueId || event.user?.id,
            nickname: event.user?.nickname || event.user?.uniqueId,
            avatarUrl: event.user?.profilePicture || event.user?.avatarLargeUrl,
            giftName: event.giftName || 'Regalo',
            giftImageUrl: event.giftImageUrl || null,
            diamondCount: event.diamondCount || 0,
            repeatCount: event.repeatCount || 1,
          });
        }
      });

      client.connect().catch(err => {
        console.error('[TikTok/TikTool] connect() error:', err);
        const msg = err.message || String(err);
        callbacks.onStatus({ 
          connected: false, 
          error: msg.includes('LIVE has ended') ? 'El usuario no está en vivo en TikTok' : 'TikTok: ' + msg 
        });
        scheduleReconnect();
      });

    } catch (err) {
      console.error('[TikTok/TikTool] Falló inicialización:', err);
      callbacks.onStatus({ connected: false, error: 'TikTok: ' + (err.message || String(err)) });
      scheduleReconnect();
    }
  }

  start();

  return {
    disconnect() {
      stopped = true;
      currentUsername = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (client) {
        try {
          client.removeAllListeners();
          client.disconnect();
        } catch (e) {}
      }
    },
  };
}

module.exports = { connect };
