const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const adapter = require('../platforms/tiktok');
const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture(factory) {
  const client = new EventEmitter();
  client.connect = async () => client.emit('connected');
  client.disconnect = () => { client.disconnected = true; };
  const calls = [], timers = [], received = {};
  const callbacks = Object.fromEntries(['Status', 'Chat', 'Gift', 'Follow', 'Share', 'Join', 'Like', 'Viewers'].map(name => [
    `on${name}`, value => (received[name] ||= []).push(value)
  ]));
  assert.equal(typeof adapter.createConnector, 'function', 'adapter exposes an injectable SDK boundary');
  const connector = adapter.createConnector({
    createClient: factory || (async (...args) => { calls.push(args); return client; }),
    setTimeout: (fn, delay) => { const timer = { fn, delay }; timers.push(timer); return timer; },
    clearTimeout: timer => { timers.splice(timers.indexOf(timer), 1); }
  });
  const connection = connector.connect('@example', callbacks, { eulerApiKey: 'euler-test' });
  return { client, calls, timers, received, connection };
}

test('Euler connection preserves chat, social events, gifts and audience counters', async () => {
  const f = fixture();
  await flush();
  assert.equal(f.calls[0][0], 'example');
  assert.equal(f.calls[0][1].signApiKey, 'euler-test');
  assert.equal(f.calls[0][1].processInitialData, false);
  assert.equal(f.calls[0][1].enableExtendedGiftInfo, false, 'Community keys must not request the Business-only gift catalogue');
  const user = { id: 123n, displayId: 'viewer', nickname: 'Visitante', avatarThumb: { urlList: ['https://avatar'] } };
  f.client.emit('chat', { user, content: 'Hola', emotes: [{ placeInComment: 0, emote: { image: { imageUrl: 'https://emote' } } }] });
  assert.deepEqual(f.received.Chat[0], { platform: 'tiktok', userId: 'viewer', nickname: 'Visitante', avatarUrl: 'https://avatar', comment: 'Hola', emotes: [{ index: 0, url: 'https://emote' }] });
  const gift = { user, repeatCount: 3, giftDetails: { giftType: 1, name: 'Rosa', diamondCount: 1, giftImage: { url: ['https://gift'] } } };
  f.client.emit('gift', { ...gift, repeatEnd: 0 });
  assert.equal(f.received.Gift, undefined);
  f.client.emit('gift', { ...gift, repeatEnd: 1 });
  assert.equal(f.received.Gift[0].giftName, 'Rosa');
  assert.equal(f.received.Gift[0].repeatCount, 3);
  assert.equal(f.received.Gift[0].diamondCount, 1);
  assert.equal(f.received.Gift[0].giftImageUrl, 'https://gift');
  for (const event of ['follow', 'share', 'member']) f.client.emit(event, { user });
  assert.equal(f.received.Follow.length, 1);
  assert.equal(f.received.Share.length, 1);
  assert.equal(f.received.Join.length, 1);
  f.client.emit('roomUser', { total: 23n });
  f.client.emit('like', { user, count: 2n, total: 99n });
  assert.equal(f.received.Viewers.at(-1).viewers, 23);
  assert.equal(f.received.Like[0].totalLikes, 99);
  f.connection.disconnect();
  f.client.emit('disconnected');
  assert.equal(f.timers.length, 0);
});

test('invalid Euler keys stop retries and never expose upstream credentials', async () => {
  const f = fixture(); await flush();
  f.client.emit('error', { exception: Object.assign(new Error('Unauthorized euler-test'), { statusCode: 401 }) });
  f.client.emit('disconnected');
  assert.equal(f.timers.length, 0);
  assert.match(f.received.Status.at(-1).error, /Euler/);
  assert.doesNotMatch(JSON.stringify(f.received), /euler-test/);
});

