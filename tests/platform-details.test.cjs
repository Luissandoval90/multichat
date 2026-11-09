const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
function load(name) {
  let client, requests = 0;
  class Client extends EventEmitter {
    constructor() { super(); client = this; }
    connect() { return Promise.resolve(); }
    disconnect() { return Promise.resolve(); }
    start() { return Promise.resolve(true); }
    stop() {}
  }
  const context = { module: { exports: {} }, console: { log() {}, error() {} }, URL, setTimeout, clearTimeout, setInterval, clearInterval,
    require: module => module === 'tmi.js' ? { Client } : module === 'youtube-chat' ? { LiveChat: Client } : module === 'https' ? { request: () => { requests++; throw new Error('No extra requests allowed'); } } : require(module) };
  vm.runInNewContext(fs.readFileSync(require.resolve('../platforms/' + name), 'utf8'), context);
  return { connect: context.module.exports.connect, get client() { return client; }, get requests() { return requests; } };
}
test('Twitch moderator badges are forwarded without per-viewer avatar API requests', async () => {
  const adapter = load('twitch'); const messages = [];
  const connection = adapter.connect('example', { onChat: data => messages.push(data), onStatus() {} }, { twitchClientId: 'public-test', twitchClientSecret: 'test-only' });
  adapter.client.emit('message', '#example', { username: 'mod', badges: { moderator: '1' }, 'display-name': 'Moderador' }, 'Hola', false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(messages[0].badges.moderator, '1');
  assert.equal(adapter.requests, 0);
  connection.disconnect();
});
test('YouTube retains real role flags, badge images, Super Stickers and actual amounts', async () => {
  const adapter = load('youtube'); const messages = [], gifts = [];
  const connection = adapter.connect('@example', { onChat: data => messages.push(data), onGift: data => gifts.push(data), onStatus() {} });
  await new Promise(resolve => setImmediate(resolve));
  adapter.client.emit('chat', { author: { name: 'Ana', channelId: '1', badge: { thumbnail: { url: 'https://native.example/member.png' }, label: 'Miembro' } }, message: [{ text: 'Hola' }], isModerator: true, isOwner: false, isVerified: true });
  assert.equal(messages[0].isModerator, true); assert.equal(messages[0].isVerified, true);
  assert.equal(messages[0].badges[0].imageUrl, 'https://native.example/member.png');
  adapter.client.emit('chat', { author: { name: 'Luis', channelId: '2' }, message: [], superchat: { amount: 'MX$50', sticker: { url: 'https://native.example/sticker.webp' } } });
  assert.equal(gifts[0].giftImageUrl, 'https://native.example/sticker.webp');
  assert.equal(gifts[0].amount, 'MX$50'); assert.equal(messages.length, 1);
  assert.equal(adapter.requests, 0);
  connection.disconnect();
});
