const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CapturePolicy } = require('../src/capture-policy');
test('screen fallback pauses when clips are disabled or the renderer is already recording', () => {
  const policy = new CapturePolicy();
  assert.equal(policy.shouldCapture, true);
  policy.rendererActive = true; assert.equal(policy.shouldCapture, false);
  policy.rendererActive = false; policy.enabled = false; assert.equal(policy.shouldCapture, false);
  policy.enabled = true; policy.busy = true; assert.equal(policy.shouldCapture, false);
});
