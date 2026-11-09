(function (root) {
  const safe = typeof module !== 'undefined' ? require('./safe-content') : root.SafeContent;
  class ConnectionTransitions {
    constructor() { this.states = new Map(); }
    update(data) {
      const platform = safe.platform(data.platform);
      if (platform === 'unknown') return null;
      const previous = this.states.get(platform);
      const kind = data.live === false ? 'offline' : data.connected ? (data.live === true ? 'live' : 'chat') : 'disconnected';
      this.states.set(platform, kind);
      if (previous === kind) return null;
      return { platform, kind, sound: kind === 'offline' || (kind === 'disconnected' && ['chat', 'live'].includes(previous)) };
    }
  }
  const definitions = {
    owner: ['Creador', 'M3 7l4 3 5-7 5 7 4-3-3 13H6Z'],
    moderator: ['Moderador', 'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6Zm-4 10 3 3 5-6'],
    admin: ['Administrador', 'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6Zm0 5v7m0 3h.01'],
    vip: ['VIP', 'm12 2 10 10-10 10L2 12Z'],
    subscriber: ['Suscriptor', 'm12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z'],
    verified: ['Verificado', 'm5 12 4 4L19 6'],
  };
  function badges(data) {
    const result = [], roles = new Set();
    const nativeTwitch = { owner: 'assets/badges/twitch-owner.png', moderator: 'assets/badges/twitch-moderator.png', vip: 'assets/badges/twitch-vip.png' };
    const add = role => { if (definitions[role] && !roles.has(role)) { roles.add(role); result.push({ role, label: definitions[role][0], imageUrl: data.platform === 'twitch' ? nativeTwitch[role] || '' : '' }); } };
    if (data.isOwner) add('owner');
    if (data.isModerator) add('moderator');
    if (data.isAdmin) add('admin');
    if (data.isVerified) add('verified');
    if (data.isMembership || data.isSubscriber) add('subscriber');
    const aliases = { broadcaster: 'owner', owner: 'owner', moderator: 'moderator', lead_moderator: 'moderator', admin: 'admin', staff: 'admin', vip: 'vip', subscriber: 'subscriber', founder: 'subscriber', sub: 'subscriber', verified: 'verified', partner: 'verified' };
    if (Array.isArray(data.badges)) {
      for (const badge of data.badges.slice(0, 12)) {
        const imageUrl = safe.mediaUrl(badge.imageUrl || badge.image?.urlList?.[0] || badge.image?.url?.[0]);
        const role = aliases[String(badge.type || badge.name || '').toLowerCase()];
        if (imageUrl) {
          if (role && roles.has(role)) continue;
          if (role) roles.add(role);
          result.push({ role: role || 'native', label: String(badge.label || badge.name || badge.title || 'Insignia').slice(0, 80), imageUrl, text: String(badge.text || '').slice(0, 8) });
        } else if (role) add(role);
      }
    } else if (data.badges && typeof data.badges === 'object') {
      for (const name of Object.keys(data.badges)) if (aliases[name]) add(aliases[name]);
    }
    return result.slice(0, 6);
  }
  function badgeMarkup(data) {
    return badges(data).map(badge => {
      const label = safe.escape(badge.label);
      return badge.imageUrl ? `<span class="native-badge-wrap" title="${label}"><img class="user-badge native-badge" src="${safe.escape(badge.imageUrl)}" alt="${label}" loading="lazy" referrerpolicy="no-referrer" />${badge.text ? `<span class="badge-caption">${safe.escape(badge.text)}</span>` : ''}</span>` : `<span class="user-badge role-${badge.role}" role="img" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${definitions[badge.role][1]}"/></svg></span>`;
    }).join('');
  }
  function gift(data) {
    const count = Math.max(1, Math.min(1000000, Math.floor(Number(data.repeatCount) || 1)));
    const diamonds = data.platform === 'tiktok' ? Math.max(0, Number(data.diamondCount) || 0) : 0;
    return { name: String(data.giftName || 'Regalo').slice(0, 200), imageUrl: safe.mediaUrl(data.giftImageUrl), count, totalDiamonds: Math.min(diamonds * count, Number.MAX_SAFE_INTEGER), amount: String(data.amount || '').slice(0, 80) };
  }
  const api = { ConnectionTransitions, badges, badgeMarkup, gift };
  if (typeof module !== 'undefined') module.exports = api; else root.ChatPresentation = api;
})(typeof window !== 'undefined' ? window : globalThis);
