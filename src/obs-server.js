const fs = require('node:fs/promises');
const path = require('node:path');
const PUBLIC_ASSETS = new Set([
  '/obs.html', '/multichat.png', '/styles/style.css', '/styles/chat.css', '/styles/alerts.css',
  '/src/audio.js', '/src/alerts.js', '/src/chat-presence.js', '/src/safe-content.js', '/src/chat-presentation.js', '/src/obs.js',
  '/assets/badges/twitch-owner.png', '/assets/badges/twitch-moderator.png', '/assets/badges/twitch-vip.png',
]);
function allowObsClient(headers, port) {
  const hosts = [`localhost:${port}`, `127.0.0.1:${port}`];
  return hosts.includes(headers.host?.toLowerCase()) && (!headers.origin || hosts.some(host => headers.origin === `http://${host}`));
}
function createObsHandler(root, port) {
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (!allowObsClient(req.headers, port) || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(403); res.end(); return; }
    try {
      let pathname = decodeURIComponent(String(req.url || '/').split('?')[0]);
      if (['/', '/obs', '/index.html'].includes(pathname)) pathname = '/obs.html';
      if (!PUBLIC_ASSETS.has(pathname)) { res.writeHead(403); res.end(); return; }
      const data = await fs.readFile(path.join(root, pathname));
      const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png' };
      res.writeHead(200, { 'Content-Type': mime[path.extname(pathname)], 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end(); }
  };
}
module.exports = { createObsHandler, allowObsClient };
