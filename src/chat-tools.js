(function (root) {
  const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  class ChatHistory {
    constructor(limit = 160) { this.limit = limit; this.seen = new Set(); }
    accept(data) {
      if (!data.messageId) return true;
      const key = `${data.platform}:${data.messageId}`;
      if (this.seen.has(key)) return false;
      this.seen.add(key);
      if (this.seen.size > 600) this.seen.delete(this.seen.values().next().value);
      return true;
    }
    matches(text, query, platform, selected) { return (selected === 'all' || platform === selected) && normalized(text).includes(normalized(query)); }
  }
  function create({ container, maxMessages = 160 }) {
    const history = new ChatHistory(maxMessages);
    let follow = true, pending = false;
    function scroll() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { if (follow) container.scrollTop = container.scrollHeight; pending = false; });
    }
    function append(node) {
      container.appendChild(node);
      while (container.children.length > maxMessages) container.firstElementChild.remove();
      if (follow) scroll();
    }
    container.addEventListener('scroll', () => { follow = container.scrollHeight - container.scrollTop - container.clientHeight < 90; }, { passive: true });
    return { append, scroll, history, target: container };
  }
  const api = { ChatHistory, create };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ChatTools = api;
})(typeof window !== 'undefined' ? window : globalThis);
