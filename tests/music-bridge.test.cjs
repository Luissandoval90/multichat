const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocket } = require('ws');
const { SongQueue } = require('../src/music/queue');
const file = path.join(__dirname, '../src/music/browser-bridge.js');
const { BrowserBridge } = fs.existsSync(file) ? require(file) : {};
const waitFor = async (predicate) => { for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(r => setTimeout(r, 10)); } assert.fail('Timed out waiting for browser bridge'); };
const connect = port => new WebSocket(`ws://127.0.0.1:${port}`, { origin: `chrome-extension://${'a'.repeat(32)}` });
test('local browser bridge authenticates and advances only on matching playback events', async () => {
  assert.equal(typeof BrowserBridge, 'function', 'The browser bridge is not implemented yet');
  const q = new SongQueue({ rewardId: 'songs' });
  q.add({ id: 'one', user_id: 'a', user_input: 'La flaca', reward: { id: 'songs' } });
  q.add({ id: 'two', user_id: 'b', user_input: 'Rosas', reward: { id: 'songs' } });
  const bridge = new BrowserBridge({ queue: q, code: 'pairing-secret', onChange: () => {} });
  const port = await bridge.start(0);
  const ws = connect(port); const messages = []; ws.on('message', raw => messages.push(JSON.parse(raw)));
  try {
    await new Promise(r => ws.once('open', r));
    ws.send(JSON.stringify({ type: 'hello', code: 'pairing-secret' }));
    await waitFor(() => messages.some(m => m.type === 'ready'));
    bridge.pump();
    await waitFor(() => messages.some(m => m.type === 'play'));
    assert.equal(messages.find(m => m.type === 'play').request.query, 'La flaca');
    ws.send(JSON.stringify({ type: 'ended', id: 'wrong' }));
    await new Promise(r => setTimeout(r, 30));
    assert.equal(q.snapshot().current.id, 'one');
    ws.send(JSON.stringify({ type: 'played', id: 'one', title: 'La flaca', href: 'https://open.spotify.com/track/0123456789012345678901' }));
    await waitFor(() => q.snapshot().current?.status === 'playing');
    ws.send(JSON.stringify({ type: 'ended', id: 'one' }));
    await waitFor(() => q.snapshot().current?.id === 'two');
    assert.equal(q.snapshot().current.status, 'opening');
  } finally { ws.close(); await bridge.close(); }
});
test('rejects an incorrect pairing code without exposing the pending song', async () => {
  assert.equal(typeof BrowserBridge, 'function', 'The browser bridge is not implemented yet');
  const bridge = new BrowserBridge({ queue: new SongQueue(), code: 'correct', onChange: () => {} });
  const port = await bridge.start(0); const ws = connect(port); const messages = [];
  ws.on('message', raw => messages.push(JSON.parse(raw)));
  try {
    await new Promise(r => ws.once('open', r));
    const closed = new Promise(r => ws.once('close', r));
    ws.send(JSON.stringify({ type: 'hello', code: 'wrong' })); await closed;
    assert.equal(bridge.connected, false);
    assert.equal(messages.some(m => m.type === 'play'), false);
  } finally { await bridge.close(); }
});
test('removing a pending song must not disable the timeout for the opening song', async () => {
  const queue = new SongQueue({rewardId:'songs'});
  queue.add({id:'active',user_input:'La flaca',reward:{id:'songs'}});
  queue.add({id:'pending',user_input:'Rosas',reward:{id:'songs'}});
  const bridge = new BrowserBridge({queue,code:'code',onChange:()=>{},openTimeoutMs:80});
  const port = await bridge.start(0); const ws = connect(port);
  try {
    await new Promise(r=>ws.once('open',r)); ws.send(JSON.stringify({type:'hello',code:'code'}));
    await waitFor(()=>queue.current?.status==='opening');
    bridge.cancel('pending');
    await new Promise(r=>setTimeout(r,150));
    assert.equal(queue.snapshot().current.status,'error','An unconfirmed song must still time out');
  } finally {ws.close();await bridge.close();}
});
test('a new browser can pair without copying secrets only after approval in MultiChat', async()=>{
  const bridge=new BrowserBridge({queue:new SongQueue(),code:'stored-private-code',onChange:()=>{}});
  const port=await bridge.start(0);const ws=connect(port);const messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));
  try{
    await new Promise(r=>ws.once('open',r));ws.send(JSON.stringify({type:'pair'}));
    await new Promise(r=>setTimeout(r,60));
    assert.ok(bridge.pairing,'The app must receive a browser approval request');
    assert.equal(bridge.connected,false,'Browser pairing must never authorize itself');
    assert.equal(messages.find(m=>m.type==='pair-request').code.length,6);
    assert.equal(messages.some(m=>m.code==='stored-private-code'),false);
    assert.throws(()=>bridge.approvePair('wrong-request'));
    bridge.approvePair(bridge.pairing.id);
    await waitFor(()=>messages.some(m=>m.type==='ready'));
    assert.equal(bridge.connected,true);
    assert.equal(messages.find(m=>m.type==='paired').code,'stored-private-code');
  }finally{ws.close();await bridge.close();}
});
