const {app,BrowserWindow,session}=require('electron');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest({urls:['https://*/*','http://*/*']},(_,done)=>done({cancel:true}));
 const win=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 const run=code=>win.webContents.executeJavaScript(code);
 const script=fs.readFileSync(path.join(__dirname,'../browser-extension/spotify.js'),'utf8');
 const request={id:'first',href:'https://open.spotify.com/track/0123456789012345678901',title:'La flaca',artist:'Jarabe de Palo'};
 try{
  for(const variant of ['highlight','title-only']){
   await win.loadFile(path.join(__dirname,'fixtures/spotify-album-player.html'));
   if(variant==='title-only')await run(`document.querySelector('[data-testid="context-item-link"]').href='https://open.spotify.com/album/1111111111111111111111'`);
   await run(script);
   const result=await run(`window.events=[]; Promise.race([MultiChatSpotify.playSong(${JSON.stringify(request)},event=>events.push(event)),new Promise((_,reject)=>setTimeout(()=>reject(new Error('An already-playing requested song was not recognized')),2200))])`);
   assert.equal(result.ok,true);
   assert.equal(await run('events[0].type'),'played');
   assert.equal(await run(`document.body.dataset.clicked || ''`),'','Recognizing a playing song must not pause or restart it');
   await run(`document.body.dataset.manual='yes';document.querySelector('[data-testid="playback-position"]').textContent='0:32'`);
   await run('new Promise(r=>setTimeout(r,1100))');
   await run(`document.querySelector('[data-testid="context-item-link"]').href='https://open.spotify.com/track/2222222222222222222222';document.querySelector('[data-testid="context-item-link"]').textContent='Siguiente canción';document.querySelector('[data-testid="playback-position"]').textContent='0:01'`);
   await run('new Promise(r=>setTimeout(r,1200))');
   assert.equal(await run(`events.filter(event=>event.type==='ended').length`),1,'A natural transition or crossfade must release the next queued request');
   await run('MultiChatSpotify.stop()');
   console.log(`PASS: ${variant} footer identity, no extra click, and automatic next-song event`);
  }
  win.destroy();app.exit(0);
 }catch(error){console.error(error);win.destroy();app.exit(1);}
});
