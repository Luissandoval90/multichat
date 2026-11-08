let socket = null;
let connecting = false;
let generation = 0;
let activeId = null;
let heartbeat;

async function connect() {
  if (connecting || socket?.readyState === WebSocket.OPEN) return;
  const { pairingCode, spotifyTabId } = await chrome.storage.local.get(['pairingCode', 'spotifyTabId']);
  if (!spotifyTabId) return;
  connecting = true;
  const current = new WebSocket('ws://127.0.0.1:3752'); socket = current;
  current.onopen = () => current.send(JSON.stringify(pairingCode ? { type: 'hello', code: pairingCode } : {type:'pair'}));
  current.onerror = () => {};
  current.onclose = () => {
    if (socket !== current) return;
    socket = null; connecting = false; clearInterval(heartbeat);
    chrome.storage.local.set({ status: 'Sin conexión con MultiChat. Ábrelo y pulsa Conectar Spotify para vincular de nuevo.',pairingNumber:'' });
  };
  current.onmessage = async event => {
    let msg; try { msg = JSON.parse(event.data); } catch { return; }
    if (msg.type === 'pair-request') {
      chrome.storage.local.set({status:'Confirma este número en Música de MultiChat.',pairingNumber:msg.code});
      clearInterval(heartbeat);heartbeat=setInterval(()=>{if(current.readyState===WebSocket.OPEN)current.send(JSON.stringify({type:'pair-ping'}));},20000);
    } else if (msg.type === 'paired') {
      await chrome.storage.local.set({pairingCode:msg.code,pairingNumber:''});
    } else if (msg.type === 'ready') {
      connecting = false;
      chrome.storage.local.set({ status: 'Conectado con MultiChat' });
      clearInterval(heartbeat); heartbeat = setInterval(() => { if (current.readyState === WebSocket.OPEN) current.send(JSON.stringify({ type: 'ping' })); }, 20000);
    } else if (msg.type === 'play') {
      const stamp = ++generation; activeId = msg.request.id;
      try {
        await navigate(spotifyTabId, `https://open.spotify.com/search/${encodeURIComponent(msg.request.query)}/tracks`);
        if (stamp !== generation) return;
        const found = await sendToSpotify(spotifyTabId, { type: 'resolve-song', query: msg.request.query });
        if (!found?.href || !/^https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/[A-Za-z0-9]{22}(?:\?|$)/.test(found.href)) throw new Error(found?.error || 'No se encontró una canción. Prueba incluyendo el artista.');
        await navigate(spotifyTabId, found.href);
        if (stamp !== generation) return;
        const result = await sendToSpotify(spotifyTabId, { type: 'play-song', request: { ...msg.request, href: found.href, title: found.title, artist: found.artist || '' } });
        if (stamp !== generation) return;
        if (!result?.ok) throw new Error(result?.error || 'Spotify no confirmó la reproducción.');
      } catch (error) {
        if (stamp === generation) send({ type: 'error', id: msg.request.id, message: error.message || 'Revisa la pestaña de Spotify.' });
      }
    } else if (msg.type === 'cancel' && msg.id === activeId) {
      generation++; activeId = null;
      chrome.tabs.sendMessage(spotifyTabId, { type: 'stop-monitor', id: msg.id }).catch(() => {});
    }
  };
}
function send(message) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }
async function sendToSpotify(tabId, message) {
  for (let i=0;i<10;i++) {
    try { await chrome.tabs.sendMessage(tabId,{type:'music-ping'}); return chrome.tabs.sendMessage(tabId,message); }
    catch (error) { if (i===9) throw new Error('La extensión no pudo acceder a Spotify. Recarga la pestaña y reintenta.'); await new Promise(resolve=>setTimeout(resolve,300)); }
  }
}
async function navigate(tabId, url) {
  await chrome.tabs.update(tabId, { url });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Spotify tardó demasiado en cargar. Abre su pestaña y reintenta.')), 30000);
    const listener = (id, info) => { if (id === tabId && info.status === 'complete') finish(); };
    function finish(error) { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); error ? reject(error) : resolve(); }
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then(tab => { if (tab.status === 'complete') finish(); }).catch(finish);
  });
}
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.type === 'reconnect' && !sender.tab) {
    generation++; activeId = null; clearInterval(heartbeat); socket?.close(); socket = null; connecting = false;
    connect().then(() => respond({ ok: true })).catch(error => respond({ error: error.message })); return true;
  }
  if (msg.type === 'music-event' && sender.tab?.url?.startsWith('https://open.spotify.com/')) {
    chrome.storage.local.get('spotifyTabId').then(({ spotifyTabId }) => {
      if (sender.tab.id === spotifyTabId && msg.event?.id === activeId && ['played', 'ended', 'error'].includes(msg.event.type)) send(msg.event);
    });
  }
});
chrome.alarms.create('music-reconnect', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'music-reconnect') connect().catch(() => {}); });
chrome.runtime.onStartup.addListener(() => connect().catch(() => {}));
connect().catch(() => {});
