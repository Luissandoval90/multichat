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

function formatGiftData(data) { return window.ChatPresentation.gift(data); }

// Elementos DOM
const chatContainer = document.getElementById('chat-container');
const setupPanel = document.getElementById('setup-panel');
const statsBar = document.getElementById('stats-bar');
const connectBtn = document.getElementById('connect-btn');
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
const ttsSkipBotsCheck = document.getElementById('tts-opt-skip-bots');
const ttsBotNamesInput = document.getElementById('tts-bot-names');

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
const chatTools = window.ChatTools.create({ container: chatContainer, maxMessages: MAX_MESSAGES });
const TRIM_BATCH = 30;
let pendingScroll = false;
let currentConfig = null;
let applyingConfig = false;

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

async function triggerClipCreation(requestedBy = 'Streamer', sourcePlatform = null) {
  if (!window.overlayAPI || !window.overlayAPI.createClip) return;

  const cfg = (window.AppStorage && typeof window.AppStorage.loadConfig === 'function') 
    ? window.AppStorage.loadConfig() 
    : currentConfig;
  
  // Determinar la plataforma correcta del mensaje
  let platform = sourcePlatform;
  if (!platform) {
    if (cfg?.platforms?.tiktok?.enabled && cfg?.platforms?.tiktok?.handle) platform = 'tiktok';
    else if (cfg?.platforms?.twitch?.enabled && cfg?.platforms?.twitch?.handle) platform = 'twitch';
    else if (cfg?.platforms?.kick?.enabled && cfg?.platforms?.kick?.handle) platform = 'kick';
    else if (cfg?.platforms?.youtube?.enabled && cfg?.platforms?.youtube?.handle) platform = 'youtube';
    else platform = 'tiktok';
  }

  const streamerName = cfg?.platforms?.[platform]?.handle || 
                       document.getElementById(`input-${platform}`)?.value?.trim() || 
                       'Streamer';

  const durationBtns = document.querySelectorAll('[data-clip-duration]');
  let chosenDuration = 30;
  durationBtns.forEach(btn => {
    if (btn.classList.contains('active')) {
      chosenDuration = parseInt(btn.getAttribute('data-clip-duration'), 10) || 30;
    }
  });

  if (clipStatusText) clipStatusText.textContent = `🎬 Grabando clip para @${requestedBy} (${chosenDuration}s)…`;

  const res = await window.overlayAPI.createClip({
    streamerName,
    requestedBy,
    platform,
    durationSeconds: chosenDuration,
  });

  if (res && res.success) {
    if (clipStatusText) clipStatusText.textContent = `✅ ¡Clip de @${requestedBy} guardado en Google Drive!`;
    setTimeout(() => { if (clipStatusText) clipStatusText.textContent = ''; }, 5000);
  } else if (res && res.cooldown) {
    if (clipStatusText) clipStatusText.textContent = `⏳ ${res.message}`;
    addSimpleMessage(`⏳ @${requestedBy}: ${res.message}`, 'system');
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
  const themeBtns = document.querySelectorAll('[data-theme]');
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

  function autoSaveAllConfig() {
    if (applyingConfig) return;
    const cfg = gatherConfigFromUI();
    currentConfig = cfg;
    window.AppStorage.saveConfig(cfg);
  }

  // Guardado instantáneo global en cualquier entrada de texto, pegado o cambio
  ['input', 'change', 'blur'].forEach(evtType => {
    document.addEventListener(evtType, (e) => {
      if (e.target?.closest('#setup-panel') && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
        autoSaveAllConfig();
      }
    });
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

    if (input) {
      input.addEventListener('input', () => {
        if (input.value.trim().length > 0 && check && !check.checked) {
          check.checked = true;
          input.disabled = false;
          if (card) card.classList.add('active');
          if (sub) sub.classList.remove('hidden');
        }
        autoSaveAllConfig();
      });
    }

    if (check && input && card) {
      check.addEventListener('change', () => {
        input.disabled = !check.checked;
        card.classList.toggle('active', check.checked);
        if (sub) sub.classList.toggle('hidden', !check.checked);
        if (check.checked) input.focus();
        autoSaveAllConfig();
      });
    }
  });

  document.getElementById('close-btn').addEventListener('click', () => window.overlayAPI.close());
  document.getElementById('minimize-btn').addEventListener('click', () => window.overlayAPI.minimize());
  editBtn.addEventListener('click', () => setupPanel.classList.toggle('hidden'));
  document.getElementById('lock-btn').addEventListener('click', () => {
    window.overlayAPI.setClickThrough(document.getElementById('lock-btn').getAttribute('aria-pressed') !== 'true');
  });

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
        btnCopyObs.textContent = 'Copiado';
        btnCopyObs.classList.add('copied');
        setTimeout(() => {
          btnCopyObs.textContent = 'Copiar';
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
      autoSaveAllConfig();
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
  ttsSkipBotsCheck.addEventListener('change', event => {
    window.AppTTS.setSkipBots(event.target.checked);
    ttsBotNamesInput.disabled = !event.target.checked;
  });
  ttsBotNamesInput.addEventListener('input', () => window.AppTTS.setBotNames(ttsBotNamesInput.value));

  ttsSkipUrlsCheck.addEventListener('change', (e) => {
    window.AppTTS.setSkipUrls(e.target.checked);
  });

  ttsVoiceSelect.addEventListener('change', (e) => {
    window.AppTTS.setVoiceURI(e.target.value);
  });

  btnTestVoice.addEventListener('click', () => {
    window.AppTTS.testVoice(ttsIncludeNickCheck.checked ? 'Ana dice: Hola, bienvenidos.' : 'Hola, bienvenidos.');
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


}

function setAppTheme(theme) {
  const themeMap = {
    cyberpunk: 'obsidian',
    minimal: 'matte',
    chroma: 'contrast',
    glass: 'clear',
  };
  const normalizedTheme = themeMap[theme] || theme || 'obsidian';

  const allThemes = ['obsidian', 'matte', 'contrast', 'clear', 'cyberpunk', 'minimal', 'chroma', 'glass'];
  allThemes.forEach(t => document.body.classList.remove(`theme-${t}`));
  document.body.classList.add(`theme-${normalizedTheme}`);

  const themeBtns = document.querySelectorAll('[data-theme]');
  themeBtns.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-theme') === normalizedTheme);
  });
  if (currentConfig && currentConfig.options && !applyingConfig) {
    currentConfig.options.theme = normalizedTheme;
    window.AppStorage.saveConfig(currentConfig);
  }
}

function setAppFont(font) {
  const fontMap = {
    cyber: 'outfit',
  };
  const normalizedFont = fontMap[font] || font || 'outfit';

  const allFonts = ['outfit', 'minecraft', 'cyber', 'kawaii', 'classic'];
  allFonts.forEach(f => document.body.classList.remove(`font-${f}`));
  document.body.classList.add(`font-${normalizedFont}`);

  const fontBtns = document.querySelectorAll('.font-pill-btn');
  fontBtns.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-font') === normalizedFont);
  });

  if (currentConfig && currentConfig.options && !applyingConfig) {
    currentConfig.options.fontFamily = normalizedFont;
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
  const voices = window.AppTTS.getAvailableVoices();
  if (!voices || voices.length === 0) return;

  const currentSelected = ttsVoiceSelect.value || (currentConfig && currentConfig.options.ttsVoice) || '';
  ttsVoiceSelect.innerHTML = '';

  const sortedVoices = [...voices].sort((a, b) => {
    if (a.voiceURI.startsWith('piper:')) return -1;
    if (b.voiceURI.startsWith('piper:')) return 1;
    const aEs = a.lang.startsWith('es');
    const bEs = b.lang.startsWith('es');
    if (aEs && !bEs) return -1;
    if (!aEs && bEs) return 1;
    return a.name.localeCompare(b.name);
  });

  sortedVoices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI || v.name;
    opt.textContent = v.voiceURI.startsWith('piper:') ? v.name : `${v.name} (${v.lang})`;
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
  if (!config) return;
  applyingConfig = true;
  try {

  PLATFORMS.forEach(p => {
    const pData = config.platforms?.[p] || {};
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

  const keyInput = document.getElementById('input-tiktok-key');
  if (keyInput) keyInput.value = config.platforms?.tiktok?.eulerApiKey || '';

  const cidInput = document.getElementById('input-twitch-client-id');
  if (cidInput) cidInput.value = config.platforms?.twitch?.clientId || '';

  const secInput = document.getElementById('input-twitch-client-secret');
  if (secInput) secInput.value = config.platforms?.twitch?.clientSecret || '';

  document.getElementById('opt-auto-connect').checked = !!config.options.autoConnect;
  document.getElementById('opt-follow-alerts').checked = !!config.options.followAlerts;
  document.getElementById('opt-sound-alerts').checked = !!config.options.soundAlerts;
  document.getElementById('opt-filter-bots').checked = !!config.options.filterBotCommands;
  document.querySelectorAll('[data-clip-duration]').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.clipDuration) === (Number(config.options.clipDuration) || 30));
  });

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
  ttsSkipBotsCheck.checked = config.options.ttsSkipBots !== false;
  ttsBotNamesInput.value = String(config.options.ttsBotNames || '');
  ttsBotNamesInput.disabled = !ttsSkipBotsCheck.checked;

  window.AppTTS.setIncludeNickname(ttsIncludeNickCheck.checked);
  window.AppTTS.setSkipUrls(ttsSkipUrlsCheck.checked);
  window.AppTTS.setSkipBots(ttsSkipBotsCheck.checked);
  window.AppTTS.setBotNames(ttsBotNamesInput.value);

  if (config.options.ttsVolume !== undefined) {
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
  } finally { applyingConfig = false; }
}

function gatherConfigFromUI() {
  const ttsPlatformsObj = {};
  PLATFORMS.forEach(p => {
    const tCheck = document.getElementById(`tts-check-${p}`);
    ttsPlatformsObj[p] = tCheck ? tCheck.checked : true;
  });

  const activeThemeBtn = document.querySelector('[data-theme].active');
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
      ttsSkipBots: ttsSkipBotsCheck.checked,
      ttsBotNames: ttsBotNamesInput.value.trim(),
      ttsVoice: ttsVoiceSelect.value || '',
      ttsVolume: parseInt(ttsVolSlider.value, 10) / 100,
      ttsRate: parseInt(ttsRateSlider.value, 10) / 100,
      ttsPlatforms: ttsPlatformsObj,
      filterBotCommands: document.getElementById('opt-filter-bots').checked,
      clipDuration: Number(document.querySelector('[data-clip-duration].active')?.dataset.clipDuration || 30),
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
      enabled: check ? check.checked : (handle.length > 0),
      handle: handle,
    };
  });

  const tiktokKeyInput = document.getElementById('input-tiktok-key');
  config.platforms.tiktok.eulerApiKey = tiktokKeyInput ? tiktokKeyInput.value.trim() : (currentConfig?.platforms?.tiktok?.eulerApiKey || '');

  const twitchCidInput = document.getElementById('input-twitch-client-id');
  const twitchSecInput = document.getElementById('input-twitch-client-secret');
  config.platforms.twitch.clientId = twitchCidInput ? twitchCidInput.value.trim() : (currentConfig?.platforms?.twitch?.clientId || '');
  config.platforms.twitch.clientSecret = twitchSecInput ? twitchSecInput.value.trim() : (currentConfig?.platforms?.twitch?.clientSecret || '');

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

      if (p === 'tiktok' && pData.eulerApiKey) {
        req.options = { eulerApiKey: pData.eulerApiKey };
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
  Object.keys(statusLines).forEach(key => delete statusLines[key]);
  connectionTransitions.states.clear();
  showConnectionToast('general', 'Conectando a ' + requests.map(request => PLATFORM_META[request.platform].label).join(' + ') + '…', 'connecting');

  window.overlayAPI.connect(requests);
  setupPanel.classList.add('hidden');
}

