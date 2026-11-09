// Euler Stream signs new TikTok LIVE connections.
async function createEulerClient(handle, options) {
  const sdk = await import('tiktok-live-connector');
  sdk.SignConfig.cachedInstance = undefined;
  return new sdk.TikTokLiveConnection(handle, options);
}
function imageUrl(image) {
  if (typeof image === 'string') return image;
  return image?.urlList?.[0] || image?.url?.[0] || image?.imageUrl || null;
}
function userFields(user = {}) {
  const badges = [
    ...(user.badgeList || []).map(badge => ({
      imageUrl: imageUrl(badge.image?.image || badge.combine?.icon),
      label: badge.combine?.str || badge.combine?.text?.defaultPattern || 'Insignia TikTok',
      text: badge.combine?.str || '',
    })),
    ...(user.badgeImageList || []).map(image => ({ imageUrl: imageUrl(image), label: 'Insignia TikTok' })),
  ].filter(badge => badge.imageUrl).slice(0, 12);
  return {
    platform: 'tiktok',
    userId: String(user.displayId || user.uniqueId || user.idStr || user.id || 'tiktok_user'),
    nickname: user.nickname || user.displayId || user.uniqueId || 'Usuario de TikTok',
    avatarUrl: imageUrl(user.avatarLarge) || imageUrl(user.avatarThumb) || user.profilePicture || null,
    ...(user.userAttr?.isAdmin ? { isModerator: true } : {}),
    ...(user.userAttr?.isSuperAdmin || user.userAttr?.isChannelAdmin ? { isAdmin: true } : {}),
    ...(user.verified ? { isVerified: true } : {}),
    ...(badges.length ? { badges } : {}),
  };
}
function classifyError(error, handle) {
  const err = error?.exception || error?.cause || error || {};
  const message = String(err.message || error?.info || '').toLowerCase();
  const status = Number(err.statusCode || err.response?.statusCode || err.status);
  if (/requires a business plan|premium feature|requires.*paid.*plan/.test(message)) {
    return { error: 'Euler rechazó una consulta que requiere el plan Business. Actualiza MultiChat para usar la conexión gratuita.', stop: true };
  }
  if (status === 401 || status === 403 || /invalid.*(key|api)|unauthorized|forbidden|authentication/.test(message)) {
    return { error: 'Clave de Euler Stream inválida o sin permisos. Revísala en Canales.', stop: true };
  }
  if (status === 429 || /rate.?limit|quota/.test(message)) {
    const delay = Math.max(60000, Number(err.retryAfter) || Number(err.resetTime) - Date.now() || 0);
    return { error: 'Límite de Euler Stream alcanzado. Se reintentará cuando haya solicitudes disponibles.', delay };
  }
  if (/not.*live|offline|room.*not.*found|live.*ended/.test(message)) {
    return { error: `@${handle} no está en vivo ahora. Se comprobará de nuevo.`, delay: 30000, live: false };
  }
  // Upstream error URLs can contain credentials; display only known messages.
  return { error: 'No se pudo conectar con TikTok. Reintentando…' };
}
function createConnector({ createClient = createEulerClient, setTimeout: schedule = setTimeout, clearTimeout: cancel = clearTimeout } = {}) {
  function connect(username, callbacks = {}, options = {}) {
    const handle = String(username || '').replace(/^@/, '').trim();
    const key = String(options.eulerApiKey || '').trim();
    let client, timer, attempt = 0, stopped = false, generation = 0;
    const emit = (name, data) => callbacks[name]?.(data);
    const resetViewers = () => emit('onViewers', { platform: 'tiktok', viewers: 0 });
    function dispose(candidate) {
      if (!candidate) return;
      candidate.removeAllListeners();
      candidate.on('error', () => {});
      try { Promise.resolve(candidate.disconnect()).catch(() => {}); } catch {}
    }
    function retry(delay) {
      if (stopped || timer) return;
      const wait = delay ?? Math.min(3000 * 1.5 ** attempt++, 60000);
      timer = schedule(() => { timer = null; start(); }, wait);
    }
    function fail(err) {
      const result = classifyError(err, handle);
      generation++;
      dispose(client); client = null;
      emit('onStatus', { connected: false, error: result.error, ...(result.live === false ? { live: false } : {}) });
      resetViewers();
      if (result.stop) {
        stopped = true;
        if (timer) { cancel(timer); timer = null; }
      } else retry(result.delay);
    }
    async function start() {
      if (stopped) return;
      if (!key || !handle) {
        emit('onStatus', { connected: false, error: !key ? 'Añade tu clave de Euler Stream en Canales.' : 'Añade tu usuario de TikTok en Canales.' });
        return;
      }
      const current = ++generation;
      dispose(client); client = null;
      try {
        const candidate = await createClient(handle, {
          signApiKey: key, authenticateWs: false,
          // The extended catalogue uses Euler's Business-only signing endpoint.
          // Regular LIVE gift events already contain gift details.
          enableExtendedGiftInfo: false, processInitialData: false,
        });
        if (stopped || current !== generation) { dispose(candidate); return; }
        client = candidate;
        const on = (event, handler) => candidate.on(event, data => {
          if (!stopped && current === generation) handler(data || {});
        });
        on('connected', () => { attempt = 0; emit('onStatus', { connected: true, live: true }); });
        on('error', fail);
        on('disconnected', () => fail(new Error('disconnected')));
        on('streamEnd', () => fail(new Error('LIVE ended')));
        on('chat', event => emit('onChat', {
          ...(event.userIdentity?.isAnchor ? { isOwner: true } : {}),
          ...(event.userIdentity?.isModeratorOfAnchor ? { isModerator: true } : {}),
          ...(event.userIdentity?.isSubscriberOfAnchor ? { isSubscriber: true } : {}),
          ...(event.common?.msgId ? { messageId: String(event.common.msgId) } : {}),
          ...userFields(event.user), comment: event.content || event.comment || '',
          emotes: (event.emotes || []).map(emote => ({
            index: Number(emote.placeInComment || 0),
            url: imageUrl(emote.emote?.image) || emote.imageUrl,
          })).filter(emote => emote.url),
        }));
        on('emote', event => emit('onChat', {
          ...userFields(event.user), comment: '',
          emotes: (event.emoteList || []).map(emote => ({ index: 0, url: imageUrl(emote.image) })).filter(emote => emote.url),
        }));
        for (const [event, callback] of [['follow', 'onFollow'], ['share', 'onShare'], ['member', 'onJoin']]) {
          on(event, data => emit(callback, userFields(data.user)));
        }
        on('like', event => emit('onLike', {
          ...userFields(event.user), likeCount: Number(event.count ?? event.likeCount ?? 1),
          totalLikes: Number(event.total ?? event.totalLikeCount ?? 0),
        }));
        on('roomUser', event => emit('onViewers', { platform: 'tiktok', viewers: Number(event.total ?? event.viewerCount ?? 0) }));
        on('gift', event => {
          const gift = event.giftDetails || event.extendedGiftInfo || {};
          if (Number(gift.giftType ?? event.giftType ?? gift.gift_type) === 1 && !Number(event.repeatEnd)) return;
          emit('onGift', {
            ...userFields(event.user), giftName: gift.name || gift.giftName || event.giftName || 'Regalo',
            giftImageUrl: imageUrl(gift.giftImage || gift.image) || event.giftImageUrl || null,
            diamondCount: Number(gift.diamondCount ?? gift.diamond_count ?? event.diamondCount ?? 0),
            repeatCount: Number(event.repeatCount || 1),
          });
        });
        await candidate.connect();
        if (stopped || current !== generation) dispose(candidate);
      } catch (err) {
        if (!stopped && current === generation) fail(err);
      }
    }
    start();
    return { disconnect() {
      stopped = true; generation++;
      if (timer) { cancel(timer); timer = null; }
      dispose(client); client = null;
    } };
  }
  return { connect };
}
module.exports = { ...createConnector(), createConnector };
