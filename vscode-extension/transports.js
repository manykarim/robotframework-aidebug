function quoteRobotArgument(value) {
  if (typeof value !== 'string') {
    return String(value);
  }
  return value;
}

function formatKeywordExpression(keyword, args = [], assign = []) {
  const parts = [];
  if (assign.length) {
    parts.push(`${assign.join('    ')}=`);
  }
  parts.push(keyword, ...args.map(quoteRobotArgument));
  return `! ${parts.join('    ')}`;
}

async function tryRequest(session, command, argumentsObject = {}) {
  try {
    return await session.customRequest(command, argumentsObject);
  } catch (error) {
    return { __transportError: error };
  }
}

class BackendTransport {
  constructor(client, output, autoStart = true) {
    this.client = client;
    this.output = output;
    this.autoStart = autoStart;
    this.kind = 'backend';
    this.sessionType = 'backend';
  }

  async ensureStarted() {
    if (!this.client.process) {
      if (!this.autoStart) {
        throw new Error('Backend fallback transport is not running and autoStartBackend is disabled.');
      }
      await this.client.start();
    }
  }

  async probeCapabilities() {
    await this.ensureStarted();
    return this.client.request('robot/probeCapabilities');
  }

  async getExecutionState(argumentsObject = {}) {
    await this.ensureStarted();
    return this.client.request('robot/getExecutionState', argumentsObject);
  }

  async getVariablesSnapshot(argumentsObject = {}) {
    await this.ensureStarted();
    return this.client.request('robot/getVariablesSnapshot', argumentsObject);
  }

  async executeKeyword(argumentsObject) {
    await this.ensureStarted();
    return this.client.request('robot/executeKeyword', argumentsObject);
  }

  async executeSnippet(argumentsObject) {
    await this.ensureStarted();
    return this.client.request('robot/executeSnippet', argumentsObject);
  }

  async setVariable(argumentsObject) {
    await this.ensureStarted();
    return this.client.request('setVariable', argumentsObject);
  }

  async evaluate(argumentsObject) {
    await this.ensureStarted();
    return this.client.request('evaluate', argumentsObject);
  }

  async control(command, argumentsObject = {}) {
    await this.ensureStarted();
    return this.client.request(command, argumentsObject);
  }

  async getRuntimeCompletions(argumentsObject = {}) {
    await this.ensureStarted();
    return this.client.request('completions', argumentsObject);
  }

  async getAuditLog(limit = 20) {
    await this.ensureStarted();
    return this.client.request('robot/getAuditLog', { limit });
  }
}

class DebugSessionTransport {
  constructor(session, cache, output) {
    this.session = session;
    this.cache = cache;
    this.output = output;
    this.kind = session.type === 'robotcode' ? 'bridge' : 'debugSession';
    this.sessionType = session.type;
  }

  async probeCapabilities() {
    const structured = await tryRequest(this.session, 'robot/probeCapabilities');
    if (!structured.__transportError) {
      return structured;
    }
    return {
      sessionTitle: this.session.name,
      source: this.cache.getSessionSource(this.session.id),
      state: this.cache.getSessionState(this.session.id),
      mode: 'fullControl',
      workspaceTrusted: true,
      enabled: true,
      capabilities: {
        canReadState: true,
        canReadVariables: true,
        canSetVariables: true,
        canEvaluate: true,
        canExecuteKeyword: true,
        canExecuteSnippet: true,
        canControlExecution: true,
        canCompleteRuntime: true,
        supportsStructuredRequests: false,
        requiresRobotSyncAck: this.session.type === 'robotcode'
      }
    };
  }

  async _threadId() {
    const threads = await this.session.customRequest('threads', {});
    return threads.threads?.[0]?.id ?? 1;
  }

