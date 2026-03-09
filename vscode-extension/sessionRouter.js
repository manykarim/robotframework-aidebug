const { AgentDebugError } = require('./shared');
const { BackendTransport, DebugSessionTransport } = require('./transports');

function isSupportedDebugType(type) {
  return type === 'robotcode' || type === 'robotframework-aidebug';
}

class SessionRouter {
  constructor({ debugHost, backendFactory, cache, output, configuration }) {
    this.debugHost = debugHost;
    this.backendFactory = backendFactory;
    this.cache = cache;
    this.output = output;
    this.configuration = configuration;
  }

  async resolveTransport() {
    const preferred = this.configuration.get('preferredTransport', 'auto');
    const active = this.debugHost.activeDebugSession;
    if (preferred !== 'backend' && active && isSupportedDebugType(active.type)) {
      return new DebugSessionTransport(active, this.cache, this.output);
    }
    if (preferred === 'debugSession') {
      throw new AgentDebugError('no_session', 'No supported active debug session is available.');
    }
    const client = this.backendFactory();
    return new BackendTransport(client, this.output, this.configuration.get('autoStartBackend', true));
  }
}

module.exports = { SessionRouter, isSupportedDebugType };
