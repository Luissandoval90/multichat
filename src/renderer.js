// Lógica principal de la interfaz y renderizado de Multi Chat Overlay Pro

const PLATFORMS = ['tiktok', 'twitch', 'kick', 'youtube'];

const PLATFORM_META = {
  tiktok:  { label: 'TikTok',  className: 'tiktok',  color: '#fe2c55' },
  twitch:  { label: 'Twitch',  className: 'twitch',  color: '#9146ff' },
  kick:    { label: 'Kick',    className: 'kick',    color: '#53fc18' },
  youtube: { label: 'YouTube', className: 'youtube', color: '#ff0000' },
};

const PLATFORM_ICONS = {
  tiktok:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82c-.9-.68-1.51-1.68-1.68-2.82H12.5v13.4c0 1.53-1.25 2.78-2.78 2.78-1.53 0-2.78-1.25-2.78-2.78s1.25-2.78 2.78-2.78c.28 0 .55.04.8.12V10.9a5.85 5.85 0 0 0-.8-.06 5.4 5.4 0 1 0 5.4 5.4V9.36a8.34 8.34 0 0 0 4.88 1.56V8.5a5.79 5.79 0 0 1-3.4-2.68z"/></svg>',
  twitch:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.3 2 3 5.7v13.6h4.6V22l3.1-2.7h4.1L21 13.4V2H4.3zm14.9 10.5-3 3h-3.7l-2.6 2.3v-2.3H6.3V4h12.9v8.5z"/><path d="M15.6 6.7h1.9v5.4h-1.9zM10.6 6.7h1.9v5.4h-1.9z"/></svg>',
  kick:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h5v5h2V6h2V4h2V2h7v6h-2v2h-2v2h-2v2h2v2h2v2h2v6h-7v-2h-2v-2h-2v-2h-2v5H3V3z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
};

function iconMarkup(platform) {
  return PLATFORM_ICONS[platform] || '';
}

// Elementos DOM
const chatContainer = document.getElementById('chat-container');
const statusBar = document.getElementById('status-bar');
const setupPanel = document.getElementById('setup-panel');
const connectBtn = document.getElementById('connect-btn');
const liveDot = document.getElementById('live-dot');
const editBtn = document.getElementById('edit-btn');
const testAlertBtn = document.getElementById('test-alert-btn');
const root = document.documentElement;

// Elementos de Estadísticas
const totalViewersEl = document.getElementById('total-viewers-count');
const platformViewersContainer = document.getElementById('platform-viewers-container');
const likesCountEl = document.getElementById('likes-count');

// Elementos de TTS
const ttsOptCheck = document.getElementById('opt-tts');
const ttsAdvancedCard = document.getElementById('tts-advanced-card');
const ttsVoiceSelect = document.getElementById('tts-voice-select');
const btnTestVoice = document.getElementById('btn-test-voice');
const ttsVolSlider = document.getElementById('tts-volume-slider');
const ttsRateSlider = document.getElementById('tts-rate-slider');
const ttsVolVal = document.getElementById('tts-vol-val');
const ttsRateVal = document.getElementById('tts-rate-val');

const statusLines = {};
const avatarCacheMap = new Map();
const viewersMap = new Map(); // platform -> number
let totalLikes = 0;

const MAX_MESSAGES = 160;
const TRIM_BATCH = 30;
let pendingScroll = false;
let currentConfig = null;

