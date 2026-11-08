/* Reads visible controls and standard browser media information only. */
(() => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const visible = node => !!node && node.getClientRects().length > 0;
  const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const trackPath = value => {
    if(!value) return '';
    try {
      const uri=String(value).match(/^spotify:track:([A-Za-z0-9]{22})$/);
      if(uri) return '/track/'+uri[1];
      const url=new URL(value,location.origin);
      const direct=url.pathname.match(/\/track\/([A-Za-z0-9]{22})(?:\/|$)/);
      if(direct) return '/track/'+direct[1];
      const highlighted=url.searchParams.get('highlight') || url.searchParams.get('uri');
      const track=highlighted?.match(/spotify:track:([A-Za-z0-9]{22})(?:$|[^A-Za-z0-9])/);
      return track ? '/track/'+track[1] : '';
    } catch { return ''; }
  };
  const time = value => {
    const parts=String(value || '').trim().split(':').map(Number);
    return parts.length>=2 && parts.every(Number.isFinite) ? parts.reduce((sum,part)=>sum*60+part,0) : NaN;
  };
  let operation=0;
  let cleanup=()=>{};
  async function until(check, timeout=18000) {
    const end=Date.now()+timeout;
    do {const result=check();if(result)return result;await wait(250);} while(Date.now()<end);
    throw new Error('Spotify no mostró resultados de canciones. Incluye el artista y vuelve a intentar.');
  }
  async function resolveSong() {
    const link=await until(()=>[...document.querySelectorAll('main a[href*="/track/"]')].find(node=>visible(node)&&trackPath(node.href)));
    const row=link.closest('[data-testid="tracklist-row"], [role="row"]');
    const artist=row?.querySelector('a[href*="/artist/"]')?.textContent.trim() || '';
    return {href:link.href,title:link.innerText?.trim() || link.textContent.trim() || link.getAttribute('aria-label') || '',artist};
  }
  function readPlayback() {
    const widget=document.querySelector('[data-testid="now-playing-widget"], footer [data-testid="context-item-info"], [data-testid="context-item-info"]') || document.querySelector('footer');
    const links=widget ? [...widget.querySelectorAll('a[href]')] : [];
    const songLink=widget?.querySelector('a[data-testid="context-item-link"], [data-testid="context-item-info-title"] a') || links.find(link=>trackPath(link.href));
    let metadata=null;try{metadata=navigator.mediaSession?.metadata;}catch{}
    const title=songLink?.textContent.trim() || widget?.querySelector('[data-testid="context-item-info-title"]')?.textContent.trim() || metadata?.title || '';
    const artist=links.find(link=>/\/artist\//.test(link.getAttribute('href') || ''))?.textContent.trim() || metadata?.artist || '';
    const track=links.map(link=>trackPath(link.href)).find(Boolean) || '';
    const media=[...document.querySelectorAll('audio,video')].find(element=>!element.paused && Number.isFinite(element.currentTime)) || [...document.querySelectorAll('audio,video')].find(element=>Number.isFinite(element.duration)&&element.duration>5);
    const position=time(document.querySelector('[data-testid="playback-position"]')?.textContent);
    const duration=time(document.querySelector('[data-testid="playback-duration"]')?.textContent);
    const label=document.querySelector('[data-testid="control-button-playpause"]')?.getAttribute('aria-label') || '';
    let paused=/^(play|reproducir)(\b|\s)/i.test(label) ? true : /^(pause|pausar)(\b|\s)/i.test(label) ? false : null;
    if(paused===null && media) paused=media.paused;
    if(paused===null && navigator.mediaSession?.playbackState==='playing') paused=false;
    const ad=/^(advertisement|publicidad|anuncio)(\b|\s)/i.test(title);
    return {track,title,artist,position:Number.isFinite(position)?position:media?.currentTime,duration:Number.isFinite(duration)?duration:media?.duration,paused,ad,media,at:Date.now()};
  }
  function matches(state,request) {
    const expected=trackPath(request.href);
    if(state.track) return state.track===expected;
    if(!state.title || !request.title || normalized(state.title)!==normalized(request.title)) return false;
    return !request.artist || !state.artist || normalized(request.artist)===normalized(state.artist);
  }
  function playButton() {
    return [...document.querySelectorAll('main button[data-testid="play-button"], main button[aria-label]')].find(node=>visible(node)&&!node.disabled&&/^(play|reproducir)(\b|\s)/i.test(node.getAttribute('aria-label') || ''));
  }
  async function playSong(request,emit) {
    cleanup();const mine=++operation;
    if(!trackPath(request.href)) throw new Error('El resultado no es una canción de Spotify.');
    let previous=null;let clicked=false;let confirmed=null;
    const deadline=Date.now()+22000;
    while(Date.now()<deadline) {
      if(mine!==operation) throw new Error('Pedido cancelado.');
      const state=readPlayback();
      const currentMatches=matches(state,request) && !state.ad;
      if(currentMatches && previous && matches(previous,request) && Number.isFinite(state.position) && state.position>previous.position+.02) {confirmed=state;break;}
      if(!clicked && (!currentMatches || state.paused===true)) {
        const button=playButton();
        if(button) {button.click();clicked=true;}
      }
      previous=state;await wait(250);
    }
    if(!confirmed) {
      const state=readPlayback();
      throw new Error(matches(state,request) ? 'La canción está abierta, pero Spotify no mostró que avance la reproducción. Revisa si está en pausa o necesita un clic.' : 'No se pudo identificar la canción que está sonando en Spotify. Mantén su pestaña abierta y vuelve a intentar.');
    }
    emit({type:'played',id:request.id,href:request.href,title:confirmed.title || request.title});
    let last=confirmed;let interruptedAt=0;let finished=false;
    const nearEnd=state=>Number.isFinite(state.duration)&&state.duration>5&&Number.isFinite(state.position)&&state.position+(state.paused===true?0:Math.max(0,(Date.now()-state.at)/1000))>=state.duration-Math.min(12,Math.max(2,state.duration*.2));
    const finish=()=>{if(finished || mine!==operation)return;finished=true;cleanup();emit({type:'ended',id:request.id});};
    const tick=()=>{
      if(mine!==operation || finished)return;
      const state=readPlayback();
      if(state.ad)return;
      if(matches(state,request)) {
        interruptedAt=0;
        const reset=Number.isFinite(last.position)&&Number.isFinite(state.position)&&last.position-state.position>5&&state.position<3;
        if((reset&&nearEnd(last)) || (state.paused===true&&Number.isFinite(state.duration)&&state.position>=state.duration-1)) return finish();
        last=state;
      } else if(state.track || state.title) {
        if(nearEnd(last)) return finish();
        if(!interruptedAt) interruptedAt=Date.now();
        if(Date.now()-interruptedAt>5000) {cleanup();emit({type:'error',id:request.id,message:'Spotify cambió de canción antes de terminar este pedido. Pulsa Siguiente pedido para continuar con la cola.'});}
      }
    };
    const ended=event=>{if(event.target===last.media && !readPlayback().ad && nearEnd(last))finish();};
    const timer=setInterval(tick,1000);
    document.addEventListener('visibilitychange',tick);
    document.addEventListener('ended',ended,true);
    cleanup=()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);document.removeEventListener('ended',ended,true);};
    return {ok:true};
  }
  globalThis.MultiChatSpotify={resolveSong,playSong,stop:()=>{operation++;cleanup();cleanup=()=>{};}};
  if(typeof chrome!=='undefined'&&chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg,_,respond)=>{
      if(msg.type==='music-ping'){respond({ok:true});return;}
      if(msg.type==='stop-monitor'){globalThis.MultiChatSpotify.stop();return;}
      let job;
      if(msg.type==='resolve-song')job=resolveSong();
      if(msg.type==='play-song')job=playSong(msg.request,event=>chrome.runtime.sendMessage({type:'music-event',event}).catch(()=>{}));
      if(job){job.then(respond).catch(error=>respond({error:error.message}));return true;}
    });
  }
})();
