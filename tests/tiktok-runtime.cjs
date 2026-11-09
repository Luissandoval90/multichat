const { app } = require('electron');
const assert = require('node:assert/strict');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  try {
    const sdk = await import('tiktok-live-connector');
    const client = new sdk.TikTokLiveConnection('runtime_check', { signApiKey: 'not-a-real-key', processInitialData: false });
    assert.equal(typeof client.connect, 'function');
    assert.equal(sdk.WebcastEvent.ROOM_USER, 'roomUser');
    assert.equal(sdk.WebcastEvent.EMOTE, 'emote');
    console.log(`PASS: Euler SDK loads in Electron Node ${process.versions.node}; no live connection attempted`);
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