// ==========================================================================
// 1. Inicialización de la Interfaz y Carga de Configuración
// ==========================================================================
function initUI() {
  // Inyectar logos en las tarjetas
  PLATFORMS.forEach(p => {
    const logoEl = document.getElementById(`logo-${p}`);
    if (logoEl) logoEl.innerHTML = iconMarkup(p);
  });

  // Cargar configuración guardada
  currentConfig = window.AppStorage.loadConfig();
  applyConfigToUI(currentConfig);

  // Inicializar voces del sistema para TTS
  window.AppTTS.initVoices(populateVoiceSelect);
  setTimeout(populateVoiceSelect, 300);

  // Eventos de Checkbox de plataformas
  PLATFORMS.forEach(p => {
    const check = document.getElementById(`check-${p}`);
    const input = document.getElementById(`input-${p}`);
    const card = document.getElementById(`card-${p}`);
    const sub = document.getElementById(`sub-${p}`);

    if (check && input && card) {
      check.addEventListener('change', () => {
        input.disabled = !check.checked;
        card.classList.toggle('active', check.checked);
        if (sub) sub.classList.toggle('hidden', !check.checked);
        if (check.checked) input.focus();
      });
    }
  });

  // Controles de la barra de título
  document.getElementById('close-btn').addEventListener('click', () => window.overlayAPI.close());
  document.getElementById('minimize-btn').addEventListener('click', () => window.overlayAPI.minimize());
  editBtn.addEventListener('click', () => setupPanel.classList.toggle('hidden'));

  // Botón para probar alerta de seguidor
  testAlertBtn.addEventListener('click', () => {
    window.FollowAlerts.triggerFollowAlert({
      platform: 'tiktok',
      nickname: 'Seguidor_De_Prueba',
      userId: 'test_user',
      avatarUrl: null,
    });
  });

  // Botón de Conectar / Guardar
  connectBtn.addEventListener('click', () => {
    handleConnect();
  });

  // Opciones generales en tiempo real
  document.getElementById('opt-sound-alerts').addEventListener('change', (e) => {
    window.AudioAlerts.setSoundEnabled(e.target.checked);
  });
  document.getElementById('opt-follow-alerts').addEventListener('change', (e) => {
    window.FollowAlerts.setFollowAlertsEnabled(e.target.checked);
  });

  // Control de TTS
  ttsOptCheck.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    ttsAdvancedCard.classList.toggle('hidden', !isChecked);
    window.AppTTS.setTtsEnabled(isChecked);
  });

  ttsVoiceSelect.addEventListener('change', (e) => {
    window.AppTTS.setVoiceURI(e.target.value);
  });

  btnTestVoice.addEventListener('click', () => {
    window.AppTTS.testVoice('Hola, probando la voz seleccionada para el chat.');
  });

  ttsVolSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    ttsVolVal.textContent = val + '%';
    window.AppTTS.setTtsVolume(val / 100);
  });

  ttsRateSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    ttsRateVal.textContent = (val / 100).toFixed(2) + 'x';
    window.AppTTS.setTtsRate(val / 100);
  });

  // Eventos de checkboxes individuales de TTS por plataforma
  PLATFORMS.forEach(p => {
    const tCheck = document.getElementById(`tts-check-${p}`);
    if (tCheck) {
      tCheck.addEventListener('change', (e) => {
        window.AppTTS.setPlatformTts(p, e.target.checked);
      });
    }
  });

  // Auto-conectar si está habilitado y hay plataformas configuradas
  if (currentConfig.options.autoConnect) {
    const hasEnabledPlatform = PLATFORMS.some(p => currentConfig.platforms[p]?.enabled && currentConfig.platforms[p]?.handle);
    if (hasEnabledPlatform) {
      console.log('[Renderer] Auto-conectando plataformas guardadas...');
      handleConnect(true);
    }
  }
}

function populateVoiceSelect() {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  if (!voices || voices.length === 0) return;

  const currentSelected = ttsVoiceSelect.value || (currentConfig && currentConfig.options.ttsVoice) || '';
  ttsVoiceSelect.innerHTML = '';

  // Ordenar: voces en español primero
  const sortedVoices = [...voices].sort((a, b) => {
    const aEs = a.lang.startsWith('es');
    const bEs = b.lang.startsWith('es');
    if (aEs && !bEs) return -1;
    if (!aEs && bEs) return 1;
    return a.name.localeCompare(b.name);
  });

  sortedVoices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI || v.name;
    const isEs = v.lang.startsWith('es') ? '🇪🇸 ' : '';
    opt.textContent = `${isEs}${v.name} (${v.lang})`;
    if (currentSelected && (v.voiceURI === currentSelected || v.name === currentSelected)) {
      opt.selected = true;
    }
    ttsVoiceSelect.appendChild(opt);
  });

  if (!currentSelected && sortedVoices.length > 0) {
    const defaultEs = sortedVoices.find(v => v.lang.startsWith('es')) || sortedVoices[0];
    ttsVoiceSelect.value = defaultEs.voiceURI || defaultEs.name;
    window.AppTTS.setVoiceURI(ttsVoiceSelect.value);
  }
}

