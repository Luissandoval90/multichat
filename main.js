const { app, BrowserWindow, ipcMain, globalShortcut, screen, shell, desktopCapturer, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { WebSocketServer, WebSocket } = require('ws');
const clipper = require('./src/clipper');

let mainWindow = null;
let clickThrough = false;
const activeConnections = {};

// OBS Server state
let obsServer = null;
let obsWss = null;
const OBS_PORT = 3750;
let currentPinnedMessage = null;

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
      safeSend('update-status', { status: 'checking', message: '🔍 Buscando actualizaciones en GitHub…' });
    });

    autoUpdater.on('update-available', (info) => {
      safeSend('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || 'Mejoras de rendimiento y nuevas funciones.',
      });
      safeSend('update-status', { status: 'available', version: info.version, message: `🚀 Descargando versión v${info.version} en segundo plano…` });
    });

    autoUpdater.on('update-not-available', (info) => {
      safeSend('update-status', { status: 'not-available', message: `✅ ¡Tienes la última versión instalada (v${app.getVersion()})!` });
    });

    autoUpdater.on('update-downloaded', (info) => {
      safeSend('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes || 'Actualización lista para instalar.',
      });
      safeSend('update-status', { status: 'downloaded', version: info.version, message: `✨ Versión v${info.version} lista para reiniciar` });
    });

    autoUpdater.on('error', (err) => {
      const errMsg = err ? (err.message || String(err)) : '';
      console.log('[AutoUpdater] Error capturado:', errMsg);

      if (errMsg.includes('404') || errMsg.includes('HttpError: 404')) {
        safeSend('update-status', { 
          status: 'not-available', 
          message: `✅ ¡Tienes la versión más reciente (v${app.getVersion()})! No hay versiones nuevas en GitHub.` 
        });
      } else {
        safeSend('update-status', { 
          status: 'error', 
          message: 'No se pudo conectar a GitHub para verificar actualizaciones.' 
        });
      }
    });

    autoUpdaterInstance = autoUpdater;
  }
  return autoUpdaterInstance;
}

