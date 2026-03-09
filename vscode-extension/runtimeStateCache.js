class RuntimeStateCache {
  constructor(output = { appendLine() {} }) {
    this.output = output;
    this.recentEvents = new Map();
    this.sessionState = new Map();
    this.stopReasons = new Map();
    this.sessionSources = new Map();
  }

  noteSessionStart(session) {
    this.sessionState.set(session.id, 'running');
  }

  noteSessionStop(session) {
    this.sessionState.set(session.id, 'stopped');
  }

  noteActiveSession(session) {
    if (!session) {
      return;
    }
    if (!this.sessionState.has(session.id)) {
      this.sessionState.set(session.id, 'running');
    }
  }

  async handleCustomEvent(event) {
    const sessionId = event.session.id;
    const list = this.recentEvents.get(sessionId) || [];
    list.push({ event: event.event, body: event.body || {}, ts: Date.now() / 1000 });
    if (list.length > 100) {
      list.shift();
    }
    this.recentEvents.set(sessionId, list);
    if (event.body?.source) {
      this.sessionSources.set(sessionId, event.body.source);
    }
    if (event.event === 'robotStarted' || event.event === 'stopped') {
      this.sessionState.set(sessionId, 'paused');
      if (event.body?.reason) {
        this.stopReasons.set(sessionId, event.body.reason);
      }
    }
    if (event.event === 'continued') {
      this.sessionState.set(sessionId, 'running');
      this.stopReasons.set(sessionId, 'continued');
    }
    if (event.body?.synced && typeof event.session.customRequest === 'function') {
      await event.session.customRequest('robot/sync', {});
    }
  }

  getRecentEvents(sessionId, limit = 20) {
    const list = this.recentEvents.get(sessionId) || [];
    return list.slice(-limit);
  }

  getSessionState(sessionId) {
    return this.sessionState.get(sessionId) || 'paused';
  }

  getStopReason(sessionId) {
    return this.stopReasons.get(sessionId) || 'paused';
  }

  getSessionSource(sessionId) {
    return this.sessionSources.get(sessionId) || 'tests/checkout.robot';
  }
}

module.exports = { RuntimeStateCache };