function applyConfigToUI(config) {
  // Aplicar plataformas
  PLATFORMS.forEach(p => {
    const pData = config.platforms[p] || {};
    const check = document.getElementById(`check-${p}`);
    const input = document.getElementById(`input-${p}`);
    const card = document.getElementById(`card-${p}`);
    const sub = document.getElementById(`sub-${p}`);

    if (check && input && card) {
      check.checked = !!pData.enabled;
      input.value = pData.handle || '';
      input.disabled = !check.checked;
      card.classList.toggle('active', check.checked);
      if (sub) sub.classList.toggle('hidden', !check.checked);
    }
  });

  // Campos específicos
  if (config.platforms.tiktok?.apiKey) {
    const keyInput = document.getElementById('input-tiktok-key');
    if (keyInput) keyInput.value = config.platforms.tiktok.apiKey;
  }
  if (config.platforms.twitch?.clientId) {
    const cidInput = document.getElementById('input-twitch-client-id');
    if (cidInput) cidInput.value = config.platforms.twitch.clientId;
  }
  if (config.platforms.twitch?.clientSecret) {
    const secInput = document.getElementById('input-twitch-client-secret');
    if (secInput) secInput.value = config.platforms.twitch.clientSecret;
  }

  // Opciones generales
  document.getElementById('opt-auto-connect').checked = !!config.options.autoConnect;
  document.getElementById('opt-follow-alerts').checked = !!config.options.followAlerts;
  document.getElementById('opt-sound-alerts').checked = !!config.options.soundAlerts;
  document.getElementById('opt-filter-bots').checked = !!config.options.filterBotCommands;

  // TTS
  const isTtsOn = !!config.options.ttsEnabled;
  ttsOptCheck.checked = isTtsOn;
  ttsAdvancedCard.classList.toggle('hidden', !isTtsOn);

  if (config.options.ttsVolume) {
    const volPct = Math.round(config.options.ttsVolume * 100);
    ttsVolSlider.value = volPct;
    ttsVolVal.textContent = volPct + '%';
    window.AppTTS.setTtsVolume(config.options.ttsVolume);
  }
  if (config.options.ttsRate) {
    const rateVal = Math.round(config.options.ttsRate * 100);
    ttsRateSlider.value = rateVal;
    ttsRateVal.textContent = config.options.ttsRate.toFixed(2) + 'x';
    window.AppTTS.setTtsRate(config.options.ttsRate);
  }
  if (config.options.ttsVoice) {
    window.AppTTS.setVoiceURI(config.options.ttsVoice);
  }

  // Plataformas activas para TTS
  const ttsPlats = config.options.ttsPlatforms || {};
  PLATFORMS.forEach(p => {
    const tCheck = document.getElementById(`tts-check-${p}`);
    if (tCheck) {
      tCheck.checked = ttsPlats[p] !== false;
    }
  });
  window.AppTTS.setTtsPlatformsConfig(ttsPlats);

  // Aplicar módulos
  window.AudioAlerts.setSoundEnabled(config.options.soundAlerts);
  window.FollowAlerts.setFollowAlertsEnabled(config.options.followAlerts);
  window.AppTTS.setTtsEnabled(isTtsOn);

  if (config.options.bgOpacity) {
    root.style.setProperty('--bg-opacity', config.options.bgOpacity);
  }
}

function gatherConfigFromUI() {
  const ttsPlatformsObj = {};
  PLATFORMS.forEach(p => {
    const tCheck = document.getElementById(`tts-check-${p}`);
    ttsPlatformsObj[p] = tCheck ? tCheck.checked : true;
  });

  const config = {
    platforms: {},
    options: {
      autoConnect: document.getElementById('opt-auto-connect').checked,
      followAlerts: document.getElementById('opt-follow-alerts').checked,
      soundAlerts: document.getElementById('opt-sound-alerts').checked,
      ttsEnabled: ttsOptCheck.checked,
      ttsVoice: ttsVoiceSelect.value || '',
      ttsVolume: parseInt(ttsVolSlider.value, 10) / 100,
      ttsRate: parseInt(ttsRateSlider.value, 10) / 100,
      ttsPlatforms: ttsPlatformsObj,
      filterBotCommands: document.getElementById('opt-filter-bots').checked,
      bgOpacity: parseFloat(getComputedStyle(root).getPropertyValue('--bg-opacity')) || 0.45,
    },
  };

  PLATFORMS.forEach(p => {
    const check = document.getElementById(`check-${p}`);
    const input = document.getElementById(`input-${p}`);
    const handle = input ? input.value.trim() : '';

    config.platforms[p] = {
      enabled: check ? check.checked : false,
      handle: handle,
    };
  });

  // Guardar API keys y credenciales
  const tiktokKey = document.getElementById('input-tiktok-key')?.value.trim() || '';
  config.platforms.tiktok.apiKey = tiktokKey;

  const twitchCid = document.getElementById('input-twitch-client-id')?.value.trim() || '';
  const twitchSec = document.getElementById('input-twitch-client-secret')?.value.trim() || '';
  config.platforms.twitch.clientId = twitchCid;
  config.platforms.twitch.clientSecret = twitchSec;

  return config;
}

