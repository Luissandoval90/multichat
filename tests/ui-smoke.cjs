const { app, BrowserWindow, ipcMain, session, safeStorage } = require('electron');
const { MusicService } = require('../src/music/service');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Exercise the actual renderer and preload without accounts, network or recording.
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'multichat-ui-'));
app.setPath('userData', profile);
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const errors = [];
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://*/*', 'http://*/*'] }, (_, done) => done({ cancel: true }));
  session.defaultSession.setPermissionCheckHandler((_, permission) => permission !== 'display-capture');
  session.defaultSession.setPermissionRequestHandler((_, permission, done) => done(permission !== 'display-capture'));
  ipcMain.handle('load-config-file', () => null);
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-desktop-sources', () => []);
  const win = new BrowserWindow({ show: false, width: 430, height: 660, webPreferences: { preload: path.join(__dirname, '../preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
  win.webContents.on('console-message', (_, level, message) => { if (level === 3 && !message.includes('ERR_BLOCKED_BY_CLIENT')) errors.push(message); });
  const run = code => win.webContents.executeJavaScript(code);
  const music = new MusicService({ directory: profile, safeStorage, openExternal: () => { throw new Error('External login is disabled during tests'); }, onChange: state => win.webContents.send('music-state',state) });
  ipcMain.handle('music-get-state', () => music.state());
  ipcMain.handle('music-action', (_, type, data) => music.action(type, data));
  try {
    await win.loadFile(path.join(__dirname, '../overlay.html'));
    await run('window.AppStorage.loadAsyncConfig()');
    await run(`document.querySelector('[data-theme="matte"]').click(); document.querySelector('[data-clip-duration="45"]').click();`);
    assert.equal(await run('gatherConfigFromUI().options.theme'), 'matte', 'Selecting clip duration must preserve the selected theme');
    await run(`setAppTheme('contrast')`);
    assert.equal(await run(`document.querySelector('[data-clip-duration="45"]').classList.contains('active')`), true, 'Changing theme must preserve clip duration');
    assert.equal(await run('gatherConfigFromUI().options.clipDuration'), 45, 'Selected clip duration must be persisted');
    assert.equal(await run('window.AppStorage.loadConfig().options.clipDuration'), 45, 'Clip duration must save immediately when clicked');
    await run(`document.querySelector('[data-clip-duration="45"]').classList.remove('active'); document.querySelector('[data-clip-duration="30"]').classList.add('active'); applyConfigToUI(window.AppStorage.loadConfig())`);
    assert.equal(await run(`document.querySelector('[data-clip-duration="45"]').classList.contains('active')`), true, 'Saved clip duration must restore when settings load');
    console.log('PASS: theme and clip duration remain independent and persist');
    for (const platform of ['tiktok', 'twitch', 'kick', 'youtube']) {
      assert.equal(await run(`document.getElementById('input-${platform}').disabled`), true);
      await run(`document.getElementById('check-${platform}').click()`);
      assert.equal(await run(`document.getElementById('input-${platform}').disabled`), false, `${platform} input must enable with its switch`);
      await run(`document.getElementById('check-${platform}').click()`);
    }
    for (const tab of ['accounts', 'clips', 'voice', 'music', 'appearance', 'updates']) {
      await run(`document.querySelector('[data-tab="tab-${tab}"]').click()`);
      assert.equal(await run(`document.querySelectorAll('.tab-content:not(.hidden)').length`), 1);
      assert.equal(await run(`document.getElementById('tab-${tab}').getBoundingClientRect().width > 0`), true);
      assert.equal(await run(`document.getElementById('connect-btn').getBoundingClientRect().bottom < innerHeight`), true, 'Connection action must remain visible');
    }
    await run(`document.getElementById('font-size-slider').value = 18; document.getElementById('font-size-slider').dispatchEvent(new Event('input', {bubbles:true}))`);
    assert.equal(await run(`getComputedStyle(document.documentElement).getPropertyValue('--font-size')`), '18px');
    await run(`document.getElementById('font-size-slider').value = 13.5; document.getElementById('font-size-slider').dispatchEvent(new Event('input', {bubbles:true}))`);
    await run(`document.querySelector('[data-tab="tab-music"]').click()`);
    assert.equal(await run(`document.getElementById('music-cost').value`), '500');
    win.webContents.send('music-state',{...music.state(),twitch:'new_creator',pointsEligible:false});
    await run('new Promise(r=>setTimeout(r,50))');
    assert.equal(await run(`document.getElementById('music-create-reward').disabled`),true,'Non-affiliate accounts need a clear notice rather than an API error');
    assert.equal(await run(`document.getElementById('music-points-notice').classList.contains('hidden')`),false);
    win.webContents.send('music-state',{...music.state(),authorization:{userCode:'LINK1234',verificationUri:'https://www.twitch.tv/activate'}});
    await run('new Promise(r=>setTimeout(r,50))');
    assert.equal(await run(`document.getElementById('music-user-code').textContent`),'LINK1234');
    assert.equal(await run(`document.getElementById('music-login').disabled`),true);
    win.webContents.send('music-state',music.state());
    await run('new Promise(r=>setTimeout(r,50))');
    await run(`document.getElementById('music-enabled').click()`);
    await run('new Promise(r => setTimeout(r,100))');
    assert.equal(music.state().enabled,true,'Music preferences must reach the service');
    music.queue.add({id:'test-restored',user_input:'Rosas La Oreja de Van Gogh',user_id:'tester',reward:{id:music.queue.rewardId}});
    music.queue.take(); music.changed();
    const restored = new MusicService({ directory:profile,safeStorage,openExternal:()=>{},onChange:()=>{} });
    assert.equal(restored.state().current.query,'Rosas La Oreja de Van Gogh');
    assert.equal(restored.state().current.status,'error','A restart must never silently replay an unfinished request');
    await music.action('remove',{id:'test-restored'});
    assert.equal(await run(`document.getElementById('music-skip').disabled`),true);
    console.log('PASS: account switches, six sections, music preferences, connection action and font sizing');
    for (let i = 0; i < 10; i++) {
      win.webContents.send('join-message', { platform: 'tiktok', userId: `viewer-${i}`, nickname: `Visitante ${i}` });
    }
    await run('new Promise(r => setTimeout(r, 100))');
    assert.equal(await run(`document.querySelectorAll('#chat-container .join').length`), 1, 'Consecutive arrivals must occupy a single row');
    assert.equal(await run(`document.querySelector('#chat-container .join').textContent.includes('10 personas se unieron')`), true);
    win.webContents.send('chat-message', { platform: 'tiktok', userId: 'andrea', nickname: 'Andrea', comment: 'Hola a todos' });
    win.webContents.send('join-message', { platform: 'tiktok', userId: 'next', nickname: '<img src=x onerror=alert(1)>' });
    win.webContents.send('join-message', { platform: 'twitch', userId: 'twitch-viewer', nickname: 'Marcos' });
    await run('new Promise(r => setTimeout(r, 100))');
    assert.equal(await run(`document.querySelectorAll('#chat-container .join').length`), 3, 'Chat messages and platform changes must separate arrival groups');
    assert.equal(await run(`document.querySelectorAll('#chat-container .join img').length`), 0, 'Arrival nicknames must render as text');
    await run(`document.getElementById('chat-container').replaceChildren(); document.getElementById('setup-panel').classList.add('hidden')`);
    assert.equal(await run(`Math.abs(document.getElementById('chat-container').getBoundingClientRect().bottom - document.getElementById('app').getBoundingClientRect().bottom) < 3`), true, 'Chat must use the space previously occupied by the shortcut footer');
    await run(`document.getElementById('setup-panel').classList.remove('hidden')`);
    console.log('PASS: arrivals are grouped safely and the chat extends to the bottom');
    assert.deepEqual(errors, [], 'Renderer must load without JavaScript errors');
    if (process.argv.includes('--screenshots')) {
      const output = path.join(__dirname, '../output/playwright');
      fs.mkdirSync(output, { recursive: true });
      await run(`setAppTheme('obsidian'); document.querySelector('[data-tab="tab-accounts"]').click()`);
      await win.webContents.executeJavaScript('document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))');
      fs.writeFileSync(path.join(output, 'settings-430.png'), (await win.webContents.capturePage()).toPNG());
      await run(`document.querySelector('[data-tab="tab-music"]').click()`);
      await run('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      fs.writeFileSync(path.join(output, 'music-430.png'), (await win.webContents.capturePage()).toPNG());
      await run(`document.getElementById('edit-btn').click()`);
      win.webContents.send('chat-message', { platform: 'twitch', nickname: 'Andrea', userId: 'andrea', comment: 'Se escucha perfecto. ¡Buen directo!' });
      win.webContents.send('chat-message', { platform: 'kick', nickname: 'Marcos', userId: 'marcos', comment: '¿A qué hora empieza la siguiente partida?' });
      win.webContents.send('chat-message', { platform: 'youtube', nickname: 'Valeria', userId: 'valeria', comment: 'Saludos desde Lima' });
      await run('new Promise(r => setTimeout(r, 250))');
      assert.equal(await run(`document.querySelectorAll('#chat-container .msg').length`), 3);
      await run(`document.querySelector('#chat-container .pin-btn').click()`);
      assert.equal(await run(`document.getElementById('pinned-message-container').classList.contains('hidden')`), false);
      await run(`document.querySelector('.unpin-btn').click()`);
      assert.equal(await run(`document.getElementById('pinned-message-container').classList.contains('hidden')`), true);
      for (const nickname of ['Mariana', 'Diego', 'Lucía', 'Carlos', 'Sofía']) {
        win.webContents.send('join-message', { platform: 'tiktok', userId: nickname, nickname });
      }
      win.webContents.send('gift-message', { platform: 'tiktok', userId: 'rodrigo', nickname: 'Rodrigo', giftName: 'Rose', diamondCount: 1, repeatCount: 5, giftType: 1, repeatEnd: true });
      await run('new Promise(r => setTimeout(r, 100))');
      await run('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      fs.writeFileSync(path.join(output, 'chat-430.png'), (await win.webContents.capturePage()).toPNG());
      for (const width of [360, 760]) {
        win.setSize(width, 760);
        await run(`document.getElementById('setup-panel').classList.remove('hidden'); document.querySelector('[data-tab="tab-accounts"]').click(); document.getElementById('tab-accounts').scrollTop = 0`);
        await run('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
        assert.equal(await run('document.documentElement.scrollWidth <= innerWidth'), true, `No horizontal overflow at ${width}px`);
        fs.writeFileSync(path.join(output, `settings-${width}.png`), (await win.webContents.capturePage()).toPNG());
      }
      await win.loadFile(path.join(__dirname,'fixtures/spotify-player.html'));
      await run(fs.readFileSync(path.join(__dirname,'../browser-extension/spotify.js'),'utf8'));
      const resolved = await run('MultiChatSpotify.resolveSong()');
      assert.equal(resolved.href,'https://open.spotify.com/track/0123456789012345678901','Search must select a track rather than an artist');
      await run(`window.playbackEvents=[]; window.playbackJob=MultiChatSpotify.playSong({id:'song-test',href:'https://open.spotify.com/track/0123456789012345678901',title:'La flaca'},event=>playbackEvents.push(event)); true`);
      await run('new Promise(r=>setTimeout(r,700))');
      assert.equal(await run('playbackEvents.length'),0,'Clicking Play alone must never fulfill a redemption');
      await run(`document.body.dataset.advancing='yes'; window.playbackJob`);
      assert.equal(await run(`playbackEvents[0].type`),'played');
      await run('new Promise(r=>setTimeout(r,4500))');
      assert.equal(await run(`playbackEvents.some(event=>event.type==='ended')`),true,'The next request should only start after the track ends');
      await run('MultiChatSpotify.stop()');
      console.log('PASS: browser controls resolve a track and confirm playback only after progress advances (local fixture)');
      await win.loadFile(path.join(__dirname, '../obs.html'));
      await run('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      assert.equal(await run(`getComputedStyle(document.body).backgroundColor`), 'rgba(0, 0, 0, 0)');
      assert.equal(await run(`getComputedStyle(document.getElementById('chat-container'), '::before').display`), 'none', 'OBS must not show desktop empty-state copy');
      await run(`for (let i = 0; i < 5; i++) renderJoinMessage({ platform: 'tiktok', nickname: 'Visitante ' + i });`);
      assert.equal(await run(`document.querySelectorAll('#chat-container .join').length`), 1, 'OBS must use the same grouped arrivals as desktop');
      await run(`renderChatMessage({platform:'tiktok', nickname:'Andrea', comment:'Hola desde OBS'}); renderJoinMessage({platform:'tiktok',nickname:'Marcos'})`);
      assert.equal(await run(`document.querySelectorAll('#chat-container .join').length`), 2, 'OBS arrival groups must not cross chat messages');
      console.log('PASS: chat rendering, pin/unpin, 360/760px layouts and transparent OBS empty state');
    }
    win.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error);
    win.destroy();
    app.exit(1);
  }
});
