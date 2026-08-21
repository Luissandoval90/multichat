// Lógica principal de la interfaz, temas, pestañas, actualizaciones, mensajes fijados, SFX y OBS de Multi Chat Overlay Pro

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

// ==========================================================================
// Base de Datos Masiva y Traductor Universal de Regalos de TikTok
// ==========================================================================
const TIKTOK_GIFTS_DICTIONARY = {
  'Rose': { es: 'Rosa', icon: '🌹', defaultDiamonds: 1 },
  'TikTok': { es: 'Logo TikTok', icon: '🎵', defaultDiamonds: 1 },
  'Ice Cream Cone': { es: 'Helado de Cono', icon: '🍦', defaultDiamonds: 1 },
  'Heart Me': { es: 'Corazón Fan', icon: '🧡', defaultDiamonds: 1 },
  'GG': { es: 'Buena Partida (GG)', icon: '🎮', defaultDiamonds: 1 },
  'Finger Heart': { es: 'Corazón Coreano', icon: '🫰', defaultDiamonds: 5 },
  'Panda': { es: 'Osito Panda', icon: '🐼', defaultDiamonds: 5 },
  'Mic': { es: 'Micrófono', icon: '🎤', defaultDiamonds: 5 },
  'Hi': { es: 'Saludito', icon: '👋', defaultDiamonds: 5 },
  'Coffee': { es: 'Taza de Café', icon: '☕', defaultDiamonds: 10 },
  'Lollipop': { es: 'Paleta Dulce', icon: '🍭', defaultDiamonds: 10 },
  'Gamepad': { es: 'Mando Gamer', icon: '🎮', defaultDiamonds: 10 },
  'Mini Crown': { es: 'Mini Corona', icon: '👑', defaultDiamonds: 10 },
  'Love Bang': { es: 'Explosión de Amor', icon: '💥', defaultDiamonds: 25 },
  'Doughnut': { es: 'Dona Glaseada', icon: '🍩', defaultDiamonds: 30 },
  'Donut': { es: 'Dona Glaseada', icon: '🍩', defaultDiamonds: 30 },
  'Perfume': { es: 'Perfume Elegante', icon: '🧴', defaultDiamonds: 20 },
  'Teddy Bear': { es: 'Oso de Peluche', icon: '🧸', defaultDiamonds: 100 },
  'Paper Crane': { es: 'Grulla de Papel', icon: '🕊️', defaultDiamonds: 99 },
  'Little Crown': { es: 'Corona Pequeña', icon: '👑', defaultDiamonds: 99 },
  'Cap': { es: 'Gorra Deportiva', icon: '🧢', defaultDiamonds: 99 },
  'Hat': { es: 'Sombrero', icon: '🎩', defaultDiamonds: 99 },
  'Confetti': { es: 'Lluvia de Confeti', icon: '🎉', defaultDiamonds: 100 },
  'Flowers': { es: 'Ramo de Flores', icon: '💐', defaultDiamonds: 100 },
  'Butterfly': { es: 'Mariposa Brillante', icon: '🦋', defaultDiamonds: 169 },
  'Sunglasses': { es: 'Gafas de Sol', icon: '😎', defaultDiamonds: 199 },
  'Goggles': { es: 'Gafas de Buceo', icon: '🥽', defaultDiamonds: 199 },
  'Kiss': { es: 'Beso Apasionado', icon: '💋', defaultDiamonds: 150 },
  'Love Balloon': { es: 'Globo de Amor', icon: '🎈', defaultDiamonds: 199 },
  'Magic Wand': { es: 'Varita Mágica', icon: '🪄', defaultDiamonds: 399 },
  'Swan': { es: 'Cisne Elegante', icon: '🦢', defaultDiamonds: 699 },
  'Train': { es: 'Tren Expreso', icon: '🚂', defaultDiamonds: 899 },
  'Fireworks': { es: 'Fuegos Artificiales', icon: '🎆', defaultDiamonds: 1088 },
  'Firework': { es: 'Fuegos Artificiales', icon: '🎆', defaultDiamonds: 1088 },
  'Mirror': { es: 'Espejo Mágico', icon: '🪞', defaultDiamonds: 1000 },
  'Money Gun': { es: 'Pistola de Billetes', icon: '💸', defaultDiamonds: 500 },
  'Whale Diving': { es: 'Ballena Saltando', icon: '🐋', defaultDiamonds: 2150 },
  'Whale': { es: 'Ballena Gigante', icon: '🐳', defaultDiamonds: 2150 },
  'Motorcycle': { es: 'Moto de Carreras', icon: '🏍️', defaultDiamonds: 2988 },
  'Car': { es: 'Auto de Lujo', icon: '🚗', defaultDiamonds: 3000 },
  'Sports Car': { es: 'Auto Deportivo', icon: '🏎️', defaultDiamonds: 7000 },
  'Supercar': { es: 'Superdeportivo', icon: '🏎️', defaultDiamonds: 7000 },
  'Yacht': { es: 'Super Yate', icon: '🛥️', defaultDiamonds: 9888 },
  'Private Jet': { es: 'Jet Privado', icon: '✈️', defaultDiamonds: 4888 },
  'Falcon': { es: 'Halcón Dorado', icon: '🦅', defaultDiamonds: 10999 },
  'Planet': { es: 'Planeta Cósmico', icon: '🪐', defaultDiamonds: 15000 },
  'Rocket': { es: 'Cohete Espacial', icon: '🚀', defaultDiamonds: 20000 },
  'Dragon': { es: 'Dragón Legendario', icon: '🐉', defaultDiamonds: 26999 },
  'Golden Dragon': { es: 'Dragón Dorado', icon: '🐉', defaultDiamonds: 26999 },
  'Lion': { es: 'León Rugiente', icon: '🦁', defaultDiamonds: 29999 },
  'Leon': { es: 'León Rugiente', icon: '🦁', defaultDiamonds: 29999 },
  'Castle': { es: 'Castillo de Cuento', icon: '🏰', defaultDiamonds: 20000 },
  'Pegasus': { es: 'Pegaso Místico', icon: '🦄', defaultDiamonds: 27999 },
  'Phoenix': { es: 'Fénix Inmortal', icon: '🔥', defaultDiamonds: 25999 },
  'TikTok Universe': { es: 'Universo TikTok', icon: '🌌', defaultDiamonds: 34999 },
  'Universe': { es: 'Universo TikTok', icon: '🌌', defaultDiamonds: 34999 },
  'TikTok Stars': { es: 'Estrellas TikTok', icon: '⭐', defaultDiamonds: 39999 },
  'Zeus': { es: 'Dios Zeus', icon: '⚡', defaultDiamonds: 34000 },
  'Poseidon': { es: 'Dios Poseidón', icon: '🔱', defaultDiamonds: 30000 },
};

