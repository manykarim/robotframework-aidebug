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
  return parts.join('    ');
}

function formatLegacyKeywordExpression(keyword, args = [], assign = []) {
  return `! ${formatKeywordExpression(keyword, args, assign)}`;
}

function escapeRobotInterpolation(text) {
  if (typeof text !== 'string' || !text.includes('${')) {
    return text;
  }
  let result = '';
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    const next = text[index + 1];
    const previous = index > 0 ? text[index - 1] : '';
    if (current === '$' && next === '{' && previous !== '\\') {
      result += '\\$';
      continue;
    }
    result += current;
  }
  return result;
}

function normalizeToolError(error, fallbackCode = 'RUNTIME_ERROR') {
  const message = error?.message || String(error);
  const normalized = new Error(message);
  if (/No keyword with name/i.test(message)) {
    normalized.code = 'KEYWORD_NOT_FOUND';
  } else if (/Timeout/i.test(message)) {
    normalized.code = 'SELECTOR_TIMEOUT';
  } else if (/Invalid regular expression flags/i.test(message)) {
    normalized.code = 'JS_EVAL_ERROR';
  } else if (/argument|selector|locator/i.test(message)) {
    normalized.code = 'ARGUMENT_SHAPE_ERROR';
  } else {
    normalized.code = error?.code || fallbackCode;
  }
  return normalized;
}

function validateKeywordInvocation(argumentsObject) {
  if (!argumentsObject.keyword || typeof argumentsObject.keyword !== 'string') {
    const error = new Error('execute_keyword requires a non-empty keyword string.');
    error.code = 'ARGUMENT_SHAPE_ERROR';
    throw error;
  }
  if (argumentsObject.assign && !Array.isArray(argumentsObject.assign)) {
    const error = new Error('execute_keyword assign must be an array of variable names.');
    error.code = 'ARGUMENT_SHAPE_ERROR';
    throw error;
  }
  if (argumentsObject.args && !Array.isArray(argumentsObject.args)) {
    const error = new Error('execute_keyword args must be an array of strings.');
    error.code = 'ARGUMENT_SHAPE_ERROR';
    throw error;
  }
}

