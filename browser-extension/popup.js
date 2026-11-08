const status = document.getElementById('status');
chrome.storage.local.get(['status','pairingNumber']).then(saved => { status.textContent=saved.status || 'Sin conectar';document.getElementById('pairing-number').textContent=saved.pairingNumber || ''; });
document.getElementById('connect').addEventListener('click',async()=>{
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.url?.startsWith('https://open.spotify.com/'))throw new Error('Abre Spotify y pulsa el icono de MultiChat desde esa pestaña.');
  await chrome.storage.local.remove('pairingCode');
  await chrome.storage.local.set({spotifyTabId:tab.id,status:'Conectando…',pairingNumber:''});
  await chrome.runtime.sendMessage({type:'reconnect'});status.textContent='Conectando con MultiChat…';
 }catch(error){status.textContent=error.message;}
});
chrome.storage.onChanged.addListener(changes=>{if(changes.status)status.textContent=changes.status.newValue;if(changes.pairingNumber)document.getElementById('pairing-number').textContent=changes.pairingNumber.newValue || '';});