  async getExecutionState(argumentsObject = {}) {
    const structured = await tryRequest(this.session, 'robot/getExecutionState', argumentsObject);
    if (!structured.__transportError) {
      return structured;
    }
    const threadId = await this._threadId();
    const stack = await this.session.customRequest('stackTrace', { threadId });
    const topFrame = stack.stackFrames?.[0] ?? null;
    const response = {
      state: topFrame ? 'paused' : this.cache.getSessionState(this.session.id),
      threadId,
      stopReason: this.cache.getStopReason(this.session.id),
      currentItem: topFrame
        ? {
            type: 'frame',
            id: String(topFrame.id),
            name: topFrame.name,
            source: topFrame.source?.path || topFrame.source?.name || 'unknown',
            lineno: topFrame.line || 1
          }
        : null,
      recentEvents: this.cache.getRecentEvents(this.session.id, argumentsObject.maxLogLines || 20)
    };
    if (topFrame && argumentsObject.includeStack !== false) {
      response.topFrame = {
        id: topFrame.id,
        name: topFrame.name,
        source: topFrame.source?.path || topFrame.source?.name || 'unknown',
        line: topFrame.line || 1,
        column: topFrame.column || 1
      };
    }
    if (topFrame && argumentsObject.includeScopes) {
      response.scopes = (await this.session.customRequest('scopes', { frameId: topFrame.id })).scopes || [];
    }
    return response;
  }

  async getVariablesSnapshot(argumentsObject = {}) {
    const structured = await tryRequest(this.session, 'robot/getVariablesSnapshot', argumentsObject);
    if (!structured.__transportError) {
      return structured;
    }
    const state = await this.getExecutionState({ includeStack: true, includeScopes: true });
    const scopes = (argumentsObject.scopes || ['Local', 'Test', 'Suite', 'Global']).map(scope => scope.toLowerCase());
    const limit = argumentsObject.max_items || argumentsObject.maxItems || 20;
    const variables = {};
    let truncated = false;
    for (const scope of state.scopes || []) {
      if (!scopes.includes(scope.name.toLowerCase())) {
        continue;
      }
      const data = await this.session.customRequest('variables', { variablesReference: scope.variablesReference });
      const entries = {};
      const list = data.variables || [];
      for (const [index, item] of list.entries()) {
        if (index >= limit) {
          truncated = true;
          break;
        }
        entries[item.name] = item.value;
      }
      variables[scope.name.toLowerCase()] = entries;
    }
    return { variables, truncated };
  }

  async executeKeyword(argumentsObject) {
    const structured = await tryRequest(this.session, 'robot/executeKeyword', argumentsObject);
    if (!structured.__transportError) {
      return structured;
    }
    const expression = formatKeywordExpression(argumentsObject.keyword, argumentsObject.args, argumentsObject.assign);
    const result = await this.session.customRequest('evaluate', {
      expression,
      context: 'repl',
      frameId: argumentsObject.frameId
    });
    return {
      status: 'PASS',
      returnValueRepr: result.result,
      assigned: {}
    };
  }

  async executeSnippet(argumentsObject) {
    const structured = await tryRequest(this.session, 'robot/executeSnippet', argumentsObject);
    if (!structured.__transportError) {
      return structured;
    }
    const result = await this.session.customRequest('evaluate', {
      expression: argumentsObject.snippet,
      context: 'repl',
      frameId: argumentsObject.frameId
    });
    return {
      status: 'OK',
      resultRepr: result.result
    };
  }

  async setVariable(argumentsObject) {
    return this.session.customRequest('setVariable', argumentsObject);
  }

  async evaluate(argumentsObject) {
    return this.session.customRequest('evaluate', argumentsObject);
  }

  async control(command, argumentsObject = {}) {
    const threadId = argumentsObject.threadId || (await this._threadId());
    return this.session.customRequest(command, { ...argumentsObject, threadId });
  }

  async getRuntimeCompletions(argumentsObject = {}) {
    const response = await tryRequest(this.session, 'completions', argumentsObject);
    if (!response.__transportError) {
      return response;
    }
    return { targets: [] };
  }

  async getAuditLog(limit = 20) {
    const response = await tryRequest(this.session, 'robot/getAuditLog', { limit });
    if (!response.__transportError) {
      return response;
    }
    return { entries: [] };
  }
}

module.exports = {
  BackendTransport,
  DebugSessionTransport,
  formatKeywordExpression
};
