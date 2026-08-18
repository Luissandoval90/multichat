const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');

let mainWindow = null;
let clickThrough = false;
const activeConnections = {};

// Carga perezosa (lazy-load) de plataformas para arranque ultra-rápido
const PLATFORMS = {
  tiktok: null,
  twitch: null,
  kick: null,
  youtube: null,
};

function getPlatformModule(name) {
  if (!PLATFORMS[name]) {
    PLATFORMS[name] = require(`./platforms/${name}`);
  }
  return PLATFORMS[name];
}

// Carga perezosa de electron-updater
let autoUpdaterInstance = null;
function getAutoUpdater() {
  if (!autoUpdaterInstance) {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      safeSend('update-status', { status: 'checking', message: 'Buscando actualizaciones en GitHub…' });
    });

    autoUpdater.on('update-available', (info) => {
      safeSend('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || 'Mejoras de rendimiento y nuevas funciones.',
      });
      safeSend('update-status', { status: 'available', version: info.version, message: `Descargando v${info.version}…` });
    });

    autoUpdater.on('update-not-available', (info) => {
      safeSend('update-status', { status: 'not-available', message: `¡Tienes la última versión instalada (v${app.getVersion()})!` });
    });

    autoUpdater.on('update-downloaded', (info) => {
      safeSend('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes || 'Actualización lista para instalar.',
      });
      safeSend('update-status', { status: 'downloaded', version: info.version, message: `v${info.version} lista para reiniciar` });
    });

    autoUpdater.on('error', (err) => {
      safeSend('update-status', { status: 'error', message: 'No se pudo comprobar actualización: ' + (err.message || String(err)) });
    });

    autoUpdaterInstance = autoUpdater;
  }
  return autoUpdaterInstance;
}

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
    show: false, // Inicio oculto hasta que cargue el HTML para evitar parpadeos
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

  // Mostrar la ventana en el milisegundo exacto en que el HTML está listo
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

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

  // Buscar actualizaciones en segundo plano después de 2 segundos de arranque
  if (app.isPackaged) {
    setTimeout(() => {
      try {
        const updater = getAutoUpdater();
        updater.checkForUpdatesAndNotify().catch(() => {});
      } catch (e) {}
    }, 2500);
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
    const module = getPlatformModule(platform);
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

// Eventos de control de ventana y sistema
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

// Auto-actualizador IPC
ipcMain.on('restart-and-install', () => {
  const updater = getAutoUpdater();
  updater.quitAndInstall();
});

ipcMain.on('check-for-updates', () => {
  if (app.isPackaged) {
    const updater = getAutoUpdater();
    updater.checkForUpdates().catch((err) => {
      safeSend('update-status', { status: 'error', message: err.message });
    });
  } else {
    safeSend('update-status', { status: 'checking', message: 'Comprobando en modo desarrollo…' });
    setTimeout(() => {
      safeSend('update-status', { status: 'not-available', message: `Modo desarrollo: versión actual v${app.getVersion()}` });
    }, 1000);
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
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