function validatePageScriptInvocation(argumentsObject) {
  if (!argumentsObject.script || typeof argumentsObject.script !== 'string') {
    const error = new Error('execute_page_script requires a non-empty script string.');
    error.code = 'ARGUMENT_SHAPE_ERROR';
    throw error;
  }
  if (argumentsObject.selector !== undefined && typeof argumentsObject.selector !== 'string') {
    const error = new Error('execute_page_script selector must be a string.');
    error.code = 'ARGUMENT_SHAPE_ERROR';
    throw error;
  }
  if (argumentsObject.assign && !Array.isArray(argumentsObject.assign)) {
    const error = new Error('execute_page_script assign must be an array of variable names.');
    error.code = 'ARGUMENT_SHAPE_ERROR';
    throw error;
  }
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

  async getRuntimeContext(argumentsObject = {}) {
    await this.ensureStarted();
    return this.client.request('robot/getRuntimeContext', argumentsObject);
  }

  async executeKeyword(argumentsObject) {
    await this.ensureStarted();
    return this.client.request('robot/executeKeyword', argumentsObject);
  }

  async executePageScript(argumentsObject) {
    await this.ensureStarted();
    return this.client.request('robot/executePageScript', argumentsObject);
  }

  async executeSnippet(argumentsObject) {
    await this.ensureStarted();
    return this.client.request('robot/executeSnippet', argumentsObject);
  }

  async setVariable(argumentsObject) {
    await this.ensureStarted();
    let payload = { ...argumentsObject };
    if (!payload.variablesReference && payload.scope) {
      const state = await this.client.request('robot/getExecutionState', { includeStack: true, includeScopes: true });
      const target = (state.scopes || []).find(scope => scope.name.toLowerCase() === String(payload.scope).toLowerCase());
      if (!target) {
        throw new Error(`Unknown scope: ${payload.scope}`);
      }
      payload = { ...payload, variablesReference: target.variablesReference };
    }
    return this.client.request('setVariable', payload);
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
    const names = new Set((argumentsObject.names || []).map(name => String(name).toLowerCase()));
    const start = argumentsObject.start || 0;
    const limit = argumentsObject.max_items || argumentsObject.maxItems || 20;
    const variables = {};
    let truncated = false;
    let nextStart = null;
    for (const scope of state.scopes || []) {
      if (!scopes.includes(scope.name.toLowerCase())) {
        continue;
      }
      const data = await this.session.customRequest('variables', { variablesReference: scope.variablesReference });
      const entries = {};
      let list = data.variables || [];
      if (names.size) {
        list = list.filter(item => names.has(String(item.name).toLowerCase()));
      }
      list = list.slice(start);
      for (const [index, item] of list.entries()) {
        if (index >= limit) {
          truncated = true;
          nextStart = start + limit;
          break;
        }
        entries[item.name] = item.value;
      }
      variables[scope.name.toLowerCase()] = entries;
    }
    return { variables, truncated, nextStart };
  }

  async getRuntimeContext(argumentsObject = {}) {
    const structured = await tryRequest(this.session, 'robot/getRuntimeContext', argumentsObject);
    if (!structured.__transportError) {
      return structured;
    }
    const state = await this.getExecutionState({ includeStack: true, includeScopes: false, maxLogLines: 10 });
    const completions = await this.getRuntimeCompletions({ text: argumentsObject.text || '' });
    return {
      frameId: state.topFrame?.id || null,
      stoppedKeyword: state.currentItem?.name || state.topFrame?.name || 'unknown',
      namespaceSummary: {
        libraries: [],
        resources: [state.currentItem?.source || state.topFrame?.source || 'unknown'],
        variables: []
      },
      completions: completions.targets || [],
      truncated: false
    };
  }

  async executeKeyword(argumentsObject) {
    validateKeywordInvocation(argumentsObject);
    const structured = await tryRequest(this.session, 'robot/executeKeyword', argumentsObject);
    if (!structured.__transportError) {
      return structured;
    }
    let result;
    try {
      result = await this.session.customRequest('evaluate', {
        expression: formatKeywordExpression(argumentsObject.keyword, argumentsObject.args, argumentsObject.assign),
        context: 'repl',
        frameId: argumentsObject.frameId
      });
    } catch (plainError) {
      try {
        result = await this.session.customRequest('evaluate', {
          expression: formatLegacyKeywordExpression(argumentsObject.keyword, argumentsObject.args, argumentsObject.assign),
          context: 'repl',
          frameId: argumentsObject.frameId
        });
      } catch (legacyError) {
        throw normalizeToolError(plainError);
      }
    }
    const assigned = {};
    for (const name of argumentsObject.assign || []) {
      try {
        const value = await this.session.customRequest('evaluate', { expression: name, frameId: argumentsObject.frameId });
        assigned[name] = value.result;
      } catch (_error) {
        assigned[name] = '<unavailable>';
      }
    }
    return {
      status: 'PASS',
      returnValueRepr: result.result,
      assigned,
      executionPath: { mode: 'evaluate-repl', keyword: argumentsObject.keyword, syntax: 'plain-first' }
    };
  }

  async executePageScript(argumentsObject) {
    validatePageScriptInvocation(argumentsObject);
    const structured = await tryRequest(this.session, 'robot/executePageScript', argumentsObject);
    if (!structured.__transportError) {
      return structured;
    }

    const selector = argumentsObject.selector || 'body';
    const escapedScript = escapeRobotInterpolation(argumentsObject.script);
    const keywordCandidates = argumentsObject.keyword
      ? [argumentsObject.keyword]
      : ['Evaluate JavaScript', 'Browser.Evaluate JavaScript'];

    let firstPlainError = null;
    let lastPlainError = null;
    for (const keyword of keywordCandidates) {
      try {
        const result = await this.session.customRequest('evaluate', {
          expression: formatKeywordExpression(keyword, [selector, escapedScript], argumentsObject.assign || []),
          context: 'repl',
          frameId: argumentsObject.frameId
        });
        const assigned = {};
        for (const name of argumentsObject.assign || []) {
          try {
            const value = await this.session.customRequest('evaluate', { expression: name, frameId: argumentsObject.frameId });
            assigned[name] = value.result;
          } catch (_error) {
            assigned[name] = '<unavailable>';
          }
        }
        return {
          status: 'PASS',
          selector,
          returnValueRepr: result.result,
          assigned,
          executionPath: { mode: 'evaluate-repl', keyword, syntax: 'plain', escapedInterpolation: escapedScript !== argumentsObject.script }
        };
      } catch (plainError) {
        firstPlainError ||= plainError;
        lastPlainError = plainError;
        const normalized = normalizeToolError(plainError);
        if (normalized.code !== 'KEYWORD_NOT_FOUND') {
          throw normalized;
        }
      }
    }

    for (const keyword of keywordCandidates) {
      try {
        const result = await this.session.customRequest('evaluate', {
          expression: formatLegacyKeywordExpression(keyword, [selector, escapedScript], argumentsObject.assign || []),
          context: 'repl',
          frameId: argumentsObject.frameId
        });
        const assigned = {};
        for (const name of argumentsObject.assign || []) {
          try {
            const value = await this.session.customRequest('evaluate', { expression: name, frameId: argumentsObject.frameId });
            assigned[name] = value.result;
          } catch (_error) {
            assigned[name] = '<unavailable>';
          }
        }
        return {
          status: 'PASS',
          selector,
          returnValueRepr: result.result,
          assigned,
          executionPath: { mode: 'evaluate-repl', keyword, syntax: 'legacy', escapedInterpolation: escapedScript !== argumentsObject.script }
        };
      } catch (_legacyError) {
        // keep the original plain error as the user-visible failure
      }
    }

    throw normalizeToolError(firstPlainError || lastPlainError || new Error('Page script execution failed.'));
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
    let payload = { ...argumentsObject };
    if (!payload.variablesReference && payload.scope) {
      const state = await this.getExecutionState({ includeStack: true, includeScopes: true });
      const target = (state.scopes || []).find(scope => scope.name.toLowerCase() === String(payload.scope).toLowerCase());
      if (!target) {
        throw new Error(`Unknown scope: ${payload.scope}`);
      }
      payload = { ...payload, variablesReference: target.variablesReference };
    }
    return this.session.customRequest('setVariable', payload);
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
  escapeRobotInterpolation,
  formatKeywordExpression,
  formatLegacyKeywordExpression
};
