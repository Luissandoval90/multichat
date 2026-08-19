// Conexión oficial al chat en vivo y eventos de TikTok usando @tiktool/live.
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

  function handleLikeEvent(event) {
    if (!event || !callbacks.onLike) return;
    const total = Number(event.totalLikes) || Number(event.totalLikeCount) || Number(event.total) || 0;
    const delta = Number(event.likeCount) || Number(event.count) || 1;

    callbacks.onLike({
      platform: 'tiktok',
      userId: event.user?.uniqueId || event.user?.id,
      nickname: event.user?.nickname || event.user?.uniqueId,
      likeCount: delta,
      totalLikes: total,
    });
  }

  function start() {
    console.log('[TikTok] Iniciando conexión para usuario:', currentUsername);

    const apiKey = (options.tiktoolApiKey || '').trim();

    if (!apiKey) {
      callbacks.onStatus({ 
        connected: false, 
        error: 'Requiere tu clave gratis de tik.tools en Ajustes ⚙' 
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
        apiKey: apiKey,
        autoReconnect: false,
      });

      client.on('connected', () => {
        console.log('[TikTok] Conectado exitosamente. Room ID:', client.roomId);
        reconnectAttempt = 0;
        callbacks.onStatus({ connected: true });
      });

      client.on('disconnected', (code, reason) => {
        if (stopped) return;
        console.warn('[TikTok] Desconectado:', code, reason);
        callbacks.onStatus({ connected: false, error: 'TikTok desconectado, reintentando…' });
        if (callbacks.onViewers) {
          callbacks.onViewers({ platform: 'tiktok', viewers: 0 });
        }
        scheduleReconnect();
      });

      client.on('error', (err) => {
        console.error('[TikTok] ERROR:', err);
        const msg = err.message || String(err);
        let friendlyMsg = 'TikTok: ' + msg;
        if (msg.includes('LIVE has ended')) {
          friendlyMsg = 'El usuario no está en vivo en TikTok';
        } else if (msg.includes('Invalid API key') || msg.includes('Unauthorized') || msg.includes('401')) {
          friendlyMsg = 'Clave de TikTool inválida. Revisa en Ajustes ⚙';
        }
        callbacks.onStatus({ connected: false, error: friendlyMsg });
        if (callbacks.onViewers) {
          callbacks.onViewers({ platform: 'tiktok', viewers: 0 });
        }
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
        handleLikeEvent(event);
      });

      client.on('event', (event) => {
        if (event && event.type === 'like') {
          handleLikeEvent(event);
        }
      });

      // Espectadores en vivo (Viewer count continuo)
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

      // Regalos con diamantes, imagen HD y cantidad de combo
      client.on('gift', (event) => {
        if (event.giftType !== 1 || event.repeatEnd) {
          const imgUrl = event.giftImageUrl || 
            event.giftPictureUrl || 
            event.giftDetails?.giftImage?.urlList?.[0] || 
            event.gift?.image?.urlList?.[0] || 
            event.giftIconUrl || 
            null;

          const diamonds = event.diamondCount || 
            event.giftDetails?.diamondCount || 
            event.gift?.diamond_count || 
            0;

          callbacks.onGift({
            platform: 'tiktok',
            userId: event.user?.uniqueId || event.user?.id,
            nickname: event.user?.nickname || event.user?.uniqueId,
            avatarUrl: event.user?.profilePicture || event.user?.avatarLargeUrl,
            giftName: event.giftName || event.describe || 'Regalo',
            giftImageUrl: imgUrl,
            diamondCount: diamonds,
            repeatCount: event.repeatCount || 1,
          });
        }
      });

      client.connect().catch(err => {
        console.error('[TikTok] connect() error:', err);
        const msg = err.message || String(err);
        let friendlyMsg = 'TikTok: ' + msg;
        if (msg.includes('LIVE has ended')) {
          friendlyMsg = 'El usuario no está en vivo en TikTok';
        } else if (msg.includes('Invalid API key') || msg.includes('Unauthorized') || msg.includes('401')) {
          friendlyMsg = 'Clave de TikTool inválida. Revisa en Ajustes ⚙';
        }
        callbacks.onStatus({ connected: false, error: friendlyMsg });
        if (callbacks.onViewers) {
          callbacks.onViewers({ platform: 'tiktok', viewers: 0 });
        }
        scheduleReconnect();
      });

    } catch (err) {
      console.error('[TikTok] Falló inicialización:', err);
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
