const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  // Conexión y control de ventana
  connect: (requests) => ipcRenderer.send('connect-request', requests),
  disconnectAll: () => ipcRenderer.send('disconnect-all'),
  minimize: () => ipcRenderer.send('minimize-window'),
  close: () => ipcRenderer.send('close-window'),

  // Eventos de red, chat y comunidad
  onPlatformStatus: (callback) => ipcRenderer.on('platform-status', (_event, data) => callback(data)),
  onPlatformsSelected: (callback) => ipcRenderer.on('platforms-selected', (_event, data) => callback(data)),
  onChatMessage: (callback) => ipcRenderer.on('chat-message', (_event, data) => callback(data)),
  onJoinMessage: (callback) => ipcRenderer.on('join-message', (_event, data) => callback(data)),
  onGiftMessage: (callback) => ipcRenderer.on('gift-message', (_event, data) => callback(data)),
  onFollowMessage: (callback) => ipcRenderer.on('follow-message', (_event, data) => callback(data)),
  onLikeMessage: (callback) => ipcRenderer.on('like-message', (_event, data) => callback(data)),
  onShareMessage: (callback) => ipcRenderer.on('share-message', (_event, data) => callback(data)),
  onViewersUpdate: (callback) => ipcRenderer.on('viewers-update', (_event, data) => callback(data)),

  // Sistema de Actualizaciones Automáticas
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  restartAndInstall: () => ipcRenderer.send('restart-and-install'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event, data) => callback(data)),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, data) => callback(data)),

  // Persistencia segura en disco
  saveConfigFile: (config) => ipcRenderer.send('save-config-file', config),
  loadConfigFile: () => ipcRenderer.invoke('load-config-file'),

  // Mensajes fijados (Pin)
  pinMessage: (pinnedData) => ipcRenderer.send('pin-message', pinnedData),

  // Clips y Google Drive
  createClip: (params) => ipcRenderer.invoke('create-clip', params),
  onClipCreated: (callback) => ipcRenderer.on('clip-created', (_event, data) => callback(data)),
  openClipsFolder: () => ipcRenderer.send('open-clips-folder'),
  openExternalUrl: (url) => ipcRenderer.send('open-external-url', url),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  saveRecordedClip: (params) => ipcRenderer.invoke('save-recorded-clip', params),

  // Atajos globales y ventana
  onClickThroughChanged: (callback) => ipcRenderer.on('click-through-changed', (_event, data) => callback(data)),
  onAdjustBgOpacity: (callback) => ipcRenderer.on('adjust-bg-opacity', (_event, delta) => callback(delta)),
});
