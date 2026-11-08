const {test}=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const crypto=require('node:crypto');
const {MusicService}=require('../src/music/service');const {TwitchMusicClient}=require('../src/music/twitch-client');
test('a new user connects their own channel without developer credentials or callback ports',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'multichat-service-test-'));const key=crypto.randomBytes(32);let pollCount=0;const posted=[];
 const storage={isEncryptionAvailable:()=>true,encryptString:text=>{const iv=crypto.randomBytes(12);const c=crypto.createCipheriv('aes-256-gcm',key,iv);const bytes=Buffer.concat([c.update(text,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),bytes]);},decryptString:bytes=>{const c=crypto.createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));c.setAuthTag(bytes.subarray(12,28));return Buffer.concat([c.update(bytes.subarray(28)),c.final()]).toString();}};
 const server=http.createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;if(raw)posted.push(new URLSearchParams(raw));res.setHeader('Content-Type','application/json');
  if(req.url==='/device')return res.end(JSON.stringify({device_code:'device',user_code:'LINKCODE',verification_uri:'https://www.twitch.tv/activate?device-code=LINKCODE',expires_in:60,interval:1}));
  if(req.url==='/token'&&++pollCount===1){res.statusCode=400;return res.end(JSON.stringify({message:'authorization_pending'}));}
  if(req.url==='/token')return res.end(JSON.stringify({access_token:'personal-token',refresh_token:'personal-refresh',expires_in:14400}));
  if(req.url==='/validate')return res.end(JSON.stringify({client_id:'publicid',user_id:'friend',login:'friend_channel',scopes:['channel:manage:redemptions'],expires_in:14400}));
  if(req.url==='/users')return res.end(JSON.stringify({data:[{id:'friend',broadcaster_type:'affiliate'}]}));
  res.statusCode=404;res.end('{}');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;const opened=[];
 const service=new MusicService({directory,safeStorage:storage,openExternal:uri=>opened.push(uri),onChange:()=>{},publicClientId:'publicid',clientFactory:options=>new TwitchMusicClient({...options,apiBase:base,authBase:base})});
 try{
  const state=await service.action('login');
  assert.equal(state.authorization?.userCode,'LINKCODE','The user should see a Twitch activation code, not credential fields');
  assert.equal(opened[0],'https://www.twitch.tv/activate?device-code=LINKCODE');
  for(let i=0;i<80&&!service.state().twitch;i++)await new Promise(r=>setTimeout(r,50));
  assert.equal(service.state().twitch,'friend_channel');assert.equal(service.state().pointsEligible,true);
  assert.equal(service.config.clientSecret,undefined);assert.equal(service.authServer,undefined);
  assert.ok(posted.every(body=>!body.has('client_secret')));
  assert.equal(fs.readFileSync(path.join(directory,'music-private.bin')).includes(Buffer.from('personal-token')),false);
  const before=posted.length;
  service.bridge.emit('played',{id:'already-fulfilled',fulfilled:true});
  await new Promise(r=>setTimeout(r,100));
  assert.equal(posted.length,before,'Replaying an already fulfilled request must not fulfill it again on Twitch');
 }finally{
  await service.close();server.closeAllConnections();await new Promise(r=>server.close(r));
  if(path.dirname(directory)===os.tmpdir()&&path.basename(directory).startsWith('multichat-service-test-'))fs.rmSync(directory,{recursive:true});
 }
});