// ==========================================================================
// 2. Conexión de Plataformas
// ==========================================================================
function handleConnect(isAuto = false) {
  const config = gatherConfigFromUI();
  window.AppStorage.saveConfig(config);

  const requests = [];

  PLATFORMS.forEach(p => {
    const pData = config.platforms[p];
    if (pData.enabled && pData.handle) {
      let cleanHandle = pData.handle.replace(/^@/, '');
      cleanHandle = cleanHandle.replace(/^https?:\/\/(www\.)?(tiktok\.com\/@|twitch\.tv\/|kick\.com\/)/i, '');

      const req = { platform: p, handle: cleanHandle };

      if (p === 'tiktok' && pData.apiKey) {
        req.options = { tiktoolApiKey: pData.apiKey };
      }
      if (p === 'twitch' && pData.clientId && pData.clientSecret) {
        req.options = { twitchClientId: pData.clientId, twitchClientSecret: pData.clientSecret };
      }

      requests.push(req);
    }
  });

  if (requests.length === 0) {
    if (!isAuto) {
      addSimpleMessage('⚠ No hay ninguna plataforma seleccionada con usuario escrito.', 'system');
    }
    return;
  }

  // Resetear estados y contadores de espectadores
  viewersMap.clear();
  updateViewersDisplay();

  connectBtn.disabled = true;
  connectBtn.textContent = 'Conectando…';
  statusBar.innerHTML = '';
  Object.keys(statusLines).forEach(k => delete statusLines[k]);

  addSimpleMessage('Conectando a ' + requests.map(r => PLATFORM_META[r.platform].label).join(' + ') + '…', 'system');

  window.overlayAPI.connect(requests);
  setupPanel.classList.add('hidden');
}

// ==========================================================================
// 3. Barra de Estado y Estadísticas en Vivo
// ==========================================================================
function ensureStatusLine(platform) {
  if (statusLines[platform]) return statusLines[platform];
  const meta = PLATFORM_META[platform] || { label: platform, className: platform };
  const badge = document.createElement('div');
  badge.className = 'status-badge connecting';
  badge.innerHTML = `${iconMarkup(platform)}<span>${meta.label}: Conectando…</span>`;
  statusBar.appendChild(badge);
  statusLines[platform] = badge;
  return badge;
}

window.overlayAPI.onPlatformStatus((data) => {
  connectBtn.disabled = false;
  connectBtn.textContent = 'Guardar y Conectar';

  if (data.platform === 'general') {
    addSimpleMessage(data.error || 'Error de conexión', 'system');
    return;
  }

  const badge = ensureStatusLine(data.platform);
  const meta = PLATFORM_META[data.platform] || { label: data.platform };

  if (data.connected) {
    badge.className = 'status-badge connected';
    badge.innerHTML = `${iconMarkup(data.platform)}<span>${meta.label}: En vivo</span>`;
  } else {
    badge.className = 'status-badge error';
    badge.innerHTML = `${iconMarkup(data.platform)}<span>${meta.label}: ${data.error || 'Desconectado'}</span>`;
    
    // Si se desconecta, resetear espectadores de esa plataforma
    viewersMap.set(data.platform, 0);
    updateViewersDisplay();
  }

  updateLiveDot();
});

function updateLiveDot() {
  const anyConnected = Array.from(statusBar.querySelectorAll('.status-badge')).some(b => b.classList.contains('connected'));
  liveDot.classList.toggle('live', anyConnected);
}

