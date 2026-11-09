const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { createObsHandler, allowObsClient } = require('../src/obs-server');
test('OBS serves only public overlay assets and denies source files, traversal and foreign hosts', async () => {
  const server = http.createServer(createObsHandler(path.resolve(__dirname, '..'), 3750));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const request = (url, headers = {}) => new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: server.address().port, path: url, headers: { Host: 'localhost:3750', ...headers } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); }).on('error', reject);
  });
  try {
    assert.equal(await request('/obs.html'), 200);
    assert.equal(await request('/styles/chat.css'), 200);
    for (const url of ['/main.js', '/package.json', '/src/storage.js', '/%2e%2e/private', '/styles/../../main.js']) assert.equal(await request(url), 403);
    assert.equal(await request('/obs.html', { Host: 'evil.example:3750' }), 403);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('a remote site cannot subscribe to the local chat websocket', () => {
  assert.equal(allowObsClient({ host: 'localhost:3750', origin: 'https://evil.example' }, 3750), false);
  assert.equal(allowObsClient({ host: 'localhost:3750', origin: 'http://localhost:3750' }, 3750), true);
  assert.equal(allowObsClient({ host: '127.0.0.1:3750' }, 3750), true);
});
