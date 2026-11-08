const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '../src/music/queue.js');
const { SongQueue } = fs.existsSync(file) ? require(file) : {};
const redemption = (id, text = 'La flaca Jarabe de Palo', user = 'andrea', reward = 'reward-500') => ({
  id, user_id: user, user_name: user, user_input: text, reward: { id: reward, cost: 500 },
});

test('accepts song names only from the configured reward and ignores duplicate deliveries', () => {
  assert.equal(typeof SongQueue, 'function', 'Song requests are not implemented yet');
  const q = new SongQueue({ rewardId: 'reward-500' });
  assert.equal(q.add(redemption('wrong', 'Hola', 'andrea', 'other')).accepted, false);
  assert.equal(q.add(redemption('blank', '   ')).accepted, false);
  assert.equal(q.add(redemption('url', 'https://example.com')).accepted, false);
  assert.equal(q.add(redemption('one')).accepted, true);
  assert.equal(q.add(redemption('one')).accepted, false);
  assert.equal(q.snapshot().pending.length, 1);
  assert.equal(q.snapshot().pending[0].query, 'La flaca Jarabe de Palo');
});

test('plays requests in order and waits for actual playback confirmation', () => {
  assert.equal(typeof SongQueue, 'function', 'Song requests are not implemented yet');
  const q = new SongQueue({ rewardId: 'reward-500' });
  q.add(redemption('one')); q.add(redemption('two', 'Lamento boliviano'));
  assert.equal(q.take().id, 'one');
  assert.equal(q.take(), null, 'A second request must not interrupt the active request');
  assert.equal(q.confirm('two', 'Otra canción'), false, 'Unrelated browser responses must be ignored');
  assert.equal(q.snapshot().current.status, 'opening');
  assert.equal(q.confirm('one', 'La flaca'), true);
  assert.equal(q.snapshot().current.status, 'playing');
  assert.equal(q.finish('two'), false);
  assert.equal(q.finish('one'), true);
  assert.equal(q.take().id, 'two');
});

test('limits each viewer and preserves failed songs for a visible retry', () => {
  assert.equal(typeof SongQueue, 'function', 'Song requests are not implemented yet');
  const q = new SongQueue({ rewardId: 'reward-500', perUser: 2, limit: 3 });
  q.add(redemption('one')); q.add(redemption('two'));
  assert.equal(q.add(redemption('three')).accepted, false);
  assert.equal(q.add(redemption('other', 'Rosas', 'lucia')).accepted, true);
  assert.equal(q.add(redemption('full', 'Rosas', 'diego')).accepted, false);
  q.take(); q.fail('one', 'Activa Spotify en Brave');
  assert.equal(q.snapshot().current.status, 'error');
  assert.equal(q.take(), null);
  assert.equal(q.retry(), true);
  assert.equal(q.snapshot().current.status, 'opening');
});
