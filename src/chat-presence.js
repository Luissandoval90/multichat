// Keep bursts of arrivals readable in both the desktop overlay and OBS.
window.ChatPresence = {
  renderJoin(data, container, platformTag, append) {
    data = { ...data, platform: window.SafeContent.platform(data.platform) };
    const now = Date.now();
    const previous = container.lastElementChild;
    const canGroup = previous?.classList.contains('join') &&
      previous.dataset.platform === data.platform &&
      now - Number(previous.dataset.startedAt) < 15000;
    const row = canGroup ? previous : document.createElement('div');
    if (!canGroup) {
      row.className = `msg join platform-${data.platform}`;
      row.dataset.platform = data.platform;
      row.dataset.startedAt = String(now);
      row.dataset.count = '0';
      row.arrivalNames = [];
      row.innerHTML = `<span class="body">${platformTag(data.platform)}<span class="join-text"></span></span>`;
    }
    const count = Number(row.dataset.count) + 1;
    row.dataset.count = String(count);
    const name = data.nickname || data.userId || 'Un espectador';
    if (row.arrivalNames.length < 6) row.arrivalNames.push(name);
    row.querySelector('.join-text').textContent = count === 1 ? `${name} se unió` : `${count} personas se unieron`;
    const more = count - row.arrivalNames.length;
    row.title = row.arrivalNames.join(', ') + (more ? ` y ${more} más` : '');
    if (!canGroup) append(row);
  },
};