// Actualización Robusta de Espectadores
function formatNumber(num) {
  if (!num || num < 0 || isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(Math.floor(num));
}

function updateViewersDisplay() {
  let total = 0;
  let html = '';

  PLATFORMS.forEach(platform => {
    const isConnected = statusLines[platform] && statusLines[platform].classList.contains('connected');
    const count = viewersMap.get(platform) || 0;
    
    if (isConnected || count > 0) {
      total += count;
      const meta = PLATFORM_META[platform] || { color: '#888' };
      html += `<span class="platform-viewers-tag" style="color:${meta.color}">${iconMarkup(platform)}${formatNumber(count)}</span> `;
    }
  });

  totalViewersEl.textContent = formatNumber(total);
  platformViewersContainer.innerHTML = html;
}

window.overlayAPI.onViewersUpdate((data) => {
  if (data.platform) {
    const count = Math.max(0, parseInt(data.viewers, 10) || 0);
    viewersMap.set(data.platform, count);
    updateViewersDisplay();
  }
});

// Actualización de Likes de TikTok
window.overlayAPI.onLikeMessage((data) => {
  if (data.totalLikes && data.totalLikes > totalLikes) {
    totalLikes = data.totalLikes;
    likesCountEl.textContent = formatNumber(totalLikes);
  } else if (data.likeCount) {
    totalLikes += data.likeCount;
    likesCountEl.textContent = formatNumber(totalLikes);
  }
});

// ==========================================================================
// 4. Renderizado de Mensajes y Chat
// ==========================================================================
function scheduleScroll() {
  if (pendingScroll) return;
  pendingScroll = true;
  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
    pendingScroll = false;
  });
}

function trimIfNeeded() {
  const extra = chatContainer.children.length - MAX_MESSAGES;
  if (extra > 0) {
    const toRemove = Math.max(extra, TRIM_BATCH);
    for (let i = 0; i < toRemove && chatContainer.firstChild; i++) {
      chatContainer.removeChild(chatContainer.firstChild);
    }
  }
}

function addMessageNode(node) {
  const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 90;
  chatContainer.appendChild(node);
  trimIfNeeded();
  if (isNearBottom) scheduleScroll();
}

function addSimpleMessage(html, cls) {
  const div = document.createElement('div');
  div.className = 'msg' + (cls ? ' ' + cls : '');
  div.innerHTML = html;
  addMessageNode(div);
}

function platformTag(platform) {
  const meta = PLATFORM_META[platform] || { label: platform, className: platform };
  return `<span class="platform-tag ${meta.className}">${iconMarkup(platform)}${meta.label}</span>`;
}

function avatarHtml(data) {
  if (data.avatarUrl) {
    return `<img class="avatar" src="${data.avatarUrl}" alt="" loading="lazy" />`;
  }
  const initial = (data.nickname || data.userId || '?').charAt(0).toUpperCase();
  const meta = PLATFORM_META[data.platform] || { className: 'accent' };
  return `<span class="avatar placeholder" style="background:var(--${meta.className}, #888)">${initial}</span>`;
}