test('rate limits honor retryAfter and stream end waits thirty seconds', async () => {
  const f = fixture(); await flush();
  f.client.emit('error', { exception: Object.assign(new Error('rate limit'), { statusCode: 429, retryAfter: 180000 }) });
  f.client.emit('disconnected');
  assert.equal(f.timers.length, 1);
  assert.equal(f.timers[0].delay, 180000);
  f.connection.disconnect();
  const g = fixture(); await flush();
  g.client.emit('streamEnd'); g.client.emit('disconnected');
  assert.equal(g.timers.length, 1);
  assert.equal(g.timers[0].delay, 30000);
  g.connection.disconnect();
});

test('a paid-endpoint denial explains the cause and stops futile retries', async () => {
  const f = fixture(); await flush();
  f.client.emit('error', { exception: new Error('[Empty Payload] This endpoint requires a Business plan. Purchase one at https://example.test/?key=euler-test') });
  assert.match(f.received.Status.at(-1).error, /Business/);
  assert.equal(f.timers.length, 0);
  assert.doesNotMatch(JSON.stringify(f.received), /euler-test|example.test/);
  f.connection.disconnect();
});

test('disconnect during SDK initialization does not connect a stale client', async () => {
  let finish;
  const f = fixture(() => new Promise(resolve => { finish = resolve; }));
  f.connection.disconnect(); finish(f.client); await flush();
  assert.equal(f.received.Status, undefined);
  assert.equal(f.client.disconnected, true);
  assert.equal(f.timers.length, 0);
});

test('legacy TikTool key is not reused as an Euler key', async () => {
  assert.equal(typeof adapter.createConnector, 'function');
  let created = false, status;
  adapter.createConnector({ createClient: () => { created = true; } }).connect('example', { onStatus: value => { status = value; } }, { tiktoolApiKey: 'old' });
  await flush();
  assert.equal(created, false);
  assert.match(status.error, /Euler/);
  const context = { window: {}, localStorage: { getItem: () => JSON.stringify({ platforms: { tiktok: { handle: 'example', enabled: true, apiKey: 'old' } } }) } };
  vm.runInNewContext(readFileSync(require.resolve('../src/storage.js'), 'utf8'), context);
  const config = context.window.AppStorage.loadConfig();
  assert.equal(config.platforms.tiktok.handle, 'example');
  assert.equal(config.platforms.tiktok.enabled, true);
  assert.equal(config.platforms.tiktok.eulerApiKey, '');
  assert.equal(config.platforms.tiktok.apiKey, undefined);
});

test('disconnect while transport is connecting closes a late socket', async () => {
  let finish, closes = 0;
  const client = new EventEmitter();
  client.connect = () => new Promise(resolve => { finish = resolve; });
  client.disconnect = () => { closes++; };
  const f = fixture(async () => client);
  await flush();
  f.connection.disconnect();
  const before = closes;
  finish(); await flush();
  assert.equal(closes, before + 1, 'late connection must be disconnected again');
});

test('a network disconnect creates a fresh transport after the scheduled delay', async () => {
  const f = fixture(); await flush();
  f.client.emit('disconnected');
  assert.equal(f.timers[0].delay, 3000);
  f.timers.shift().fn(); await flush();
  assert.equal(f.calls.length, 2);
  assert.equal(f.received.Status.at(-1).connected, true);
  f.connection.disconnect();
});
test('TikTok forwards native badges and room moderation metadata without extra requests', async () => {
  const f = fixture(); await flush();
  f.client.emit('chat', { content: 'Hola', user: { displayId: 'moderador', userAttr: { isAdmin: true }, verified: true, badgeList: [{ combine: { icon: { urlList: ['https://native.example/level.webp'] }, str: '5' } }] } });
  const message = f.received.Chat[0];
  assert.equal(message.isModerator, true);
  assert.equal(message.isVerified, true);
  assert.equal(message.badges[0].imageUrl, 'https://native.example/level.webp');
  assert.equal(f.calls.length, 1);
  f.connection.disconnect();
});
