const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const http = require('node:http');
const file = path.join(__dirname, '../src/music/twitch-client.js');
const { TwitchMusicClient } = fs.existsSync(file) ? require(file) : {};
test('polls the owned reward and fulfills or refunds a specific redemption', async () => {
  assert.equal(typeof TwitchMusicClient, 'function', 'Twitch reward integration is not implemented yet');
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost'); let body = ''; for await (const chunk of req) body += chunk;
    calls.push({ path: url.pathname, params: url.searchParams, method: req.method, body, auth: req.headers.authorization });
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/validate') return res.end(JSON.stringify({ client_id:'cid', user_id:'owner', login:'vamz', scopes:['channel:manage:redemptions'], expires_in:3600 }));
    if (req.method === 'GET' && url.pathname.endsWith('/redemptions')) return res.end(JSON.stringify({ data:[{id:'paid-request', user_input:'La flaca', reward:{id:'reward'}, user_id:'viewer'}] }));
    if (req.method === 'POST') return res.end(JSON.stringify({ data:[{id:'reward',title:'Pedir canción',cost:500}] }));
    res.end(JSON.stringify({ data:[] }));
  });
  await new Promise(r => server.listen(0,'127.0.0.1',r)); const base=`http://127.0.0.1:${server.address().port}`;
  const client = new TwitchMusicClient({ config:{clientId:'cid',accessToken:'access',rewardId:'reward'}, apiBase:base, authBase:base, save:()=>{} });
  try {
    await client.validate();
    const rewards = await client.poll();
    assert.equal(rewards[0].user_input,'La flaca');
    const poll = calls.find(c => c.method === 'GET' && c.path.endsWith('/redemptions'));
    assert.equal(poll.params.get('broadcaster_id'),'owner'); assert.equal(poll.params.get('status'),'UNFULFILLED');
    await client.setRedemption('paid-request','FULFILLED'); await client.setRedemption('bad-request','CANCELED');
    const changes=calls.filter(c => c.method==='PATCH');
    assert.equal(changes[0].params.get('id'),'paid-request'); assert.deepEqual(JSON.parse(changes[0].body),{status:'FULFILLED'});
    assert.deepEqual(JSON.parse(changes[1].body),{status:'CANCELED'});
    assert.ok(calls.every(c=>c.auth==='Bearer access' || c.path==='/validate'));
  } finally { server.closeAllConnections(); await new Promise(r=>server.close(r)); }
});
test('device login and rotating refresh use only the public client ID', async () => {
  const calls=[];let attempts=0;
  const server=http.createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk;const body=new URLSearchParams(raw);calls.push(body);
    res.setHeader('Content-Type','application/json');
    if(req.url==='/device')return res.end(JSON.stringify({device_code:'device-only',user_code:'ABCD1234',verification_uri:'https://www.twitch.tv/activate?public=true&device-code=ABCD1234',expires_in:300,interval:5}));
    if(body.get('grant_type')==='urn:ietf:params:oauth:grant-type:device_code'&&++attempts===1){res.statusCode=400;return res.end(JSON.stringify({error:'Bad Request',message:'authorization_pending'}));}
    res.end(JSON.stringify({access_token:'new-access',refresh_token:'next-refresh',expires_in:14400}));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  const config={clientId:'public-client',clientSecret:'old-secret-must-not-leave-device',authFlow:'device'};
  const client=new TwitchMusicClient({config,save:()=>{},authBase:base});
  try{
    assert.equal(typeof client.beginDeviceLogin,'function','One-button public login is missing');
    const device=await client.beginDeviceLogin();assert.equal(device.userCode,'ABCD1234');
    assert.equal((await client.checkDeviceLogin(device.deviceCode)).pending,true);
    assert.equal((await client.checkDeviceLogin(device.deviceCode)).connected,true);
    await Promise.all([client.refresh(),client.refresh()]);
    assert.equal(calls.filter(c=>c.get('grant_type')==='refresh_token').length,1,'Single-use refresh tokens must not be exchanged concurrently');
    assert.ok(calls.every(c=>!c.has('client_secret')),'A public desktop client must not transmit a shared secret');
    assert.equal(config.refreshToken,'next-refresh');
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
