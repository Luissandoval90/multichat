(function (root) {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  function mediaUrl(value) {
    if (typeof value !== 'string' || value.length > 4096 || /[\s<>"'\u0000-\u001f]/.test(value)) return '';
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
  }
  const api = {
    escape, mediaUrl,
    platform: value => ['tiktok', 'twitch', 'kick', 'youtube'].includes(value) ? value : 'unknown',
    color: value => typeof value === 'string' && /^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(value) ? value : '',
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.SafeContent = api;
})(typeof window !== 'undefined' ? window : globalThis);
