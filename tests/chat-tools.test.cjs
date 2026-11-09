const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChatHistory } = require('../src/chat-tools');
test('chat keeps a bounded history and deduplicates only explicit platform message IDs', () => {
  const history = new ChatHistory(3);
  assert.equal(history.accept({ platform: 'twitch', messageId: 'one' }), true);
  assert.equal(history.accept({ platform: 'twitch', messageId: 'one' }), false);
  assert.equal(history.accept({ platform: 'kick', messageId: 'one' }), true);
  assert.equal(history.accept({ platform: 'twitch', comment: 'same' }), true);
  assert.equal(history.accept({ platform: 'twitch', comment: 'same' }), true);
  for (let i = 0; i < 2000; i++) history.accept({ platform: 'twitch', messageId: String(i) });
  assert.ok(history.seen.size <= 600);
});
test('search matches Spanish accents and platform filters without parsing markup', () => {
  const history = new ChatHistory();
  assert.equal(history.matches('José: qué canción', 'jose', 'tiktok', 'all'), true);
  assert.equal(history.matches('José: qué canción', 'cancion', 'tiktok', 'twitch'), false);
  assert.equal(history.matches('<script> Hola', '<script>', 'twitch', 'twitch'), true);
});
