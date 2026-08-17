// Gestor de alertas visuales de nuevos seguidores con cola y sonidos.

const alertQueue = [];
let isShowingAlert = false;
let alertsEnabled = true;

function setFollowAlertsEnabled(enabled) {
  alertsEnabled = !!enabled;
}

function triggerFollowAlert(data) {
  if (!alertsEnabled) return;
  alertQueue.push(data);
  processQueue();
}

function processQueue() {
  if (isShowingAlert || alertQueue.length === 0) return;
  isShowingAlert = true;

  const data = alertQueue.shift();
  const container = document.getElementById('follower-alert-container');
  if (!container) {
    isShowingAlert = false;
    return;
  }

  // Reproducir sonido de alerta
  if (window.AudioAlerts && typeof window.AudioAlerts.playFollowSound === 'function') {
    window.AudioAlerts.playFollowSound();
  }

  const card = document.createElement('div');
  card.className = `follower-card platform-${data.platform || 'general'}`;

  // Avatar
  let avatarHtml;
  if (data.avatarUrl) {
    avatarHtml = `<img src="${data.avatarUrl}" alt="${data.nickname || 'Avatar'}" />`;
  } else {
    const initial = (data.nickname || data.userId || '★').charAt(0).toUpperCase();
    avatarHtml = `<div class="avatar-fallback" style="background:var(--${data.platform || 'accent'},#888)">${initial}</div>`;
  }

  const platformLabel = (data.platform || 'Live').toUpperCase();

  card.innerHTML = `
    <div class="follower-avatar-wrapper">
      ${avatarHtml}
    </div>
    <div class="follower-info">
      <div class="follower-badge-row">
        <span class="follower-label">★ ¡NUEVO SEGUIDOR EN ${platformLabel}!</span>
      </div>
      <div class="follower-name">${escapeHtml(data.nickname || data.userId || 'Usuario')}</div>
    </div>
    <div class="follower-timer-bar"></div>
  `;

  container.appendChild(card);

  // Duración de la alerta: 5 segundos
  setTimeout(() => {
    card.classList.add('alert-out');
    setTimeout(() => {
      if (card.parentNode) {
        card.parentNode.removeChild(card);
      }
      isShowingAlert = false;
      // Procesar siguiente alerta en la cola
      setTimeout(processQueue, 300);
    }, 400);
  }, 5000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

window.FollowAlerts = {
  triggerFollowAlert,
  setFollowAlertsEnabled,
};