// ==========================================================================
// 4. Barra HUD y Estadísticas en Tiempo Real
// ==========================================================================
const connectionTransitions = new window.ChatPresentation.ConnectionTransitions();
const connectionTimers = new Map();
function showConnectionToast(platform, text, kind) {
  const container = document.getElementById('connection-notices');
  const previous = container.querySelector('[data-platform="' + platform + '"]');
  previous?.remove();
  clearTimeout(connectionTimers.get(platform));
  const notice = document.createElement('div');
  notice.className = 'connection-toast state-' + kind;
  notice.dataset.platform = platform;
  notice.innerHTML = iconMarkup(platform) + '<span>' + escapeHtml(text) + '</span>';
  container.appendChild(notice);
  connectionTimers.set(platform, setTimeout(() => { notice.remove(); connectionTimers.delete(platform); }, 4500));
}
window.overlayAPI.onPlatformStatus(data => {
  connectBtn.disabled = false;
  connectBtn.textContent = 'Guardar y Conectar';
  if (data.platform === 'general') { showConnectionToast('general', data.error || 'Error de conexión', 'disconnected'); return; }
  const platform = window.SafeContent.platform(data.platform);
  if (platform === 'unknown') return;
  statusLines[platform] = { connected: Boolean(data.connected), live: data.live };
  if (!data.connected) viewersMap.delete(platform);
  else if (data.live === false) viewersMap.set(platform, 0);
  updateViewersDisplay();
  const change = connectionTransitions.update(data);
  if (!change) return;
  document.querySelector('#connection-notices [data-platform="general"]')?.remove();
  const label = PLATFORM_META[platform].label;
  const messages = { live: label + ' está en vivo', chat: label + ': chat conectado', offline: label + ' no está en directo', disconnected: label + ': ' + (data.error || 'Conexión perdida') };
  showConnectionToast(platform, messages[change.kind], change.kind);
  if (change.sound) window.AudioAlerts.playConnectionLostSound();
});

