const crypto = require('node:crypto');

const TOOL_DEFINITIONS = [
  { name: 'get_state', kind: 'inspection', confirmation: false },
  { name: 'get_variables_snapshot', kind: 'inspection', confirmation: false },
  { name: 'get_runtime_context', kind: 'inspection', confirmation: false },
  { name: 'get_capabilities', kind: 'inspection', confirmation: false },
  { name: 'get_audit_log', kind: 'inspection', confirmation: false },
  { name: 'control_execution', kind: 'control', confirmation: true },
  { name: 'execute_keyword', kind: 'execution', confirmation: true },
  { name: 'execute_page_script', kind: 'execution', confirmation: true },
  { name: 'execute_snippet', kind: 'execution', confirmation: true },
  { name: 'set_variable', kind: 'mutation', confirmation: true }
];

const TOOL_BUDGETS = {
  get_state: 400,
  get_variables_snapshot: 800,
  get_runtime_context: 1600,
  get_capabilities: 400,
  get_audit_log: 800,
  control_execution: 400,
  execute_keyword: 800,
  execute_page_script: 1200,
  execute_snippet: 1600,
  set_variable: 400
};

function toolByName(name) {
  return TOOL_DEFINITIONS.find(tool => tool.name === name);
}

function newCorrelationId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return crypto.randomBytes(16).toString('hex');
}

function estimateTokens(payload) {
  return Math.max(1, Math.floor(JSON.stringify(payload).length / 4));
}

function containsRedaction(payload) {
  if (Array.isArray(payload)) {
    return payload.some(containsRedaction);
  }
  if (payload && typeof payload === 'object') {
    return Object.values(payload).some(containsRedaction);
  }
  return payload === '<redacted>';
}

function cloneJson(payload) {
  return JSON.parse(JSON.stringify(payload));
}

function capObjectEntries(object, limit) {
  const entries = Object.entries(object);
  if (entries.length <= limit) {
    return { value: object, truncated: false };
  }
  return {
    value: Object.fromEntries(entries.slice(0, limit)),
    truncated: true
  };
}

function shapePayload(toolName, payload) {
  const hardBudget = TOOL_BUDGETS[toolName] || 800;
  if (!payload || typeof payload !== 'object') {
    return { payload, truncated: false };
  }
  let shaped = cloneJson(payload);
  let truncated = Boolean(shaped.truncated);
  if (toolName === 'get_state') {
    if (Array.isArray(shaped.recentEvents) && shaped.recentEvents.length > 10) {
      shaped.recentEvents = shaped.recentEvents.slice(0, 10);
      truncated = true;
    }
    if (Array.isArray(shaped.scopes) && shaped.scopes.length > 4) {
      shaped.scopes = shaped.scopes.slice(0, 4);
      truncated = true;
    }
  }
  if (toolName === 'get_variables_snapshot' && shaped.variables && typeof shaped.variables === 'object') {
    const bounded = {};
    for (const [scope, values] of Object.entries(shaped.variables)) {
      if (values && typeof values === 'object' && !Array.isArray(values)) {
        const result = capObjectEntries(values, 10);
        bounded[scope] = result.value;
        truncated = truncated || result.truncated;
      } else {
        bounded[scope] = values;
      }
    }
    shaped.variables = bounded;
  }
  if (toolName === 'get_runtime_context') {
    if (Array.isArray(shaped.completions) && shaped.completions.length > 15) {
      shaped.completions = shaped.completions.slice(0, 15);
      truncated = true;
    }
    if (shaped.namespaceSummary && typeof shaped.namespaceSummary === 'object') {
      for (const key of ['libraries', 'resources', 'variables']) {
        if (Array.isArray(shaped.namespaceSummary[key]) && shaped.namespaceSummary[key].length > 15) {
          shaped.namespaceSummary[key] = shaped.namespaceSummary[key].slice(0, 15);
          truncated = true;
        }
      }
    }
  }
  if (toolName === 'get_audit_log' && Array.isArray(shaped.entries) && shaped.entries.length > 10) {
    shaped.entries = shaped.entries.slice(0, 10);
    truncated = true;
  }
  if (toolName === 'execute_keyword' && typeof shaped.returnValueRepr === 'string' && shaped.returnValueRepr.length > 800) {
    shaped.returnValueRepr = `${shaped.returnValueRepr.slice(0, 797)}...`;
    truncated = true;
  }
  if (toolName === 'execute_page_script' && typeof shaped.returnValueRepr === 'string' && shaped.returnValueRepr.length > 1200) {
    shaped.returnValueRepr = `${shaped.returnValueRepr.slice(0, 1197)}...`;
    truncated = true;
  }
  if (toolName === 'execute_snippet' && typeof shaped.resultRepr === 'string' && shaped.resultRepr.length > 1200) {
    shaped.resultRepr = `${shaped.resultRepr.slice(0, 1197)}...`;
    truncated = true;
  }
  if (estimateTokens(shaped) > hardBudget) {
    if (Array.isArray(shaped.completions) && shaped.completions.length > 5) {
      shaped.completions = shaped.completions.slice(0, 5);
      truncated = true;
    }
    if (Array.isArray(shaped.entries) && shaped.entries.length > 5) {
      shaped.entries = shaped.entries.slice(0, 5);
      truncated = true;
    }
  }
  shaped.truncated = truncated;
  return { payload: shaped, truncated };
}