const WORD_TRANSLATIONS = {
  'heart': 'Corazón', 'love': 'Amor', 'rose': 'Rosa', 'flower': 'Flor',
  'crown': 'Corona', 'star': 'Estrella', 'cat': 'Gatito', 'dog': 'Perrito',
  'bear': 'Oso', 'panda': 'Panda', 'lion': 'León', 'tiger': 'Tigre',
  'dragon': 'Dragón', 'car': 'Auto', 'bike': 'Moto', 'plane': 'Avión',
  'rocket': 'Cohete', 'whale': 'Ballena', 'dolphin': 'Delfín', 'shark': 'Tiburón',
  'bird': 'Pájaro', 'eagle': 'Águila', 'falcon': 'Halcón', 'castle': 'Castillo',
  'diamond': 'Diamante', 'gold': 'Oro', 'magic': 'Mágico', 'fire': 'Fuego',
  'firework': 'Fuegos Artificiales', 'coffee': 'Café', 'cake': 'Pastel',
  'ice cream': 'Helado', 'donut': 'Dona', 'pizza': 'Pizza', 'burger': 'Hamburguesa',
  'balloon': 'Globo', 'confetti': 'Confeti', 'kiss': 'Beso', 'universe': 'Universo',
  'galaxy': 'Galaxia', 'planet': 'Planeta', 'rainbow': 'Arcoíris', 'lightning': 'Rayo',
};

function translateGiftName(rawName) {
  if (!rawName) return 'Regalo 🎁';
  const clean = rawName.trim();
  if (TIKTOK_GIFTS_DICTIONARY[clean]) {
    const item = TIKTOK_GIFTS_DICTIONARY[clean];
    return `${item.es} ${item.icon}`;
  }

  let words = clean.split(/\s+/);
  let translatedWords = words.map(w => {
    const low = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    return WORD_TRANSLATIONS[low] || w;
  });

  return translatedWords.join(' ');
}

function formatGiftData(data) {
  const rawName = (data.giftName || '').trim();
  const dictMatch = TIKTOK_GIFTS_DICTIONARY[rawName] || null;
  const translatedName = translateGiftName(rawName);

  const diamondsPerUnit = data.diamondCount || (dictMatch ? dictMatch.defaultDiamonds : 0);
  const totalDiamonds = diamondsPerUnit * (data.repeatCount || 1);
  const isEpic = totalDiamonds >= 100 || (data.repeatCount && data.repeatCount >= 10) || rawName.toLowerCase().includes('lion') || rawName.toLowerCase().includes('universe') || rawName.toLowerCase().includes('dragon');

  return {
    translatedName,
    totalDiamonds,
    isEpic,
    imageUrl: data.giftImageUrl || null,
  };
}

// Elementos DOM
const chatContainer = document.getElementById('chat-container');
const statusBar = document.getElementById('status-bar');
const setupPanel = document.getElementById('setup-panel');
const statsBar = document.getElementById('stats-bar');
const connectBtn = document.getElementById('connect-btn');
const liveDot = document.getElementById('live-dot');
const editBtn = document.getElementById('edit-btn');
const toggleHudBtn = document.getElementById('toggle-hud-btn');
const testAlertBtn = document.getElementById('test-alert-btn');
const root = document.documentElement;

// Mensaje Fijado (Pin)
const pinnedContainer = document.getElementById('pinned-message-container');
let activePinnedData = null;

// Elementos de Estadísticas HUD
const totalViewersEl = document.getElementById('total-viewers-count');
const platformViewersContainer = document.getElementById('platform-viewers-container');
const likesCountEl = document.getElementById('likes-count');