function formatNumber(num) {
  if (!num || num < 0 || isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(Math.floor(num));
}

function updateViewersDisplay() {
  let total = 0;
  let missing = false;
  let html = '';

  PLATFORMS.forEach(platform => {
    const isConnected = statusLines[platform]?.connected;
    const count = viewersMap.get(platform);
    const known = Number.isInteger(count) && count >= 0;
    
    if (isConnected || count > 0) {
      if (known) total += count;
      else missing = true;
      const meta = PLATFORM_META[platform] || { color: '#888' };
      const reason = statusLines[platform]?.viewerReason || (platform === 'twitch' ? 'Conecta Twitch en Música para ver espectadores' : 'Esperando audiencia');
      html += `<span class="platform-pill" title="${escapeHtml(known ? meta.label + ': ' + count + ' espectadores' : reason)}" style="color:${meta.color}">${iconMarkup(platform)}${known ? formatNumber(count) : '—' + (platform === 'twitch' ? ' · Conecta Twitch' : '')}</span>`;
    }
  });

  totalViewersEl.textContent = missing ? (total > 0 ? formatNumber(total) + '+' : '—') : formatNumber(total);
  totalViewersEl.title = missing ? 'Audiencia incompleta: falta consultar alguna plataforma' : total + ' espectadores';
  platformViewersContainer.innerHTML = html;
}

window.overlayAPI.onViewersUpdate((data) => {
  if (data.platform) {
    const count = typeof data.viewers === 'number' && Number.isInteger(data.viewers) && data.viewers >= 0 ? data.viewers : null;
    if (statusLines[data.platform]) statusLines[data.platform].viewerReason = data.reason || '';
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
  chatTools.scroll();
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
  chatTools.append(node);
}

function addSimpleMessage(html, cls) {
  const div = document.createElement('div');
  div.className = 'msg' + (cls ? ' ' + cls : '');
  div.innerHTML = html;
  addMessageNode(div);
}

function platformTag(platform) {
  platform = window.SafeContent.platform(platform);
  const meta = PLATFORM_META[platform] || { label: platform, className: platform };
  return `<span class="platform-tag ${meta.className}" title="${meta.label}" aria-label="${meta.label}">${iconMarkup(platform)}<span class="platform-name">${meta.label}</span></span>`;
}

function avatarHtml(data) {
  const url = window.SafeContent.mediaUrl(data.avatarUrl);
  if (url) {
    return `<img class="avatar" src="${escapeAttr(url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
  }
  const initial = (data.nickname || data.userId || '?').charAt(0).toUpperCase();
  const meta = PLATFORM_META[data.platform] || { className: 'accent' };
  return `<span class="avatar placeholder" style="background:var(--${meta.className}, #888)">${escapeHtml(initial)}</span>`;
}

// Chat
window.overlayAPI.onChatMessage((data) => {
  data = { ...data, platform: window.SafeContent.platform(data.platform), comment: String(data.comment || '').slice(0, 4000), nickname: String(data.nickname || data.userId || 'Usuario').slice(0, 160) };
  // Detectar comando !clip en cualquier red social y para cualquier espectador
  const optClipEnabled = document.getElementById('opt-clip-enabled');
  const commentText = (data.comment || '').trim();
  if ((!optClipEnabled || optClipEnabled.checked) && /(?:^|\s)[!/.]?(clip|clipear|rec|grabar)\b/i.test(commentText)) {
    const requester = data.nickname || data.userId || 'Espectador';
    console.log(`[Renderer] ¡Comando !clip detectado de @${requester} en ${data.platform}! Comentario:`, commentText);
    triggerClipCreation(requester, data.platform);
  }

  const filterBots = document.getElementById('opt-filter-bots')?.checked;
  if (filterBots && data.comment && /^[!/.?#]/.test(data.comment.trim())) {
    return;
  }

  const userKey = `${data.platform}:${data.userId || data.nickname}`;

  if (data._avatarUpdate) {
    data.avatarUrl = window.SafeContent.mediaUrl(data.avatarUrl);
    if (!data.avatarUrl) return;
    avatarCacheMap.set(userKey, data.avatarUrl);
    if (avatarCacheMap.size > 500) avatarCacheMap.delete(avatarCacheMap.keys().next().value);
    const pendingImgs = chatContainer.querySelectorAll(`img.avatar-pending[data-user-key="${cssEscape(userKey)}"]`);
    pendingImgs.forEach(img => {
      img.src = data.avatarUrl;
      img.classList.remove('avatar-pending');
    });
    return;
  }

  if (!chatTools.history.accept(data)) return;

  window.AppTTS.speakMessage(data);

  const commentHtml = buildCommentHtml(data.comment, data.emotes).replace(/^: /, '');
  const div = document.createElement('div');
  div.className = `msg platform-${data.platform}`;

  const nickColor = window.SafeContent.color(data.color);
  const nickStyle = nickColor ? ` style="color:${escapeAttr(nickColor)}"` : '';

  const knownAvatar = window.SafeContent.mediaUrl(data.avatarUrl || avatarCacheMap.get(userKey));
  const avatar = knownAvatar
    ? `<img class="avatar" src="${escapeAttr(knownAvatar)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`
    : avatarHtml(data).replace('class="avatar placeholder"', `class="avatar placeholder avatar-pending" data-user-key="${escapeAttr(userKey)}"`);

  div.innerHTML = `${avatar}<span class="body"><span class="message-header">${platformTag(data.platform)}${window.ChatPresentation.badgeMarkup(data)}<span class="nick"${nickStyle}>${escapeHtml(data.nickname || data.userId)}</span></span><span class="message-text">${commentHtml}</span></span>`;

  // Botón para Fijar Mensaje (Pin)
  const pinBtn = document.createElement('button');
  pinBtn.type = 'button';
  pinBtn.className = 'pin-btn';
  pinBtn.title = 'Fijar este mensaje arriba';
  pinBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-4 2-3 5-2-2-6 6-1-1 6-6-2-2 5-3Z"/></svg>'; pinBtn.setAttribute('aria-label', 'Fijar mensaje');
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
  const knownAvatar = window.SafeContent.mediaUrl(data.avatarUrl || avatarCacheMap.get(userKey));
  const avatar = knownAvatar
    ? `<img class="avatar" src="${escapeAttr(knownAvatar)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
    : avatarHtml(data);

  const div = document.createElement('div');
  div.className = `msg share platform-${data.platform}`;
  div.innerHTML = `${avatar}<span class="body">${platformTag(data.platform)}<span class="nick">${escapeHtml(data.nickname || data.userId)}</span> <span class="share-text">📢 compartió el directo</span></span>`;
  addMessageNode(div);
});

// Join
window.overlayAPI.onJoinMessage((data) => {
  window.ChatPresence.renderJoin(data, chatTools.target, platformTag, addMessageNode);
});

// Regalos en Español con Imágenes HD y Diamantes
window.overlayAPI.onGiftMessage((data) => {
  if (window.AudioAlerts && typeof window.AudioAlerts.playGiftSound === 'function') {
    window.AudioAlerts.playGiftSound();
  }

  const giftDetails = formatGiftData(data);
  const repeatMarkup = giftDetails.count > 1 ? `<span class="repeat-badge">x${giftDetails.count}</span>` : '';
  const diamondMarkup = giftDetails.totalDiamonds > 0 ? `<span class="diamond-badge">💎 ${giftDetails.totalDiamonds}</span>` : giftDetails.amount ? `<span class="amount-badge">${escapeHtml(giftDetails.amount)}</span>` : '';

  const giftImageMarkup = giftDetails.imageUrl
    ? `<img class="gift-icon" src="${escapeAttr(window.SafeContent.mediaUrl(giftDetails.imageUrl))}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
    : '';

  const div = document.createElement('div');
  div.className = `msg gift platform-${window.SafeContent.platform(data.platform)}`;
  div.innerHTML = `
    ${giftImageMarkup ? `<div class="gift-preview-box">${giftImageMarkup}</div>` : ''}
    <div class="gift-info">
      <div class="gift-title-row">
        ${platformTag(data.platform)}
        <b>${escapeHtml(data.nickname || data.userId)}</b>
        <span style="color:#d1d5db; font-size:11px;">envió</span>
        <span class="gift-name-tag">${escapeHtml(giftDetails.name)}</span>
        ${repeatMarkup}
      </div>
      ${diamondMarkup ? `<div class="gift-meta-row">${diamondMarkup}</div>` : ''}
      ${data.comment ? `<div class="gift-comment">${escapeHtml(String(data.comment).slice(0, 1000))}</div>` : ''}
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
      comment: `Envió ${giftDetails.name} ${giftDetails.count > 1 ? 'x' + giftDetails.count : ''} ${giftDetails.totalDiamonds > 0 ? '(💎 ' + giftDetails.totalDiamonds + ')' : ''}`,
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
  document.body.classList.toggle('game-locked', active);
  const button = document.getElementById('lock-btn');
  button.setAttribute('aria-pressed', String(active));
  button.classList.toggle('active-toggle', active);
  button.querySelector('span').textContent = active ? 'Bloqueado' : 'Bloquear';
  button.title = active ? 'Ctrl + Alt + T para desbloquear' : 'Bloquear para jugar · Ctrl + Alt + T';
  document.getElementById('game-lock-notice').hidden = !active;
});

// Utilidades
function escapeHtml(str) {
  return window.SafeContent.escape(str);
}

function escapeAttr(str) {
  return window.SafeContent.escape(str);
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

  const sorted = [...emotes].slice(0, 50).sort((a, b) => a.index - b.index);
  let result = text ? ': ' : ' ';
  let cursor = 0;

  for (const e of sorted) {
    const url = window.SafeContent.mediaUrl(e.url);
    if (!url) continue;
    const pos = Math.max(0, Math.min(e.index, text.length));
    result += escapeHtml(text.slice(cursor, pos));
    result += `<img class="emote" src="${escapeAttr(url)}" alt="${escapeAttr(e.alt || 'emote')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
    cursor = e.length ? pos + e.length : pos;
  }
  result += escapeHtml(text.slice(cursor));
  return result;
}

// Arrancar al cargar la ventana
document.addEventListener('DOMContentLoaded', initUI);
