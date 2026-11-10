const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'multichat-main-'));
app.setPath('userData', profile);
fs.writeFileSync(path.join(profile, 'multichat_config.json'), JSON.stringify({ platforms: {}, options: { clipEnabled: false, autoConnect: false, ttsVolume: 0 } }));
app.disableHardwareAcceleration();
app.whenReady().then(() => session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (_, done) => done({ cancel: true })));
let first = true;
app.on('browser-window-created', (_, window) => {
  window.show = () => {};
  if (!first) return;
  first = false;
  window.webContents.once('did-finish-load', async () => {
    try {
      const config = await window.webContents.executeJavaScript('window.overlayAPI.loadConfigFile()');
      assert.equal(config.options.clipEnabled, false);
      assert.equal(await window.webContents.executeJavaScript('ttsVolume'), 0, 'Saved mute must restore at startup');
      assert.equal(await window.webContents.executeJavaScript('window.overlayAPI.getAppVersion()'), app.getVersion());
      await window.webContents.executeJavaScript('window.overlayAPI.setClickThrough(true)');
      for (let attempt = 0; attempt < 100 && window.isFocusable(); attempt++) await new Promise(resolve => setTimeout(resolve, 50));
      assert.equal(window.isFocusable(), false, 'Locked overlay must not take keyboard focus from the game');
      assert.equal(window.isResizable(), false, 'Locked overlay must not intercept its resize borders');
      assert.equal(await window.webContents.executeJavaScript(`document.getElementById('lock-btn').getAttribute('aria-pressed')`), 'true');
      await window.webContents.executeJavaScript('window.overlayAPI.setClickThrough(false)');
      for (let attempt = 0; attempt < 100 && !window.isFocusable(); attempt++) await new Promise(resolve => setTimeout(resolve, 50));
      assert.equal(window.isFocusable(), true);
      assert.equal(window.isResizable(), true);
      console.log('PASS: game lock disables focus and resizing and unlock restores window interaction');
      const stranger = new BrowserWindow({ show: false, webPreferences: { preload: path.resolve(__dirname, '../preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
      await stranger.loadURL('data:text/html,<p>Untrusted frame</p>');
      assert.equal(await stranger.webContents.executeJavaScript(`window.overlayAPI.loadConfigFile().then(()=>false,()=>true)`), true);
      stranger.destroy();
      console.log('PASS: actual main process accepts its own UI and denies untrusted IPC');
      app.exit(0);
    } catch (error) { console.error(error); app.exit(1); }
  });
});
require('../main');
setTimeout(() => { console.error('Main-process verification timed out'); app.exit(1); }, 45000);