// Elementos de TTS & Audio
const ttsOptCheck = document.getElementById('opt-tts');
const ttsVoiceSelect = document.getElementById('tts-voice-select');
const btnTestVoice = document.getElementById('btn-test-voice');
const ttsVolSlider = document.getElementById('tts-volume-slider');
const ttsRateSlider = document.getElementById('tts-rate-slider');
const ttsVolVal = document.getElementById('tts-vol-val');
const ttsRateVal = document.getElementById('tts-rate-val');
const ttsIncludeNickCheck = document.getElementById('tts-opt-include-nick');
const ttsSkipUrlsCheck = document.getElementById('tts-opt-skip-urls');

// OBS Modo
const obsUrlInput = document.getElementById('obs-url-input');
const btnCopyObs = document.getElementById('btn-copy-obs');

// Elementos de Apariencia
const opacitySlider = document.getElementById('opacity-slider');
const opacityVal = document.getElementById('opacity-val');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeVal = document.getElementById('font-size-val');
const msgSpacingSlider = document.getElementById('msg-spacing-slider');
const msgSpacingVal = document.getElementById('msg-spacing-val');

// Elementos de Actualización
const updateBanner = document.getElementById('update-banner-container');
const updateVersionTag = document.getElementById('update-version-tag');
const updateTimerText = document.getElementById('update-timer-text');
const updateProgressBar = document.getElementById('update-progress-bar');
const btnRestartUpdate = document.getElementById('btn-restart-update');
const btnDismissUpdate = document.getElementById('btn-dismiss-update');
const btnCheckUpdates = document.getElementById('btn-check-updates');
const updateStatusMsg = document.getElementById('update-status-msg');
const appVersionLabel = document.getElementById('app-version-label');

const statusLines = {};
const avatarCacheMap = new Map();
const viewersMap = new Map();
let totalLikes = 0;
let updateCountdownInterval = null;

const MAX_MESSAGES = 160;
const TRIM_BATCH = 30;
let pendingScroll = false;
let currentConfig = null;

