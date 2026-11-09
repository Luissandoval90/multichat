const { test } = require('node:test');
const assert = require('node:assert/strict');
const safe = require('../src/safe-content');
test('untrusted chat attributes cannot inject markup or local resources', () => {
  assert.equal(safe.mediaUrl('https://images.example/a.png'), 'https://images.example/a.png');
  for (const url of ['javascript:alert(1)', 'file:///C:/secret', 'https://images.example/" onerror="alert(1)', 'data:text/html,hello', 'http://insecure.test/a']) assert.equal(safe.mediaUrl(url), '');
  assert.equal(safe.escape('<img src=x onerror="x">&\''), '&lt;img src=x onerror=&quot;x&quot;&gt;&amp;&#39;');
  assert.equal(safe.platform('" onclick="x'), 'unknown');
  assert.equal(safe.color('red;background:url(x)'), '');
  assert.equal(safe.color('#aabbcc'), '#aabbcc');
});