function mapError(error) {
  const code = error && error.code;
  switch (code) {
    case 'disabled':
    case 'read_only':
      return { status: 'denied', code: 'POLICY_MODE_DENIED', message: error.message, retryable: false };
    case 'untrusted_workspace':
      return { status: 'denied', code: 'WORKSPACE_TRUST_REQUIRED', message: error.message, retryable: true };
    case 'not_paused':
      return { status: 'denied', code: 'MUTATION_REQUIRES_PAUSED_SESSION', message: error.message, retryable: true };
    case 'no_session':
      return { status: 'failure', code: 'SESSION_NOT_FOUND', message: error.message, retryable: true };
    case 'rate_limit':
      return { status: 'failure', code: 'QUEUE_REJECTED', message: error.message, retryable: true };
    case 'KEYWORD_NOT_FOUND':
      return { status: 'failure', code: 'KEYWORD_NOT_FOUND', message: error.message, retryable: false };
    case 'ARGUMENT_SHAPE_ERROR':
      return { status: 'failure', code: 'ARGUMENT_SHAPE_ERROR', message: error.message, retryable: true };
    case 'SELECTOR_TIMEOUT':
      return { status: 'failure', code: 'SELECTOR_TIMEOUT', message: error.message, retryable: true };
    case 'JS_EVAL_ERROR':
      return { status: 'failure', code: 'JS_EVAL_ERROR', message: error.message, retryable: true };
    default:
      return { status: 'failure', code: code ? String(code).toUpperCase() : 'INTERNAL_ERROR', message: error?.message || 'Tool invocation failed.', retryable: false };
  }
}

function makeEnvelope({ status, tool, payload, error, correlationId, truncated = false, redacted = false, durationMs = 0, surface = 'lm_tool' }) {
  const envelope = {
    status,
    tool,
    correlation_id: correlationId,
    contract_version: '1.0.0',
    session_id: 'active-session',
    truncated,
    redacted,
    duration_ms: Math.round(durationMs * 1000) / 1000,
    surface
  };
  if (status === 'success' || status === 'partial') {
    envelope.payload = payload;
    if (status === 'partial') {
      envelope.continuation = {
        reason: 'item_cap',
        next_hint: 'Request a narrower scope, fewer items, or a targeted follow-up call.'
      };
    }
  }
  if (error) {
    envelope.error = error;
  }
  return envelope;
}