// Mensajes de Chat
window.overlayAPI.onChatMessage((data) => {
  const filterBots = document.getElementById('opt-filter-bots')?.checked;
  if (filterBots && data.comment && /^[!/.?#]/.test(data.comment.trim())) {
    return;
  }

  const userKey = `${data.platform}:${data.userId || data.nickname}`;

  // Actualización asíncrona de avatar (Twitch Helix)
  if (data._avatarUpdate) {
    avatarCacheMap.set(userKey, data.avatarUrl);
    const pendingImgs = chatContainer.querySelectorAll(`img.avatar-pending[data-user-key="${cssEscape(userKey)}"]`);
    pendingImgs.forEach(img => {
      img.src = data.avatarUrl;
      img.classList.remove('avatar-pending');
    });
    return;
  }

  // Lectura por voz (TTS) con filtro por plataforma
  window.AppTTS.speakMessage(data);

  const commentHtml = buildCommentHtml(data.comment, data.emotes);
  const div = document.createElement('div');
  div.className = `msg platform-${data.platform}`;

  const nickColor = data.color || null;
  const nickStyle = nickColor ? ` style="color:${escapeAttr(nickColor)}"` : '';

  const knownAvatar = data.avatarUrl || avatarCacheMap.get(userKey);
  const avatar = knownAvatar
    ? `<img class="avatar" src="${knownAvatar}" alt="" loading="lazy" />`
    : avatarHtml(data).replace('class="avatar placeholder"', `class="avatar placeholder avatar-pending" data-user-key="${escapeAttr(userKey)}"`);

  div.innerHTML = `${avatar}<span class="body">${platformTag(data.platform)}<span class="nick"${nickStyle}>${escapeHtml(data.nickname || data.userId)}</span>${commentHtml}</span>`;
  addMessageNode(div);
});

// Eventos de nuevos Seguidores (Follows)
window.overlayAPI.onFollowMessage((data) => {
  console.log('[Renderer] Nuevo seguidor detectado:', data);
  window.FollowAlerts.triggerFollowAlert(data);
});

// Eventos de Compartidos (Share)
window.overlayAPI.onShareMessage((data) => {
  addSimpleMessage(
    `${platformTag(data.platform)}<span class="share-icon">📢 ↗</span> <b>${escapeHtml(data.nickname || data.userId)}</b> compartió el directo`,
    'share'
  );
});

// Mensajes de unión
window.overlayAPI.onJoinMessage((data) => {
  addSimpleMessage(
    `${platformTag(data.platform)} <span>→</span> <b>${escapeHtml(data.nickname || data.userId)}</b> se unió`,
    'join'
  );
});

// Regalos / SuperChats con Diamantes
window.overlayAPI.onGiftMessage((data) => {
  if (window.AudioAlerts && typeof window.AudioAlerts.playGiftSound === 'function') {
    window.AudioAlerts.playGiftSound();
  }

  const times = data.repeatCount > 1 ? `<span class="repeat">x${data.repeatCount}</span>` : '';
  const diamonds = data.diamondCount && data.diamondCount > 0 ? `<span class="diamond-badge">💎 ${data.diamondCount * (data.repeatCount || 1)}</span>` : '';
  const isEpic = (data.diamondCount && data.diamondCount >= 50) || (data.repeatCount && data.repeatCount >= 10);

  const icon = data.giftImageUrl
    ? `<img class="gift-icon" src="${data.giftImageUrl}" alt="" loading="lazy" />`
    : '<span style="font-size:22px">🎁</span>';

  const div = document.createElement('div');
  div.className = `msg gift platform-${data.platform}${isEpic ? ' epic' : ''}`;
  div.innerHTML = `${icon}<span class="body">${platformTag(data.platform)}<b>${escapeHtml(data.nickname || data.userId)}</b> envió <span class="gift-name">${escapeHtml(data.giftName || 'un regalo')}</span>${times}${diamonds}</span>`;
  addMessageNode(div);
});

// Atajos y Opacidad
window.overlayAPI.onAdjustBgOpacity((delta) => {
  let currentOpacity = parseFloat(getComputedStyle(root).getPropertyValue('--bg-opacity')) || 0.45;
  currentOpacity = Math.min(0.95, Math.max(0.05, currentOpacity + delta));
  root.style.setProperty('--bg-opacity', currentOpacity.toFixed(2));
  
  if (currentConfig && currentConfig.options) {
    currentConfig.options.bgOpacity = currentOpacity;
    window.AppStorage.saveConfig(currentConfig);
  }
});

window.overlayAPI.onClickThroughChanged((active) => {
  document.body.style.outline = active ? '1px dashed rgba(255,255,255,0.3)' : 'none';
});

// Utilidades
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}

function cssEscape(str) {
  if (window.CSS && CSS.escape) return CSS.escape(str);
  return String(str).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function buildCommentHtml(comment, emotes) {
  const text = comment || '';
  if (!emotes || emotes.length === 0) {
    return text ? ': ' + escapeHtml(text) : '';
  }

  const sorted = [...emotes].sort((a, b) => a.index - b.index);
  let result = text ? ': ' : ' ';
  let cursor = 0;

  for (const e of sorted) {
    const pos = Math.max(0, Math.min(e.index, text.length));
    result += escapeHtml(text.slice(cursor, pos));
    result += `<img class="emote" src="${e.url}" alt="${e.alt || 'emote'}" loading="lazy" />`;
    cursor = e.length ? pos + e.length : pos;
  }
  result += escapeHtml(text.slice(cursor));
  return result;
}

// Arrancar al cargar la ventana
document.addEventListener('DOMContentLoaded', initUI);
