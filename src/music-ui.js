document.addEventListener('DOMContentLoaded', async () => {
  const api = window.overlayAPI;
  const byId = id => document.getElementById(id);
  if (!api?.getMusicState) return;
  let state = { pending: [], current: null };
  const render = next => {
    state = next;
    byId('music-twitch-status').textContent = next.twitch ? `Conectado como ${next.twitch}` : 'Sin conectar';
    byId('music-browser-status').textContent = next.browser ? 'Spotify vinculado' : 'Sin vincular';
    byId('music-status').textContent = next.message || 'Conecta Twitch y vincula Spotify para empezar.';
    byId('music-enabled').checked = !!next.enabled;
    byId('music-pause').textContent = next.paused ? 'Continuar cola' : 'Pausar cola';
    if(document.activeElement!==byId('music-cost')) byId('music-cost').value = next.cost || 500;
    byId('music-create-reward').textContent = next.rewardReady ? 'Actualizar recompensa' : 'Crear recompensa';
    byId('music-create-reward').disabled = !next.twitch || next.pointsEligible !== true;
    byId('music-points-notice').classList.toggle('hidden', !next.twitch || next.pointsEligible !== false);
    byId('music-login').textContent = next.authorization ? 'Esperando autorización…' : next.twitch ? 'Cambiar cuenta de Twitch' : 'Conectar Twitch';
    byId('music-login').disabled = !!next.authorization;
    byId('music-authorization').classList.toggle('hidden', !next.authorization);
    byId('music-user-code').textContent = next.authorization?.userCode || '';
    byId('music-browser-pairing').classList.toggle('hidden', !next.browserPairing);
    byId('music-browser-code').textContent = next.browserPairing?.code || '';
    byId('music-current').replaceChildren();
    if (next.current) {
      const title = document.createElement('strong'); title.textContent = next.current.title || next.current.query;
      const info = document.createElement('p'); info.textContent = `${next.current.user} · ${{opening:'Buscando en Spotify…',playing:'En reproducción',error:'Necesita atención'}[next.current.status] || 'Pendiente'}`;
      byId('music-current').append(title, info);
      if (next.current.error) { const error = document.createElement('p'); error.className = 'music-error'; error.textContent = next.current.error; byId('music-current').append(error); }
    } else byId('music-current').textContent = 'Sin pedidos en reproducción.';
    byId('music-retry').disabled = !next.browser || next.current?.status !== 'error';
    byId('music-skip').disabled = !next.current;
    byId('music-skip').textContent = next.current && !next.current.fulfilled && next.current.status !== 'playing' && !next.current.id.startsWith('test-') ? 'Omitir y devolver puntos' : 'Siguiente pedido';
    byId('music-queue-count').textContent = next.pending.length;
    byId('music-queue').replaceChildren();
    for (const item of next.pending) {
      const row = document.createElement('li'); const text = document.createElement('span'); text.textContent = `${item.query} — ${item.user}`;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn-test'; remove.textContent = item.id.startsWith('test-') ? 'Quitar' : 'Devolver puntos'; remove.addEventListener('click', () => action('remove', { id:item.id })); row.append(text,remove); byId('music-queue').append(row);
    }
  };
  const action = async (type, data = {}) => {
    try { render(await api.musicAction(type,data)); }
    catch (error) { byId('music-status').textContent = error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''); }
  };
  api.onMusicState(render);
  byId('music-open-extension').addEventListener('click', () => api.openMusicExtension().catch(error => { byId('music-status').textContent = error.message; }));
  byId('music-login').addEventListener('click', () => action('login'));
  byId('music-cancel-login').addEventListener('click', () => action('cancel-login'));
  byId('music-open-auth').addEventListener('click', () => { if(state.authorization?.verificationUri) api.openExternalUrl(state.authorization.verificationUri); });
  byId('music-copy-auth-code').addEventListener('click', async()=>{try{await navigator.clipboard.writeText(state.authorization?.userCode || '');byId('music-status').textContent='Código copiado. Confirma la conexión en Twitch.';}catch{byId('music-status').textContent='No se pudo copiar el código.';}});
  byId('music-approve-browser').addEventListener('click',()=>{if(state.browserPairing)action('approve-browser',{id:state.browserPairing.id});});
  byId('music-create-reward').addEventListener('click', () => action('create-reward',{cost:Number(byId('music-cost').value)}));
  byId('music-enabled').addEventListener('change', event => action('enabled',{enabled:event.target.checked}));
  byId('music-pause').addEventListener('click', () => action('pause'));
  byId('music-test').addEventListener('click', () => action('test',{query:byId('music-test-query').value}));
  byId('music-retry').addEventListener('click', () => action('retry'));
  byId('music-skip').addEventListener('click', () => { if(state.current) action('remove',{id:state.current.id}); });
  try { render(await api.getMusicState()); }
  catch { byId('music-status').textContent = 'Abre la versión nueva de MultiChat para configurar la música.'; }
});
