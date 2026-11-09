class CapturePolicy {
  constructor() { this.enabled = true; this.rendererActive = false; this.busy = false; }
  get shouldCapture() { return this.enabled && !this.rendererActive && !this.busy; }
}
module.exports = { CapturePolicy };