// ==========================================================================
// Servidor Local Embebido para OBS Studio Browser Source
// ==========================================================================
function broadcastToObs(type, data) {
  if (!obsWss) return;
  const payload = JSON.stringify({ type, data });
  obsWss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function startObsServer() {
  if (obsServer) return;

  obsServer = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${OBS_PORT}`);
    let pathname = parsedUrl.pathname;

    if (pathname === '/' || pathname === '/obs' || pathname === '/index.html') {
      pathname = '/obs.html';
    }

    const safePath = path.normalize(path.join(__dirname, pathname));
    if (!safePath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('Acceso denegado');
      return;
    }

    fs.readFile(safePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Archivo no encontrado');
        return;
      }

      const ext = path.extname(safePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
      };

      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
    });
  });

  obsWss = new WebSocketServer({ server: obsServer, path: '/ws' });

  obsWss.on('connection', (ws) => {
    console.log('[OBS Server] Nuevo cliente OBS Studio conectado.');
    if (currentPinnedMessage) {
      ws.send(JSON.stringify({ type: 'pin', data: currentPinnedMessage }));
    }
  });

  obsServer.listen(OBS_PORT, '127.0.0.1', () => {
    console.log(`[OBS Server] Servidor local para OBS Studio listo en: http://localhost:${OBS_PORT}`);
  });

  obsServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[OBS Server] Puerto ${OBS_PORT} ya en uso, el servidor sigue activo.`);
    } else {
      console.error('[OBS Server] Error:', err);
    }
  });
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
    show: false,
    icon: path.join(__dirname, 'multichat.png'),
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

  // Manejador automático de captura de pantalla para clips en vivo (sin diálogos molestos)
  try {
    session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
      desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
        if (sources && sources.length > 0) {
          callback({ video: sources[0] });
        }
      }).catch(() => {});
    });
  } catch (e) {}

  mainWindow.loadFile('overlay.html');

  // Iniciar servidor local OBS
  startObsServer();

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

  // Buscar actualizaciones en segundo plano después de 2.5s
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
      onChat: (data) => {
        safeSend('chat-message', data);
        broadcastToObs('chat', data);
      },
      onJoin: (data) => {
        safeSend('join-message', data);
        broadcastToObs('join', data);
      },
      onGift: (data) => {
        safeSend('gift-message', data);
        broadcastToObs('gift', data);
      },
      onFollow: (data) => {
        safeSend('follow-message', data);
        broadcastToObs('follow', data);
      },
      onLike: (data) => {
        safeSend('like-message', data);
        broadcastToObs('like', data);
      },
      onShare: (data) => {
        safeSend('share-message', data);
        broadcastToObs('share', data);
      },
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

// Mensaje fijado (Pin) sincronizado con OBS
ipcMain.on('pin-message', (_event, pinnedData) => {
  currentPinnedMessage = pinnedData || null;
  broadcastToObs('pin', currentPinnedMessage);
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
      const errMsg = err ? (err.message || String(err)) : '';
      if (errMsg.includes('404')) {
        safeSend('update-status', { status: 'not-available', message: `✅ ¡Tienes la versión más reciente (v${app.getVersion()})!` });
      } else {
        safeSend('update-status', { status: 'error', message: 'No se pudo comprobar actualización.' });
      }
    });
  } else {
    safeSend('update-status', { status: 'checking', message: '🔍 Comprobando actualizaciones…' });
    setTimeout(() => {
      safeSend('update-status', { status: 'not-available', message: `✅ Tienes la última versión (v${app.getVersion()})` });
    }, 1000);
  }
});

function getConfigFilePath() {
  return path.join(app.getPath('userData'), 'multichat_config.json');
}

ipcMain.on('save-config-file', (_event, config) => {
  try {
    const filePath = getConfigFilePath();
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    console.log('[main] Configuración guardada en archivo permanente:', filePath);
    broadcastToObs('config', config.options || {});
  } catch (err) {
    console.error('[main] Error guardando config en disco:', err);
  }
});

ipcMain.handle('load-config-file', () => {
  try {
    const filePath = getConfigFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[main] Error leyendo config de disco:', err);
  }
  return null;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Sistema de Clips & Google Drive con Grabador Continuo de Pantalla
const screenFrameBuffer = [];
const MAX_SCREEN_FRAMES = 45; // Búfer de hasta 45 segundos

function startScreenFrameRecorder() {
  setInterval(async () => {
    try {
      if (!desktopCapturer) return;
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 }
      });
      if (sources && sources.length > 0) {
        const frameBuf = sources[0].thumbnail.toJPEG(85);
        if (frameBuf && frameBuf.length > 1000) {
          screenFrameBuffer.push(frameBuf);
          if (screenFrameBuffer.length > MAX_SCREEN_FRAMES) {
            screenFrameBuffer.shift();
          }
        }
      }
    } catch (e) {}
  }, 1000);
}

ipcMain.handle('create-clip', async (_event, params) => {
  const clipParams = {
    ...(params || {}),
    screenFrames: [...screenFrameBuffer],
  };
  const result = await clipper.createClip(clipParams);
  if (result && result.success) {
    safeSend('clip-created', result);
    broadcastToObs('clip', result);
  }
  return result;
});

ipcMain.handle('get-desktop-sources', async () => {
  try {
    return await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
  } catch (e) {
    console.error('[main] Error obteniendo desktop sources:', e);
    return [];
  }
});

ipcMain.handle('save-recorded-clip', async (_event, { buffer, streamerName, requestedBy, platform, durationSeconds }) => {
  const result = await clipper.saveBufferAndUpload({
    rawBuffer: Buffer.from(buffer),
    streamerName,
    requestedBy,
    platform,
    durationSeconds
  });
  if (result && result.success) {
    safeSend('clip-created', result);
    broadcastToObs('clip', result);
  }
  return result;
});

ipcMain.on('open-clips-folder', () => {
  shell.openPath(clipper.getClipsDirectory());
});

ipcMain.on('open-external-url', (_event, url) => {
  if (url) shell.openExternal(url);
});

app.whenReady().then(() => {
  createWindow();
  startScreenFrameRecorder();
});

app.on('window-all-closed', () => {
  disconnectAll();
  globalShortcut.unregisterAll();
  if (obsServer) {
    try { obsServer.close(); } catch (e) {}
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  disconnectAll();
  globalShortcut.unregisterAll();
  if (obsServer) {
    try { obsServer.close(); } catch (e) {}
  }
});
