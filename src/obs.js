let pendingObsScroll = false;

    const chatContainer = document.getElementById('chat-container');
    const pinnedContainer = document.getElementById('pinned-message-container');
    const obsStatus = document.getElementById('obs-status');
    const root = document.documentElement;

    const MAX_MESSAGES = 60;
    let ws = null;
    let reconnectTimer = null;

    const PLATFORM_ICONS = {
      tiktok:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82c-.9-.68-1.51-1.68-1.68-2.82H12.5v13.4c0 1.53-1.25 2.78-2.78 2.78-1.53 0-2.78-1.25-2.78-2.78s1.25-2.78 2.78-2.78c.28 0 .55.04.8.12V10.9a5.85 5.85 0 0 0-.8-.06 5.4 5.4 0 1 0 5.4 5.4V9.36a8.34 8.34 0 0 0 4.88 1.56V8.5a5.79 5.79 0 0 1-3.4-2.68z"/></svg>',
      twitch:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.3 2 3 5.7v13.6h4.6V22l3.1-2.7h4.1L21 13.4V2H4.3zm14.9 10.5-3 3h-3.7l-2.6 2.3v-2.3H6.3V4h12.9v8.5z"/><path d="M15.6 6.7h1.9v5.4h-1.9zM10.6 6.7h1.9v5.4h-1.9z"/></svg>',
      kick:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h5v5h2V6h2V4h2V2h7v6h-2v2h-2v2h-2v2h2v2h2v2h2v6h-7v-2h-2v-2h-2v-2h-2v5H3V3z"/></svg>',
      youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    };

    function iconMarkup(platform) {
      return PLATFORM_ICONS[platform] || '';
    }

    function escapeHtml(str) {
      return window.SafeContent.escape(str);
    }

    function addMessageNode(node) {
      chatContainer.appendChild(node);
      while (chatContainer.children.length > MAX_MESSAGES) {
        chatContainer.removeChild(chatContainer.firstChild);
      }
      if (!pendingObsScroll) {
        pendingObsScroll = true;
        requestAnimationFrame(() => { chatContainer.scrollTop = chatContainer.scrollHeight; pendingObsScroll = false; });
      }
    }

    function platformTag(platform) {
      platform = window.SafeContent.platform(platform);
      return `<span class="platform-tag ${platform}" title="${platform}" aria-label="${platform}">${iconMarkup(platform)}<span class="platform-name">${platform.toUpperCase()}</span></span>`;
    }

    function avatarHtml(data) {
      const url = window.SafeContent.mediaUrl(data.avatarUrl);
      if (url) {
        return `<img class="avatar" src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
      }
      const initial = (data.nickname || data.userId || '?').charAt(0).toUpperCase();
      return `<span class="avatar placeholder" style="background:var(--${window.SafeContent.platform(data.platform)}, #888)">${escapeHtml(initial)}</span>`;
    }

    function renderChatMessage(data) {
      const div = document.createElement('div');
      div.className = `msg platform-${data.platform}`;
      div.innerHTML = `${avatarHtml(data)}<span class="body"><span class="message-header">${platformTag(data.platform)}${window.ChatPresentation.badgeMarkup(data)}<span class="nick">${escapeHtml(data.nickname || data.userId)}</span></span><span class="message-text">${escapeHtml(data.comment)}</span></span>`;
      addMessageNode(div);
    }

    function renderGiftMessage(data) {
      const gift = window.ChatPresentation.gift(data);
      const repeatMarkup = gift.count > 1 ? `<span class="repeat-badge">x${gift.count}</span>` : '';
      const diamondMarkup = gift.totalDiamonds > 0 ? `<span class="diamond-badge">💎 ${gift.totalDiamonds}</span>` : gift.amount ? `<span class="amount-badge">${escapeHtml(gift.amount)}</span>` : '';
      const giftImg = gift.imageUrl ? `<div class="gift-preview-box"><img class="gift-icon" src="${escapeHtml(gift.imageUrl)}" alt="" referrerpolicy="no-referrer" /></div>` : '';

      const div = document.createElement('div');
      div.className = `msg gift platform-${data.platform}`;
      div.innerHTML = `
        ${giftImg}
        <div class="gift-info">
          <div class="gift-title-row">
            ${platformTag(data.platform)}
            <b>${escapeHtml(data.nickname || data.userId)}</b>
            <span style="color:#d1d5db; font-size:11px;">envió</span>
            <span class="gift-name-tag">${escapeHtml(gift.name)}</span>
            ${repeatMarkup}
          </div>
          <div class="gift-meta-row">${diamondMarkup}</div>
          ${data.comment ? `<div class="gift-comment">${escapeHtml(String(data.comment).slice(0, 1000))}</div>` : ''}
        </div>
      `;
      addMessageNode(div);
    }

    function renderJoinMessage(data) {
      window.ChatPresence.renderJoin(data, chatContainer, platformTag, addMessageNode);
    }

    function renderClipMessage(data) {
      if (!data) return;
      const div = document.createElement('div');
      div.className = 'msg clip-card';
      div.style.margin = '4px 0';
      div.innerHTML = `
        <div class="clip-card-left">
          <div class="clip-icon-box">🎬</div>
          <div>
            <div class="clip-card-title">¡Clip Grabado por @${escapeHtml(data.requestedBy || 'Chat')}!</div>
            <div class="clip-card-sub">Guardado en Google Drive • ${data.duration || 30}s</div>
          </div>
        </div>
      `;
      chatContainer.appendChild(div);
      setTimeout(() => { try { div.remove(); } catch(e){} }, 9000);
      window.scrollTo(0, document.body.scrollHeight);
    }

    function renderPinnedMessage(data) {
      if (!data) {
        pinnedContainer.innerHTML = '';
        pinnedContainer.classList.add('hidden');
        return;
      }
      pinnedContainer.classList.remove('hidden');
      pinnedContainer.innerHTML = `
        <div class="pinned-card platform-${data.platform}">
          <div class="pinned-badge">📌 MENSAJE FIJADO</div>
          <div class="pinned-body">
            ${avatarHtml(data)}
            <div class="pinned-text">
              <b>${escapeHtml(data.nickname || data.userId)}:</b> ${escapeHtml(data.comment)}
            </div>
          </div>
        </div>
      `;
    }

    function connectWebSocket() {
      const host = window.location.host || 'localhost:3750';
      const wsUrl = `ws://${host}/ws`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          obsStatus.style.display = 'none';
          console.log('[OBS Browser Source] Conectado al servidor local de MultiChat');
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'chat') renderChatMessage(msg.data);
            if (msg.type === 'join') renderJoinMessage(msg.data);
            if (msg.type === 'gift') renderGiftMessage(msg.data);
            if (msg.type === 'clip') renderClipMessage(msg.data);
            if (msg.type === 'follow' && window.FollowAlerts) window.FollowAlerts.triggerFollowAlert(msg.data);
            if (msg.type === 'pin') renderPinnedMessage(msg.data);
            if (msg.type === 'config') {
              if (msg.data.theme) document.body.className = `theme-${msg.data.theme}`;
              if (msg.data.fontFamily) {
                const allFonts = ['outfit', 'minecraft', 'cyber', 'kawaii', 'classic'];
                allFonts.forEach(f => document.body.classList.remove(`font-${f}`));
                document.body.classList.add(`font-${msg.data.fontFamily}`);
              }
              if (msg.data.fontSize) root.style.setProperty('--font-size', msg.data.fontSize + 'px');
              if (msg.data.msgSpacing) root.style.setProperty('--msg-spacing', msg.data.msgSpacing + 'px');
            }
          } catch (err) {
            console.error('[OBS] Error parseando mensaje:', err);
          }
        };

        ws.onclose = () => {
          obsStatus.style.display = 'block';
          obsStatus.textContent = 'Reconectando con MultiChat…';
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              connectWebSocket();
            }, 2500);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectWebSocket();
          }, 3000);
        }
      }
    }

    connectWebSocket();