// ==========================================================================
// 1. Mensajes Fijados (Pin Message Logic)
// ==========================================================================
function setPinnedMessage(data) {
  activePinnedData = data;
  pinnedContainer.classList.remove('hidden');

  const meta = PLATFORM_META[data.platform] || { className: 'accent', label: data.platform };
  const userNick = data.nickname || data.userId || 'Usuario';
  const commentText = data.comment || '';

  pinnedContainer.innerHTML = `
    <div class="pinned-card platform-${data.platform}">
      <div class="pinned-header-row">
        <div class="pinned-badge">📌 MENSAJE FIJADO</div>
        <button type="button" class="unpin-btn" id="btn-unpin" title="Desanclar mensaje">✕</button>
      </div>
      <div class="pinned-body">
        ${avatarHtml(data)}
        <div class="pinned-text">
          ${platformTag(data.platform)}
          <b style="color:var(--text-main); margin-right:4px;">${escapeHtml(userNick)}:</b>
          <span>${escapeHtml(commentText)}</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-unpin').addEventListener('click', () => {
    clearPinnedMessage();
  });

  if (window.overlayAPI && typeof window.overlayAPI.pinMessage === 'function') {
    window.overlayAPI.pinMessage(activePinnedData);
  }
}

function clearPinnedMessage() {
  activePinnedData = null;
  pinnedContainer.innerHTML = '';
  pinnedContainer.classList.add('hidden');
  if (window.overlayAPI && typeof window.overlayAPI.pinMessage === 'function') {
    window.overlayAPI.pinMessage(null);
  }
}

// ==========================================================================
// 2. Sistema de Clips & Google Drive
// ==========================================================================
const clipNotificationContainer = document.getElementById('clip-notification-container');
const btnOpenGdrive = document.getElementById('btn-open-gdrive');
const btnOpenLocalClips = document.getElementById('btn-open-local-clips');
const btnTestClip = document.getElementById('btn-test-clip');
const clipStatusText = document.getElementById('clip-status-text');
let clipDismissTimeout = null;

function showClipNotification(clipData) {
  if (clipDismissTimeout) clearTimeout(clipDismissTimeout);
  
  if (window.AudioAlerts && typeof window.AudioAlerts.playClipSound === 'function') {
    window.AudioAlerts.playClipSound();
  }

  const requester = clipData.requestedBy || 'Chat';
  const driveUrl = clipData.fileUrl || clipData.folderUrl || 'https://drive.google.com/drive/folders/1oT4GlKx1E5hRMcbrq6qGpdrNHuc_5MPH';

  clipNotificationContainer.classList.remove('hidden');
  clipNotificationContainer.innerHTML = `
    <div class="clip-card">
      <div class="clip-card-left">
        <div class="clip-icon-box">🎬</div>
        <div>
          <div class="clip-card-title">¡Clip Grabado por @${escapeHtml(requester)}!</div>
          <div class="clip-card-sub">Subido a tu Google Drive • ${clipData.duration || 30}s</div>
        </div>
      </div>
      <button type="button" class="btn-open-clip-link" id="btn-view-clip-drive">Ver en Drive ↗</button>
    </div>
  `;

  document.getElementById('btn-view-clip-drive').addEventListener('click', () => {
    window.overlayAPI.openExternalUrl(driveUrl);
  });

  clipDismissTimeout = setTimeout(() => {
    clipNotificationContainer.classList.add('hidden');
  }, 9000);
}

if (window.overlayAPI && window.overlayAPI.onClipCreated) {
  window.overlayAPI.onClipCreated((data) => {
    showClipNotification(data);
  });
}

let screenStream = null;
let mediaRecorder = null;
let recordedChunks = [];

async function initScreenRollingBuffer() {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
          width: 1280,
          height: 720
        },
        audio: false
      });
    } else if (window.overlayAPI && window.overlayAPI.getDesktopSources) {
      const sources = await window.overlayAPI.getDesktopSources();
      if (sources && sources.length > 0) {
        screenStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sources[0].id,
              maxWidth: 1280,
              maxHeight: 720,
              maxFrameRate: 30
            }
          }
        });
      }
    }

    if (!screenStream) return;

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(screenStream, { mimeType: 'video/webm' });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
        if (recordedChunks.length > 45) {
          recordedChunks.shift();
        }
      }
    };
    mediaRecorder.start(1000);
    console.log('[Renderer] Búfer de captura de pantalla real activo (30s-45s).');
  } catch(e) {
    console.log('[Renderer] Captura de pantalla status:', e.message);
  }
}

async function triggerClipCreation(requestedBy = 'Streamer') {
  if (!window.overlayAPI || !window.overlayAPI.createClip) return;
  
  if (clipStatusText) clipStatusText.textContent = '🎬 Descargando clip del live y subiendo a Google Drive…';

  const tiktokInput = document.getElementById('input-tiktok');
  const twitchInput = document.getElementById('input-twitch');
  const streamerName = (tiktokInput && tiktokInput.value.trim()) || 
                       currentConfig?.platforms?.tiktok?.handle || 
                       (twitchInput && twitchInput.value.trim()) || 
                       currentConfig?.platforms?.twitch?.handle || 
                       'Streamer';

  const platform = (tiktokInput && tiktokInput.value.trim()) ? 'tiktok' : 
                   ((twitchInput && twitchInput.value.trim()) ? 'twitch' : 'tiktok');

  const durationBtns = document.querySelectorAll('[data-clip-duration]');
  let chosenDuration = 30;
  durationBtns.forEach(btn => {
    if (btn.classList.contains('active')) chosenDuration = parseInt(btn.getAttribute('data-clip-duration'), 10) || 30;
  });

  const res = await window.overlayAPI.createClip({
    streamerName,
    requestedBy,
    platform,
    durationSeconds: chosenDuration,
  });

  if (res && res.success) {
    if (clipStatusText) clipStatusText.textContent = `✅ Clip guardado exitosamente en tu Google Drive`;
    setTimeout(() => { if (clipStatusText) clipStatusText.textContent = ''; }, 5000);
  } else if (res && res.cooldown) {
    if (clipStatusText) clipStatusText.textContent = `⏳ ${res.message}`;
  } else {
    if (clipStatusText) clipStatusText.textContent = `⚠ ${res ? res.error : 'Error al crear clip'}`;
  }
}

// ==========================================================================
// 2. Inicialización, Pestañas y Temas
// ==========================================================================
function initUI() {
  PLATFORMS.forEach(p => {
    const logoEl = document.getElementById(`logo-${p}`);
    if (logoEl) logoEl.innerHTML = iconMarkup(p);
  });

  // Sistema de Pestañas (Tabs)
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.add('hidden'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.remove('hidden');
    });
  });

  // Selector de Temas Visuales (Skins)
  const themeBtns = document.querySelectorAll('.theme-pill-btn');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      setAppTheme(theme);
    });
  });

  // Selector de Fuentes Tipográficas
  const fontBtns = document.querySelectorAll('.font-pill-btn');
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const font = btn.getAttribute('data-font');
      setAppFont(font);
    });
  });

  currentConfig = window.AppStorage.loadConfig();
  applyConfigToUI(currentConfig);

  // Cargar configuración persistente del disco y sincronizar
  window.AppStorage.loadAsyncConfig().then(cfg => {
    if (cfg) {
      currentConfig = cfg;
      applyConfigToUI(currentConfig);
    }
  });

  // Guardado instantáneo al escribir o cambiar cualquier opción
  setupPanel.addEventListener('input', () => {
    const cfg = gatherConfigFromUI();
    window.AppStorage.saveConfig(cfg);
  });
  setupPanel.addEventListener('change', () => {
    const cfg = gatherConfigFromUI();
    window.AppStorage.saveConfig(cfg);
  });

  // Cargar versión de la app
  if (window.overlayAPI && window.overlayAPI.getAppVersion) {
    window.overlayAPI.getAppVersion().then(v => {
      if (appVersionLabel) appVersionLabel.textContent = `v${v}`;
    }).catch(() => {});
  }

  window.AppTTS.initVoices(populateVoiceSelect);
  setTimeout(populateVoiceSelect, 300);

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

  document.getElementById('close-btn').addEventListener('click', () => window.overlayAPI.close());
  document.getElementById('minimize-btn').addEventListener('click', () => window.overlayAPI.minimize());
  editBtn.addEventListener('click', () => setupPanel.classList.toggle('hidden'));

  toggleHudBtn.addEventListener('click', () => {
    statsBar.classList.toggle('hidden');
    toggleHudBtn.classList.toggle('active-toggle', !statsBar.classList.contains('hidden'));
  });

  testAlertBtn.addEventListener('click', () => {
    window.FollowAlerts.triggerFollowAlert({
      platform: 'tiktok',
      nickname: 'Seguidor_De_Prueba',
      userId: 'test_user',
      avatarUrl: null,
    });
  });

  connectBtn.addEventListener('click', () => {
    handleConnect();
  });

  // Copiar Enlace OBS
  if (btnCopyObs) {
    btnCopyObs.addEventListener('click', () => {
      const url = obsUrlInput ? obsUrlInput.value : 'http://localhost:3750';
      navigator.clipboard.writeText(url).then(() => {
        btnCopyObs.textContent = '✓ ¡Copiado!';
        btnCopyObs.classList.add('copied');
        setTimeout(() => {
          btnCopyObs.textContent = '📋 Copiar Enlace';
          btnCopyObs.classList.remove('copied');
        }, 2200);
      }).catch(() => {
        btnCopyObs.textContent = '✓ http://localhost:3750';
      });
    });
  }

  // Clips & Google Drive Buttons
  if (btnOpenGdrive) {
    btnOpenGdrive.addEventListener('click', () => {
      window.overlayAPI.openExternalUrl('https://drive.google.com/drive/folders/1oT4GlKx1E5hRMcbrq6qGpdrNHuc_5MPH');
    });
  }

  if (btnOpenLocalClips) {
    btnOpenLocalClips.addEventListener('click', () => {
      window.overlayAPI.openClipsFolder();
    });
  }

  if (btnTestClip) {
    btnTestClip.addEventListener('click', () => {
      triggerClipCreation('Prueba_Streamer');
    });
  }

  const clipDurationBtns = document.querySelectorAll('[data-clip-duration]');
  clipDurationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      clipDurationBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Sliders de Apariencia
  opacitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    opacityVal.textContent = val + '%';
    const decimal = val / 100;
    root.style.setProperty('--bg-opacity', decimal.toFixed(2));
  });

  fontSizeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    fontSizeVal.textContent = val + 'px';
    root.style.setProperty('--font-size', val + 'px');
  });

  msgSpacingSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    msgSpacingVal.textContent = val + 'px';
    root.style.setProperty('--msg-spacing', val + 'px');
  });

  document.getElementById('opt-sound-alerts').addEventListener('change', (e) => {
    window.AudioAlerts.setSoundEnabled(e.target.checked);
  });
  document.getElementById('opt-follow-alerts').addEventListener('change', (e) => {
    window.FollowAlerts.setFollowAlertsEnabled(e.target.checked);
  });

  // TTS
  ttsOptCheck.addEventListener('change', (e) => {
    window.AppTTS.setTtsEnabled(e.target.checked);
  });

  ttsIncludeNickCheck.addEventListener('change', (e) => {
    window.AppTTS.setIncludeNickname(e.target.checked);
  });

  ttsSkipUrlsCheck.addEventListener('change', (e) => {
    window.AppTTS.setSkipUrls(e.target.checked);
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

  PLATFORMS.forEach(p => {
    const tCheck = document.getElementById(`tts-check-${p}`);
    if (tCheck) {
      tCheck.addEventListener('change', (e) => {
        window.AppTTS.setPlatformTts(p, e.target.checked);
      });
    }
  });

  // Manejo de Actualizaciones
  btnCheckUpdates.addEventListener('click', () => {
    updateStatusMsg.textContent = 'Buscando actualizaciones en GitHub…';
    window.overlayAPI.checkForUpdates();
  });

  btnRestartUpdate.addEventListener('click', () => {
    if (updateCountdownInterval) clearInterval(updateCountdownInterval);
    window.overlayAPI.restartAndInstall();
  });

  btnDismissUpdate.addEventListener('click', () => {
    if (updateCountdownInterval) clearInterval(updateCountdownInterval);
    updateBanner.classList.add('hidden');
  });

  if (currentConfig.options.autoConnect) {
    const hasEnabledPlatform = PLATFORMS.some(p => currentConfig.platforms[p]?.enabled && currentConfig.platforms[p]?.handle);
    if (hasEnabledPlatform) {
      console.log('[Renderer] Auto-conectando plataformas guardadas...');
      handleConnect(true);
    }
  }

  // Iniciar búfer de grabación continua de pantalla para clips en vivo
  setTimeout(() => {
    initScreenRollingBuffer();
  }, 1000);
}

function setAppTheme(theme) {
  const allThemes = ['cyberpunk', 'minimal', 'chroma', 'glass'];
  allThemes.forEach(t => document.body.classList.remove(`theme-${t}`));
  document.body.classList.add(`theme-${theme}`);

  const themeBtns = document.querySelectorAll('.theme-pill-btn');
  themeBtns.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-theme') === theme);
  });
  if (currentConfig && currentConfig.options) {
    currentConfig.options.theme = theme;
    window.AppStorage.saveConfig(currentConfig);
  }
}

function setAppFont(font) {
  const allFonts = ['outfit', 'minecraft', 'cyber', 'kawaii', 'classic'];
  allFonts.forEach(f => document.body.classList.remove(`font-${f}`));
  document.body.classList.add(`font-${font}`);

  const fontBtns = document.querySelectorAll('.font-pill-btn');
  fontBtns.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-font') === font);
  });

  if (currentConfig && currentConfig.options) {
    currentConfig.options.fontFamily = font;
    window.AppStorage.saveConfig(currentConfig);
  }
}

function showUpdateBanner(info) {
  if (updateCountdownInterval) clearInterval(updateCountdownInterval);

  updateVersionTag.textContent = `v${info.version || 'Nueva'}`;
  updateBanner.classList.remove('hidden');

  let secondsLeft = 10;
  updateTimerText.textContent = `Reiniciando en ${secondsLeft}s...`;
  updateProgressBar.style.width = '100%';

  updateCountdownInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      updateTimerText.textContent = `Reiniciando en ${secondsLeft}s...`;
      updateProgressBar.style.width = `${(secondsLeft / 10) * 100}%`;
    } else {
      clearInterval(updateCountdownInterval);
      updateTimerText.textContent = 'Reiniciando ahora…';
      window.overlayAPI.restartAndInstall();
    }
  }, 1000);
}

// Listeners de actualización automática
window.overlayAPI.onUpdateDownloaded((info) => {
  showUpdateBanner(info);
});

window.overlayAPI.onUpdateStatus((data) => {
  if (updateStatusMsg) {
    updateStatusMsg.textContent = data.message || '';
  }
});

function populateVoiceSelect() {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  if (!voices || voices.length === 0) return;

  const currentSelected = ttsVoiceSelect.value || (currentConfig && currentConfig.options.ttsVoice) || '';
  ttsVoiceSelect.innerHTML = '';

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

  document.getElementById('opt-auto-connect').checked = !!config.options.autoConnect;
  document.getElementById('opt-follow-alerts').checked = !!config.options.followAlerts;
  document.getElementById('opt-sound-alerts').checked = !!config.options.soundAlerts;
  document.getElementById('opt-filter-bots').checked = !!config.options.filterBotCommands;

  // Tema y Fuente
  const currentTheme = config.options.theme || 'cyberpunk';
  setAppTheme(currentTheme);

  const currentFont = config.options.fontFamily || 'outfit';
  setAppFont(currentFont);

  // TTS
  const isTtsOn = !!config.options.ttsEnabled;
  ttsOptCheck.checked = isTtsOn;
  ttsIncludeNickCheck.checked = config.options.ttsIncludeNickname !== false;
  ttsSkipUrlsCheck.checked = config.options.ttsSkipUrls !== false;

  window.AppTTS.setIncludeNickname(ttsIncludeNickCheck.checked);
  window.AppTTS.setSkipUrls(ttsSkipUrlsCheck.checked);

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

  const ttsPlats = config.options.ttsPlatforms || {};
  PLATFORMS.forEach(p => {
    const tCheck = document.getElementById(`tts-check-${p}`);
    if (tCheck) tCheck.checked = ttsPlats[p] !== false;
  });
  window.AppTTS.setTtsPlatformsConfig(ttsPlats);

  // Apariencia
  if (config.options.theme) {
    setAppTheme(config.options.theme);
  }
  if (config.options.fontFamily) {
    setAppFont(config.options.fontFamily);
  }
  if (config.options.bgOpacity) {
    const opPct = Math.round(config.options.bgOpacity * 100);
    opacitySlider.value = opPct;
    opacityVal.textContent = opPct + '%';
    root.style.setProperty('--bg-opacity', config.options.bgOpacity);
  }
  if (config.options.fontSize) {
    fontSizeSlider.value = config.options.fontSize;
    fontSizeVal.textContent = config.options.fontSize + 'px';
    root.style.setProperty('--font-size', config.options.fontSize + 'px');
  }
  if (config.options.msgSpacing) {
    msgSpacingSlider.value = config.options.msgSpacing;
    msgSpacingVal.textContent = config.options.msgSpacing + 'px';
    root.style.setProperty('--msg-spacing', config.options.msgSpacing + 'px');
  }

  // Clips & Drive
  const optClip = document.getElementById('opt-clip-enabled');
  if (optClip) optClip.checked = config.options.clipEnabled !== false;

  window.AudioAlerts.setSoundEnabled(config.options.soundAlerts);
  window.FollowAlerts.setFollowAlertsEnabled(config.options.followAlerts);
  window.AppTTS.setTtsEnabled(isTtsOn);
}

function gatherConfigFromUI() {
  const ttsPlatformsObj = {};
  PLATFORMS.forEach(p => {
    const tCheck = document.getElementById(`tts-check-${p}`);
    ttsPlatformsObj[p] = tCheck ? tCheck.checked : true;
  });

  const activeThemeBtn = document.querySelector('.theme-pill-btn.active');
  const selectedTheme = activeThemeBtn ? activeThemeBtn.getAttribute('data-theme') : 'cyberpunk';

  const activeFontBtn = document.querySelector('.font-pill-btn.active');
  const selectedFont = activeFontBtn ? activeFontBtn.getAttribute('data-font') : 'outfit';

  const config = {
    platforms: {},
    options: {
      autoConnect: document.getElementById('opt-auto-connect').checked,
      followAlerts: document.getElementById('opt-follow-alerts').checked,
      soundAlerts: document.getElementById('opt-sound-alerts').checked,
      theme: selectedTheme,
      fontFamily: selectedFont,
      ttsEnabled: ttsOptCheck.checked,
      ttsIncludeNickname: ttsIncludeNickCheck.checked,
      ttsSkipUrls: ttsSkipUrlsCheck.checked,
      ttsVoice: ttsVoiceSelect.value || '',
      ttsVolume: parseInt(ttsVolSlider.value, 10) / 100,
      ttsRate: parseInt(ttsRateSlider.value, 10) / 100,
      ttsPlatforms: ttsPlatformsObj,
      filterBotCommands: document.getElementById('opt-filter-bots').checked,
      bgOpacity: parseInt(opacitySlider.value, 10) / 100,
      fontSize: parseFloat(fontSizeSlider.value) || 13.5,
      msgSpacing: parseInt(msgSpacingSlider.value, 10) || 6,
      clipEnabled: document.getElementById('opt-clip-enabled') ? document.getElementById('opt-clip-enabled').checked : true,
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

  const tiktokKey = document.getElementById('input-tiktok-key')?.value.trim() || currentConfig?.platforms?.tiktok?.apiKey || '';
  config.platforms.tiktok.apiKey = tiktokKey;

  const twitchCid = document.getElementById('input-twitch-client-id')?.value.trim() || currentConfig?.platforms?.twitch?.clientId || '';
  const twitchSec = document.getElementById('input-twitch-client-secret')?.value.trim() || currentConfig?.platforms?.twitch?.clientSecret || '';
  config.platforms.twitch.clientId = twitchCid;
  config.platforms.twitch.clientSecret = twitchSec;

  return config;
}

// ==========================================================================
// 3. Conexión de Plataformas
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

  viewersMap.clear();
  updateViewersDisplay();
  totalLikes = 0;
  likesCountEl.textContent = '0';

  connectBtn.disabled = true;
  connectBtn.textContent = 'Conectando…';
  statusBar.innerHTML = '';
  Object.keys(statusLines).forEach(k => delete statusLines[k]);

  addSimpleMessage('Conectando a ' + requests.map(r => PLATFORM_META[r.platform].label).join(' + ') + '…', 'system');

  window.overlayAPI.connect(requests);
  setupPanel.classList.add('hidden');
}

// ==========================================================================
// 4. Barra HUD y Estadísticas en Tiempo Real
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
    viewersMap.set(data.platform, 0);
    updateViewersDisplay();
  }

  updateLiveDot();
});

function updateLiveDot() {
  const connectedBadges = Array.from(statusBar.querySelectorAll('.status-badge.connected'));
  const anyConnected = connectedBadges.length > 0;
  if (liveDot) liveDot.classList.toggle('live', anyConnected);
  const liveStatusText = document.getElementById('live-status-text');
  if (liveStatusText) {
    if (anyConnected) {
      liveStatusText.textContent = `En vivo (${connectedBadges.length})`;
      liveStatusText.style.color = '#10b981';
      liveStatusText.style.fontWeight = '700';
    } else {
      liveStatusText.textContent = 'Desconectado';
      liveStatusText.style.color = 'var(--text-sub)';
      liveStatusText.style.fontWeight = '500';
    }
  }
}

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
      html += `<span class="platform-pill" style="color:${meta.color}">${iconMarkup(platform)}${formatNumber(count)}</span>`;
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

// Likes de TikTok Robusto y Continuo
window.overlayAPI.onLikeMessage((data) => {
  const incomingTotal = parseInt(data.totalLikes, 10);
  const incomingDelta = parseInt(data.likeCount, 10);

  if (!isNaN(incomingTotal) && incomingTotal > 0) {
    totalLikes = Math.max(totalLikes, incomingTotal);
  } else if (!isNaN(incomingDelta) && incomingDelta > 0) {
    totalLikes += incomingDelta;
  } else {
    totalLikes += 1;
  }

  likesCountEl.textContent = formatNumber(totalLikes);
});

// ==========================================================================
// 5. Renderizado de Mensajes, Pin Buttons y Comandos SFX
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

// Chat
window.overlayAPI.onChatMessage((data) => {
  // Detectar comando !clip para guardar video en Google Drive
  const optClipEnabled = document.getElementById('opt-clip-enabled');
  const commentText = (data.comment || '').trim();
  if ((!optClipEnabled || optClipEnabled.checked) && /(?:^|\s)[!/.]?(clip|clipear|rec|grabar)\b/i.test(commentText)) {
    console.log('[Renderer] ¡Comando !clip detectado en el chat! Usuario:', data.nickname || data.userId, 'Comentario:', commentText);
    triggerClipCreation(data.nickname || data.userId);
  }

  const filterBots = document.getElementById('opt-filter-bots')?.checked;
  if (filterBots && data.comment && /^[!/.?#]/.test(data.comment.trim())) {
    return;
  }

  const userKey = `${data.platform}:${data.userId || data.nickname}`;

  if (data._avatarUpdate) {
    avatarCacheMap.set(userKey, data.avatarUrl);
    const pendingImgs = chatContainer.querySelectorAll(`img.avatar-pending[data-user-key="${cssEscape(userKey)}"]`);
    pendingImgs.forEach(img => {
      img.src = data.avatarUrl;
      img.classList.remove('avatar-pending');
    });
    return;
  }

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

  // Botón para Fijar Mensaje (Pin)
  const pinBtn = document.createElement('button');
  pinBtn.type = 'button';
  pinBtn.className = 'pin-btn';
  pinBtn.title = 'Fijar este mensaje arriba';
  pinBtn.innerHTML = '📌';
  pinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setPinnedMessage(data);
  });
  div.appendChild(pinBtn);

  addMessageNode(div);
});

// Follows
window.overlayAPI.onFollowMessage((data) => {
  console.log('[Renderer] Nuevo seguidor:', data);
  window.FollowAlerts.triggerFollowAlert(data);
});

// Share
window.overlayAPI.onShareMessage((data) => {
  const userKey = `${data.platform}:${data.userId || data.nickname}`;
  const knownAvatar = data.avatarUrl || avatarCacheMap.get(userKey);
  const avatar = knownAvatar
    ? `<img class="avatar" src="${knownAvatar}" alt="" loading="lazy" />`
    : avatarHtml(data);

  const div = document.createElement('div');
  div.className = `msg share platform-${data.platform}`;
  div.innerHTML = `${avatar}<span class="body">${platformTag(data.platform)}<span class="nick">${escapeHtml(data.nickname || data.userId)}</span> <span class="share-text">📢 compartió el directo</span></span>`;
  addMessageNode(div);
});

// Join
window.overlayAPI.onJoinMessage((data) => {
  const div = document.createElement('div');
  div.className = `msg join platform-${data.platform}`;
  div.innerHTML = `<span class="body">${platformTag(data.platform)}<span class="nick">${escapeHtml(data.nickname || data.userId)}</span> <span class="join-text">se unió</span></span>`;
  addMessageNode(div);
});

// Regalos en Español con Imágenes HD y Diamantes
window.overlayAPI.onGiftMessage((data) => {
  if (window.AudioAlerts && typeof window.AudioAlerts.playGiftSound === 'function') {
    window.AudioAlerts.playGiftSound();
  }

  const giftDetails = formatGiftData(data);
  const repeatMarkup = data.repeatCount > 1 ? `<span class="repeat-badge">x${data.repeatCount}</span>` : '';
  const diamondMarkup = giftDetails.totalDiamonds > 0 ? `<span class="diamond-badge">💎 ${giftDetails.totalDiamonds}</span>` : '';

  const giftImageMarkup = giftDetails.imageUrl
    ? `<img class="gift-icon" src="${giftDetails.imageUrl}" alt="" loading="lazy" />`
    : '<span style="font-size:22px">🎁</span>';

  const div = document.createElement('div');
  div.className = `msg gift platform-${data.platform}${giftDetails.isEpic ? ' epic' : ''}`;
  div.innerHTML = `
    <div class="gift-preview-box">${giftImageMarkup}</div>
    <div class="gift-info">
      <div class="gift-title-row">
        ${platformTag(data.platform)}
        <b>${escapeHtml(data.nickname || data.userId)}</b>
        <span style="color:#d1d5db; font-size:11px;">envió</span>
        <span class="gift-name-tag">${escapeHtml(giftDetails.translatedName)}</span>
        ${repeatMarkup}
      </div>
      <div class="gift-meta-row">
        ${diamondMarkup}
      </div>
    </div>
  `;

  // Botón para fijar regalo destacado
  const pinBtn = document.createElement('button');
  pinBtn.type = 'button';
  pinBtn.className = 'pin-btn';
  pinBtn.title = 'Fijar este regalo arriba';
  pinBtn.innerHTML = '📌';
  pinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setPinnedMessage({
      ...data,
      comment: `Envió ${giftDetails.translatedName} ${data.repeatCount > 1 ? 'x' + data.repeatCount : ''} ${giftDetails.totalDiamonds > 0 ? '(💎 ' + giftDetails.totalDiamonds + ')' : ''}`,
    });
  });
  div.appendChild(pinBtn);

  addMessageNode(div);
});

// Atajos y Opacidad
window.overlayAPI.onAdjustBgOpacity((delta) => {
  let currentOpacity = parseFloat(getComputedStyle(root).getPropertyValue('--bg-opacity')) || 0.45;
  currentOpacity = Math.min(0.95, Math.max(0.05, currentOpacity + delta));
  root.style.setProperty('--bg-opacity', currentOpacity.toFixed(2));
  
  if (opacitySlider) {
    const pct = Math.round(currentOpacity * 100);
    opacitySlider.value = pct;
    opacityVal.textContent = pct + '%';
  }

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
