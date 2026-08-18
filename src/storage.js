// Sistema de persistencia y guardado automático de configuración.

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
    theme: 'cyberpunk',
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
  },
};

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      platforms: { ...DEFAULT_CONFIG.platforms, ...(parsed.platforms || {}) },
      options: {
        ...DEFAULT_CONFIG.options,
        ...(parsed.options || {}),
        ttsPlatforms: {
          ...DEFAULT_CONFIG.options.ttsPlatforms,
          ...((parsed.options && parsed.options.ttsPlatforms) || {}),
        },
      },
    };
  } catch (err) {
    console.error('[Storage] Error cargando configuración:', err);
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('[Storage] Error guardando configuración:', err);
  }
}

window.AppStorage = {
  loadConfig,
  saveConfig,
};
