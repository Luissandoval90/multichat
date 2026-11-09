function isTrustedSender(event, window, url) {
  return Boolean(window && !window.isDestroyed() && event.sender?.id === window.webContents.id && event.senderFrame?.url === url && !event.senderFrame.parent);
}
module.exports = { isTrustedSender };
