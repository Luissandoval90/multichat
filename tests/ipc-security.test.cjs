const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isTrustedSender } = require('../src/ipc-security');
test('privileged IPC accepts only the application main frame', () => {
  const window = { webContents: { id: 9 }, isDestroyed: () => false };
  const url = 'file:///app/overlay.html';
  assert.equal(isTrustedSender({ sender: { id: 9 }, senderFrame: { url, parent: null } }, window, url), true);
  for (const event of [{ sender: { id: 1 }, senderFrame: { url } }, { sender: { id: 9 }, senderFrame: { url: 'https://evil.test' } }, { sender: { id: 9 }, senderFrame: { url, parent: {} } }]) assert.equal(isTrustedSender(event, window, url), false);
});
