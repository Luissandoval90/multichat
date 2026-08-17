const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const tiktokPlatform = require('./platforms/tiktok');
const twitchPlatform = require('./platforms/twitch');
const kickPlatform = require('./platforms/kick');
const youtubePlatform = require('./platforms/youtube');

const PLATFORMS = {
  tiktok: tiktokPlatform,
  twitch: twitchPlatform,
  kick: kickPlatform,
  youtube: youtubePlatform,
};

let mainWindow;
let clickThrough = false;

const activeConnections = {};

// Configurar auto-actualizador
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] Nueva versión disponible:', info.version);
  safeSend('chat-message', {
    platform: 'general',
    nickname: 'Actualización',
    comment: `🚀 ¡Nueva versión ${info.version} disponible! Descargando en segundo plano…`,
  });
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdater] Actualización descargada:', info.version);
  safeSend('chat-message', {
    platform: 'general',
    nickname: 'Actualización',
    comment: `✅ ¡Versión ${info.version} lista! Se instalará la próxima vez que abras el programa.`,
  });
});

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 430,
    height: 660,
    x: Math.max(0, width - 450),
    y: 40,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile('overlay.html');

  // Buscar actualizaciones si no estamos en modo desarrollo
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.log('[AutoUpdater] Error comprobando actualizaciones:', err.message);
    });
  }

  // Atajos de teclado globales
  globalShortcut.register('Control+Alt+T', () => {
    clickThrough = !clickThrough;
    mainWindow.setIgnoreMouseEvents(clickThrough, { forward: true });
    mainWindow.webContents.send('click-through-changed', clickThrough);
  });

  globalShortcut.register('Control+Alt+Up', () => {
    mainWindow.webContents.send('adjust-bg-opacity', 0.05);
  });
  globalShortcut.register('Control+Alt+Down', () => {
    mainWindow.webContents.send('adjust-bg-opacity', -0.05);
  });

  globalShortcut.register('Control+Alt+Right', () => moveWindow(20, 0));
  globalShortcut.register('Control+Alt+Left', () => moveWindow(-20, 0));

  globalShortcut.register('F12', () => {
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  function moveWindow(dx, dy) {
    if (!mainWindow) return;
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(x + dx, y + dy);
  }
}

function safeSend(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function disconnectPlatform(platformKey) {
  const conn = activeConnections[platformKey];
  if (conn) {
    conn.disconnect();
    delete activeConnections[platformKey];
  }
}

function disconnectAll() {
  for (const key of Object.keys(activeConnections)) {
    disconnectPlatform(key);
  }
}

function connectPlatforms(requests) {
  console.log('[main] Conectando plataformas:', requests.map(r => r.platform).join(', '));
  disconnectAll();

  const requestedKeys = requests.map(r => r.platform);

  for (const { platform, handle, options } of requests) {
    const module = PLATFORMS[platform];
    if (!module || !handle) {
      console.warn('[main] Plataforma o handle inválido:', platform, handle);
      continue;
    }

    console.log('[main] Iniciando módulo:', platform, 'para:', handle);
    activeConnections[platform] = module.connect(handle, {
      onStatus: (data) => safeSend('platform-status', { platform, ...data }),
      onChat: (data) => safeSend('chat-message', data),
      onJoin: (data) => safeSend('join-message', data),
      onGift: (data) => safeSend('gift-message', data),
      onFollow: (data) => safeSend('follow-message', data),
      onLike: (data) => safeSend('like-message', data),
      onShare: (data) => safeSend('share-message', data),
      onViewers: (data) => safeSend('viewers-update', data),
    }, options || {});
  }

  safeSend('platforms-selected', requestedKeys);
}

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('connect-request', (event, requests) => {
  try {
    connectPlatforms(requests);
  } catch (err) {
    safeSend('platform-status', { platform: 'general', connected: false, error: 'Error al conectar: ' + (err.message || String(err)) });
  }
});

ipcMain.on('disconnect-all', () => {
  disconnectAll();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  disconnectAll();
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  disconnectAll();
  globalShortcut.unregisterAll();
});
