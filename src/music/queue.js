class SongQueue {
  constructor({ rewardId = '', perUser = 3, limit = 30 } = {}) {
    this.rewardId = rewardId;
    this.perUser = perUser;
    this.limit = limit;
    this.pending = [];
    this.current = null;
    this.seen = new Set();
  }
  add(event) {
    if (!event?.id || event.reward?.id !== this.rewardId || this.seen.has(event.id)) return { accepted: false, ignored: true };
    const query = String(event.user_input || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (query.length < 2 || query.length > 160 || /https?:\/\//i.test(query)) return { accepted: false, error: 'Escribe el nombre de una canción y su artista (2 a 160 caracteres).' };
    const all = [...this.pending, ...(this.current ? [this.current] : [])];
    if (all.length >= this.limit) return { accepted: false, error: 'La cola está llena.' };
    if (all.filter(item => item.userId === event.user_id).length >= this.perUser) return { accepted: false, error: 'Este espectador ya tiene tres pedidos en la cola.' };
    const item = { id: event.id, query, userId: event.user_id, user: event.user_name || event.user_login || 'Espectador', status: 'pending' };
    this.pending.push(item);
    this.seen.add(item.id);
    if (this.seen.size > 2000) this.seen.delete(this.seen.values().next().value);
    return { accepted: true, item: { ...item } };
  }
  take() {
    if (this.current || !this.pending.length) return null;
    this.current = { ...this.pending.shift(), status: 'opening' };
    return { ...this.current };
  }
  confirm(id, title) {
    if (this.current?.id !== id || this.current.status !== 'opening') return false;
    Object.assign(this.current, { status: 'playing', title: String(title || this.current.query).slice(0, 200), error: '' });
    return true;
  }
  fail(id, error) {
    if (this.current?.id !== id) return false;
    Object.assign(this.current, { status: 'error', error: String(error).slice(0, 250) });
    return true;
  }
  retry() {
    if (this.current?.status !== 'error') return false;
    Object.assign(this.current, { status: 'opening', error: '' });
    return true;
  }
  finish(id) {
    if (this.current?.id !== id) return false;
    this.current = null;
    return true;
  }
  remove(id) {
    const index = this.pending.findIndex(item => item.id === id);
    if (index < 0) return false;
    this.pending.splice(index, 1);
    return true;
  }
  snapshot() {
    return { current: this.current ? { ...this.current } : null, pending: this.pending.map(item => ({ ...item })) };
  }
}
module.exports = { SongQueue };
