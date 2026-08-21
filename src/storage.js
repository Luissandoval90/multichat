// Sistema de persistencia doble (localStorage + archivo de disco JSON permanente)

const STORAGE_KEY = 'multichat_overlay_config_v2';

const DEFAULT_CONFIG = {
  platforms: {
    tiktok: { enabled: false, handle: '', apiKey: '' },
    twitch: { enabled: false, handle: '', clientId: '', clientSecret: '' },
    kick: { enabled: false, handle: '' },
    youtube: { enabled: false, handle: '' },
  },
  options: {
    autoConnect: true,
    followAlerts: true,
    soundAlerts: true,
    soundVolume: 0.7,
    sfxEnabled: true,
    sfxVolume: 0.75,
    theme: 'cyberpunk',
    fontFamily: 'outfit',
    ttsEnabled: false,
    ttsVoice: '',
    ttsVolume: 0.85,
    ttsRate: 1.05,
    ttsIncludeNickname: true,
    ttsSkipUrls: true,
    ttsPlatforms: {
      tiktok: true,
      twitch: true,
      kick: true,
      youtube: true,
    },
    filterBotCommands: false,
    bgOpacity: 0.45,
    fontSize: 13.5,
    msgSpacing: 6,
    clipEnabled: true,
    clipDuration: 30,
    clipWebhookUrl: 'https://script.google.com/macros/s/AKfycbzZzePfDrKhLrF5F6eRvl0kU-IFVIB1SbnSWv_Z0mSIG3HXkZsYnt6GHkAn52BTPg861Q/exec',
    clipFolderUrl: 'https://drive.google.com/drive/folders/1oT4GlKx1E5hRMcbrq6qGpdrNHuc_5MPH',
  },
};

function sanitizeConfig(parsed) {
  if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_CONFIG };
  return {
    platforms: {
      tiktok: { ...DEFAULT_CONFIG.platforms.tiktok, ...(parsed.platforms?.tiktok || {}) },
      twitch: { ...DEFAULT_CONFIG.platforms.twitch, ...(parsed.platforms?.twitch || {}) },
      kick: { ...DEFAULT_CONFIG.platforms.kick, ...(parsed.platforms?.kick || {}) },
      youtube: { ...DEFAULT_CONFIG.platforms.youtube, ...(parsed.platforms?.youtube || {}) },
    },
    options: {
      ...DEFAULT_CONFIG.options,
      ...(parsed.options || {}),
      ttsPlatforms: {
        ...DEFAULT_CONFIG.options.ttsPlatforms,
        ...(parsed.options?.ttsPlatforms || {}),
      },
    },
  };
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return sanitizeConfig(JSON.parse(raw));
    }
  } catch (err) {
    console.error('[Storage] Error cargando localStorage:', err);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  try {
    const sanitized = sanitizeConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));

    // Guardado permanente en archivo en disco del sistema
    if (window.overlayAPI && typeof window.overlayAPI.saveConfigFile === 'function') {
      window.overlayAPI.saveConfigFile(sanitized);
    }
    console.log('[Storage] Config guardada con éxito (Redes & API Keys):', sanitized.platforms);
  } catch (err) {
    console.error('[Storage] Error guardando configuración:', err);
  }
}

async function loadAsyncConfig() {
  if (window.overlayAPI && typeof window.overlayAPI.loadConfigFile === 'function') {
    try {
      const diskConfig = await window.overlayAPI.loadConfigFile();
      if (diskConfig) {
        const sanitized = sanitizeConfig(diskConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        return sanitized;
      }
    } catch (e) {}
  }
  return loadConfig();
}

window.AppStorage = {
  loadConfig,
  loadAsyncConfig,
  saveConfig,
};
