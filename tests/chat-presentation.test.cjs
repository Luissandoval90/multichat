const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ConnectionTransitions, badges, gift } = require('../src/chat-presentation');
test('connection notices distinguish chat access, live broadcasts and actual offline events', () => {
  const states = new ConnectionTransitions();
  assert.equal(states.update({ platform: 'twitch', connected: true }).kind, 'chat');
  assert.equal(states.update({ platform: 'twitch', connected: true }), null);
  assert.equal(states.update({ platform: 'tiktok', connected: true, live: true }).kind, 'live');
  const offline = states.update({ platform: 'tiktok', connected: false, live: false });
  assert.equal(offline.kind, 'offline'); assert.equal(offline.sound, true);
  assert.equal(states.update({ platform: 'tiktok', connected: false, live: false, error: 'checking again' }), null);
  assert.equal(states.update({ platform: 'tiktok', connected: true, live: true }).kind, 'live');
  assert.equal(states.update({ platform: 'tiktok', connected: false, error: 'network' }).kind, 'disconnected');
});
test('roles and original badge images come only from delivered metadata', () => {
  assert.deepEqual(badges({ platform: 'twitch', badges: { broadcaster: '1', moderator: '1', vip: '1', subscriber: '12' } }).map(x => x.role), ['owner', 'moderator', 'vip', 'subscriber']);
  assert.equal(badges({ platform: 'youtube', isModerator: true })[0].role, 'moderator');
  assert.equal(badges({ platform: 'tiktok', badges: [{ imageUrl: 'https://native.example/badge.webp', label: 'Nivel 5' }] })[0].imageUrl, 'https://native.example/badge.webp');
  assert.deepEqual(badges({ platform: 'tiktok' }), []);
});
test('gift names, images and values remain original, with no invented prices or replacement pictures', () => {
  const rose = gift({ platform: 'tiktok', giftName: 'Rose', giftImageUrl: 'https://native.example/rose.webp', repeatCount: 3, diamondCount: 1 });
  assert.equal(rose.name, 'Rose'); assert.equal(rose.imageUrl, 'https://native.example/rose.webp'); assert.equal(rose.totalDiamonds, 3);
  const missing = gift({ platform: 'tiktok', giftName: 'Lion' });
  assert.equal(missing.imageUrl, ''); assert.equal(missing.totalDiamonds, 0);
  assert.equal(gift({ platform: 'twitch', giftName: '100 bits', diamondCount: 100 }).totalDiamonds, 0);
});
