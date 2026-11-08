const { EventEmitter } = require('events');
const { WebSocketServer, WebSocket } = require('ws');
const { timingSafeEqual, randomBytes, randomInt } = require('crypto');

class BrowserBridge extends EventEmitter {
  constructor({ queue, code, onChange, openTimeoutMs = 60000 }) {
    super(); this.queue = queue; this.code = code; this.onChange = onChange;
    this.client = null; this.paused = false; this.openTimer = null;
    this.openTimeoutMs = openTimeoutMs;
  }
  get connected() { return this.client?.readyState === WebSocket.OPEN; }
  get pairing() { return this.pendingPair ? {id:this.pendingPair.id,code:this.pendingPair.code} : null; }
  approvePair(id) {
    const pending=this.pendingPair;
    if(!pending || pending.id!==id || pending.socket.readyState!==WebSocket.OPEN) throw new Error('La solicitud de Brave venció. Vuelve a conectar desde la extensión.');
    clearTimeout(pending.timer);this.pendingPair=null;
    pending.socket.send(JSON.stringify({type:'paired',code:this.code}));pending.accept();
  }
  start(port = 3752) {
    return new Promise((resolve, reject) => {
      this.server = new WebSocketServer({ host: '127.0.0.1', port, maxPayload: 8192,
        verifyClient: ({ origin }) => /^chrome-extension:\/\/[a-p]{32}$/.test(origin || ''),
      });
      this.server.once('error', reject);
      this.server.once('listening', () => resolve(this.server.address().port));
      this.server.on('connection', socket => {
        let authenticated = false;
        const timeout = setTimeout(() => socket.close(4001, 'Emparejamiento requerido'), 5000);
        const accept = () => {
          authenticated = true; clearTimeout(timeout);
          if (this.client && this.client!==socket) {
            const active=this.queue.snapshot().current;
            if(active) this.queue.fail(active.id,'Se cambió la conexión de Spotify. Revisa el pedido y reintenta o continúa con el siguiente.');
            this.client.close(4000, 'Otra extensión se conectó');
          }
          this.client=socket;socket.send(JSON.stringify({type:'ready'}));this.onChange();this.pump();
        };
        socket.on('error', () => {});
        socket.on('message', raw => {
          let msg; try { msg = JSON.parse(raw); } catch { return socket.close(4002); }
          if (!authenticated) {
            if(msg.type==='pair-ping' && this.pendingPair?.socket===socket) {socket.send(JSON.stringify({type:'pair-wait'}));return;}
            if(msg.type==='pair') {
              if(this.pendingPair) return socket.close(4001,'Hay otra solicitud pendiente');
              clearTimeout(timeout);
              const pending={id:randomBytes(16).toString('hex'),code:String(randomInt(100000,1000000)),socket,accept};
              pending.timer=setTimeout(()=>socket.close(4001,'Solicitud vencida'),60000);this.pendingPair=pending;
              socket.send(JSON.stringify({type:'pair-request',code:pending.code}));this.onChange();return;
            }
            const actual = Buffer.from(String(msg.code || '')); const expected = Buffer.from(this.code);
            if (msg.type !== 'hello' || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return socket.close(4001);
            accept();
            return;
          }
          if (this.client !== socket) return;
          if (msg.type === 'ping') return socket.send(JSON.stringify({ type: 'pong' }));
          const item = this.queue.snapshot().current;
          if (!item || item.id !== msg.id) return;
          if (msg.type === 'played' && /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/[A-Za-z0-9]{22}(?:\?|$)/.test(msg.href || '')) {
            if (this.queue.confirm(msg.id, msg.title)) { clearTimeout(this.openTimer); this.emit('played', item); }
          } else if (msg.type === 'ended' && item.status === 'playing') {
            this.queue.finish(msg.id); this.pump();
          } else if (msg.type === 'error') {
            clearTimeout(this.openTimer); this.queue.fail(msg.id, msg.message || 'Spotify no pudo reproducir este pedido.');
          }
          this.onChange();
        });
        socket.on('close', () => {
          clearTimeout(timeout);
          if(this.pendingPair?.socket===socket){clearTimeout(this.pendingPair.timer);this.pendingPair=null;this.onChange();}
          if (this.client !== socket) return;
          this.client = null; clearTimeout(this.openTimer);
          const item = this.queue.snapshot().current;
          if (item) this.queue.fail(item.id, 'Se perdió la conexión con Brave. Revisa Spotify y reintenta o continúa con el siguiente pedido.');
          this.onChange();
        });
      });
    });
  }
  send(item) {
    if (!this.connected) return;
    this.client.send(JSON.stringify({ type: 'play', request: item }));
    clearTimeout(this.openTimer);
    this.openTimer = setTimeout(() => {
      this.queue.fail(item.id, 'Spotify no confirmó la reproducción. Abre la pestaña y revisa si necesita un clic.');
      this.onChange();
    }, this.openTimeoutMs);
  }
  pump() {
    if (!this.connected || this.paused) return;
    const item = this.queue.take();
    if (item) { this.send(item); this.onChange(); }
  }
  retry() {
    if (!this.connected) throw new Error('Conecta la extensión de Brave primero.');
    if (this.queue.retry()) this.send(this.queue.snapshot().current);
    this.onChange();
  }
  cancel(id) {
    if (this.queue.snapshot().current?.id === id) {
      clearTimeout(this.openTimer);
      if (this.connected) this.client.send(JSON.stringify({ type: 'cancel', id }));
      this.queue.finish(id);
    } else this.queue.remove(id);
    this.pump(); this.onChange();
  }
  close() {
    clearTimeout(this.openTimer);
    if(this.pendingPair) {clearTimeout(this.pendingPair.timer);this.pendingPair=null;}
    return new Promise(resolve => {
      if (!this.server) return resolve();
      this.client = null;
      for (const client of this.server.clients) client.terminate();
      this.server.close(() => resolve());
    });
  }
}
module.exports = { BrowserBridge };