async function callTransport(transport, toolName, input) {
  switch (toolName) {
    case 'get_state':
      return transport.getExecutionState({
        includeStack: input.include_stack !== false,
        includeScopes: Boolean(input.include_scopes),
        maxLogLines: input.max_log_lines || 20
      });
    case 'get_variables_snapshot':
      return transport.getVariablesSnapshot({
        scopes: input.scopes || ['local', 'test', 'suite', 'global'],
        max_items: input.max_items || 20,
        start: input.start || 0,
        names: input.names || []
      });
    case 'get_runtime_context':
      if (typeof transport.getRuntimeContext === 'function') {
        return transport.getRuntimeContext({
          text: input.text || '',
          includeCompletions: input.include_completions !== false,
          includeNamespaceSummary: input.include_namespace_summary !== false,
          maxItems: input.max_items || 25
        });
      }
      return transport.getRuntimeCompletions({ text: input.text || '' });
    case 'get_capabilities':
      return transport.probeCapabilities();
    case 'get_audit_log':
      return transport.getAuditLog(input.limit || 20);
    case 'control_execution':
      return transport.control(input.action || 'pause', { threadId: input.thread_id });
    case 'execute_keyword':
      return transport.executeKeyword({
        keyword: input.keyword,
        args: input.args || [],
        assign: input.assign || [],
        frameId: input.frame_id,
        timeoutMs: input.timeout_ms
      });
    case 'execute_page_script':
      return transport.executePageScript({
        script: input.script,
        selector: input.selector || 'body',
        assign: input.assign || [],
        keyword: input.keyword,
        frameId: input.frame_id,
        timeoutMs: input.timeout_ms
      });
    case 'execute_snippet':
      return transport.executeSnippet({
        snippet: input.snippet,
        frameId: input.frame_id,
        timeoutMs: input.timeout_ms,
        purpose: input.purpose || ''
      });
    case 'set_variable':
      return transport.setVariable({
        variablesReference: input.variables_reference,
        name: input.name,
        value: input.value,
        scope: input.scope,
        frameId: input.frame_id
      });
    default:
      throw new Error(`Unsupported tool: ${toolName}`);
  }
}

async function invokeToolEnvelope({ toolName, input = {}, transport, surface = 'lm_tool' }) {
  const correlationId = newCorrelationId();
  const started = Date.now();
  try {
    const payload = await callTransport(transport, toolName, input);
    const shaped = shapePayload(toolName, payload);
    const redacted = containsRedaction(shaped.payload);
    return makeEnvelope({
      status: shaped.truncated ? 'partial' : 'success',
      tool: toolName,
      payload: shaped.payload,
      correlationId,
      truncated: shaped.truncated,
      redacted,
      durationMs: Date.now() - started,
      surface
    });
  } catch (error) {
    const mapped = mapError(error);
    return makeEnvelope({
      status: mapped.status,
      tool: toolName,
      error: {
        code: mapped.code,
        message: mapped.message,
        retryable: mapped.retryable
      },
      correlationId,
      durationMs: Date.now() - started,
      surface
    });
  }
}

function prepareInvocation(vscodeApi, toolName, input = {}) {
  const tool = toolByName(toolName);
  if (!tool || !tool.confirmation) {
    return undefined;
  }
  const summary = {
    control_execution: `Control debugger execution with action '${input.action || 'pause'}'.`,
    execute_keyword: `Execute keyword '${input.keyword || 'unknown'}' with ${(input.args || []).length} argument(s).`,
    execute_page_script: `Execute page-scoped JavaScript against selector '${input.selector || 'body'}'.`,
    execute_snippet: 'Execute a Robot Framework snippet in the paused runtime.',
    set_variable: `Set variable ${input.name || '${variable}'} in ${input.scope || 'local'} scope.`
  }[toolName] || `Run ${toolName}.`;
  return {
    invocationMessage: summary,
    confirmationMessages: {
      title: 'Robot Framework AI Debug',
      message: new vscodeApi.MarkdownString(summary)
    }
  };
}

function createToolResult(vscodeApi, envelope) {
  const text = JSON.stringify(envelope);
  if (typeof vscodeApi.LanguageModelToolResult === 'function' && typeof vscodeApi.LanguageModelTextPart === 'function') {
    return new vscodeApi.LanguageModelToolResult([new vscodeApi.LanguageModelTextPart(text)]);
  }
  return { content: [{ value: text }] };
}

function summarizeEnvelope(envelope) {
  if (envelope.status === 'success' || envelope.status === 'partial') {
    return `Tool ${envelope.tool} ${envelope.status}.`;
  }
  return `Tool ${envelope.tool} ${envelope.status}: ${envelope.error?.message || 'unknown error'}`;
}

module.exports = {
  TOOL_DEFINITIONS,
  createToolResult,
  estimateTokens,
  invokeToolEnvelope,
  mapError,
  newCorrelationId,
  prepareInvocation,
  shapePayload,
  summarizeEnvelope,
  toolByName
};
