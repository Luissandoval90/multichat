// Conexión al chat en vivo de YouTube Live usando youtube-chat.
// Permite conectar usando: @canal, URL del directo, ID del video o ID del canal.
// Expone: connect(channelOrVideo, callbacks) -> { disconnect() }

const { LiveChat } = require('youtube-chat');

const MAX_RECONNECT_DELAY_MS = 30000;

function parseYouTubeInput(input) {
  const str = input.trim();

  // Si es URL de video (youtube.com/watch?v=ID o youtu.be/ID)
  const videoMatch = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (videoMatch) {
    return { liveId: videoMatch[1] };
  }

  // Si es un ID directo de 11 caracteres
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return { liveId: str };
  }

  // Si es un Channel ID (UC...)
  if (/^UC[\w-]{22}$/.test(str)) {
    return { channelId: str };
  }

  // Si es un handle (@usuario) o nombre de canal
  const handle = str.startsWith('@') ? str : `@${str}`;
  return { handle };
}

function connect(input, callbacks, options = {}) {
  let liveChat = null;
  let stopped = false;
  let reconnectTimer = null;
  let reconnectAttempt = 0;

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return;
    const delay = Math.min(2000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY_MS);
    reconnectAttempt++;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!stopped) start();
    }, delay);
  }

  async function start() {
    const chatParams = parseYouTubeInput(input);
    console.log('[YouTube] Conectando con parámetros:', chatParams);

    try {
      liveChat = new LiveChat(chatParams);

      liveChat.on('start', (liveId) => {
        console.log('[YouTube] Conectado exitosamente al directo:', liveId);
        reconnectAttempt = 0;
        callbacks.onStatus({ connected: true });
      });

      liveChat.on('chat', (chatItem) => {
        const author = chatItem.author || {};
        const isSuperChat = !!chatItem.superchat;

        let comment = '';
        const emotes = [];

        if (Array.isArray(chatItem.message)) {
          let textAccumulator = '';
          for (const part of chatItem.message) {
            if (part.text) {
              textAccumulator += part.text;
            } else if (part.url) {
              emotes.push({
                index: textAccumulator.length,
                url: part.url,
                alt: part.alt || '',
              });
            }
          }
          comment = textAccumulator;
        } else if (typeof chatItem.message === 'string') {
          comment = chatItem.message;
        }

        const avatarUrl = author.thumbnail?.url || null;
        const nickname = author.name || 'Usuario YouTube';

        if (isSuperChat) {
          callbacks.onGift({
            platform: 'youtube',
            userId: author.channelId || nickname,
            nickname: nickname,
            avatarUrl: avatarUrl,
            giftName: `SuperChat ${chatItem.superchat.amount}`,
            giftImageUrl: null,
            repeatCount: 1,
            comment: comment,
          });
        }

        callbacks.onChat({
          platform: 'youtube',
          userId: author.channelId || nickname,
          nickname: nickname,
          comment: comment,
          avatarUrl: avatarUrl,
          emotes: emotes,
          isOwner: author.isOwner,
          isModerator: author.isModerator,
          isVerified: author.isVerified,
        });
      });

      liveChat.on('error', (err) => {
        console.error('[YouTube] Error:', err);
        callbacks.onStatus({ connected: false, error: 'YouTube: ' + (err.message || 'Error de conexión') });
        scheduleReconnect();
      });

      liveChat.on('end', (reason) => {
        if (stopped) return;
        callbacks.onStatus({ connected: false, error: 'YouTube: directo finalizado o desconectado' });
        scheduleReconnect();
      });

      const ok = await liveChat.start();
      if (!ok) {
        callbacks.onStatus({ connected: false, error: 'YouTube: no se encontró directo activo en ese canal' });
        scheduleReconnect();
      }
    } catch (err) {
      console.error('[YouTube] Falló al iniciar:', err);
      callbacks.onStatus({ connected: false, error: 'YouTube: ' + (err.message || String(err)) });
      scheduleReconnect();
    }
  }

  start();

  return {
    disconnect() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (liveChat) {
        liveChat.stop();
      }
    },
  };
}

module.exports = { connect };
