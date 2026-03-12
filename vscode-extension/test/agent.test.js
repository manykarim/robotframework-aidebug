const test = require('node:test');
const assert = require('node:assert/strict');

const { invokeToolEnvelope, prepareInvocation, shapePayload } = require('../chatAgents');
const { detectIntent, summarizeDiagnostic } = require('../chatParticipant');
const { registerLanguageModelTools } = require('../languageModelTools');

class MarkdownString {
  constructor(value) {
    this.value = value;
  }
}

class LanguageModelTextPart {
  constructor(value) {
    this.value = value;
  }
}

class LanguageModelToolResult {
  constructor(content) {
    this.content = content;
  }
}

const vscodeStub = {
  MarkdownString,
  LanguageModelTextPart,
  LanguageModelToolResult,
  lm: {
    registerTool(name, impl) {
      vscodeStub._tools.push({ name, impl });
      return { dispose() {} };
    }
  },
  _tools: []
};

test('invokeToolEnvelope shapes successful state responses', async () => {
  const transport = {
    async getExecutionState() {
      return { state: 'paused', recentEvents: Array.from({ length: 20 }, (_, index) => ({ event: String(index) })) };
    }
  };
  const envelope = await invokeToolEnvelope({ toolName: 'get_state', transport, input: {}, surface: 'lm_tool' });
  assert.equal(envelope.status, 'partial');
  assert.equal(envelope.tool, 'get_state');
  assert.equal(envelope.payload.recentEvents.length, 10);
});

test('invokeToolEnvelope maps policy errors to denied status', async () => {
  const transport = {
    async executeKeyword() {
      const error = new Error('requires pause');
      error.code = 'not_paused';
      throw error;
    }
  };
  const envelope = await invokeToolEnvelope({ toolName: 'execute_keyword', transport, input: { keyword: 'Log' }, surface: 'lm_tool' });
  assert.equal(envelope.status, 'denied');
  assert.equal(envelope.error.code, 'MUTATION_REQUIRES_PAUSED_SESSION');
});

test('prepareInvocation only customizes mutating tools', () => {
  assert.equal(prepareInvocation(vscodeStub, 'get_state', {}), undefined);
  const prepared = prepareInvocation(vscodeStub, 'set_variable', { name: '${status}', scope: 'test' });
  assert.equal(prepared.confirmationMessages.title, 'Robot Framework AI Debug');
  assert.match(prepared.confirmationMessages.message.value, /\$\{status\}/);
});

test('shapePayload caps variable snapshots by scope', () => {
  const payload = {
    variables: {
      local: Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`v${index}`, index]))
    },
    truncated: false
  };
  const shaped = shapePayload('get_variables_snapshot', payload);
  assert.equal(Object.keys(shaped.payload.variables.local).length, 10);
  assert.equal(shaped.truncated, true);
});

test('invokeToolEnvelope forwards paging and exact-name filters for variable snapshots', async () => {
  let received;
  const transport = {
    async getVariablesSnapshot(payload) {
      received = payload;
      return { variables: { local: { '${page_source}': "'<html>'" } }, truncated: false };
    }
  };
  const envelope = await invokeToolEnvelope({
    toolName: 'get_variables_snapshot',
    transport,
    input: { scopes: ['local'], max_items: 5, start: 10, names: ['${page_source}'] },
    surface: 'lm_tool'
  });
  assert.equal(envelope.status, 'success');
  assert.deepEqual(received, { scopes: ['local'], max_items: 5, start: 10, names: ['${page_source}'] });
});

test('languageModelTools register all canonical tools', async () => {
  vscodeStub._tools = [];
  const context = { subscriptions: [] };
  const registration = registerLanguageModelTools(context, vscodeStub, {
    async resolveTransport() {
      return {
        async getExecutionState() {
          return { state: 'paused', recentEvents: [] };
        },
        async getVariablesSnapshot() {
          return { variables: { local: {} }, truncated: false };
        },
        async getRuntimeContext() {
          return { completions: [], truncated: false };
        },
        async probeCapabilities() {
          return { capabilities: { canReadState: true } };
        },
        async getAuditLog() {
          return { entries: [] };
        },
        async control() {
          return { state: 'running' };
        },
        async executeKeyword() {
          return { status: 'PASS' };
        },
        async executePageScript() {
          return { status: 'PASS' };
        },
        async executeSnippet() {
          return { status: 'OK' };
        },
        async setVariable() {
          return { name: '${status}', value: "'OK'" };
        }
      };
    }
  });
  assert.equal(registration.registered, true);
  assert.equal(vscodeStub._tools.length, 10);
  const result = await vscodeStub._tools[0].impl.invoke({ input: {} });
  assert.equal(result.content[0].value.includes('get_state'), true);
});

test('invokeToolEnvelope routes execute_page_script through the transport', async () => {
  let received;
  const transport = {
    async executePageScript(payload) {
      received = payload;
      return { status: 'PASS', selector: 'body', returnValueRepr: "'ok'" };
    }
  };
  const envelope = await invokeToolEnvelope({
    toolName: 'execute_page_script',
    transport,
    input: { script: 'return 1;', selector: 'body', assign: ['${result}'] },
    surface: 'lm_tool'
  });
  assert.equal(envelope.status, 'success');
  assert.deepEqual(received, {
    script: 'return 1;',
    selector: 'body',
    assign: ['${result}'],
    keyword: undefined,
    frameId: undefined,
    timeoutMs: undefined
  });
});

test('chat participant intent detection prefers command mapping and diagnostic fallback', () => {
  assert.deepEqual(detectIntent({ command: '/variables', prompt: '' }), { flow: 'single', toolName: 'get_variables_snapshot' });
  assert.deepEqual(detectIntent({ command: '', prompt: 'Please inspect variables' }), { flow: 'single', toolName: 'get_variables_snapshot' });
  assert.deepEqual(detectIntent({ command: '', prompt: 'Help me debug this failure' }), { flow: 'diagnose' });
});

test('summarizeDiagnostic highlights the first failure when present', () => {
  const summary = summarizeDiagnostic([
    { status: 'success', tool: 'get_state' },
    { status: 'failure', tool: 'get_runtime_context', error: { message: 'context missing' } }
  ]);
  assert.match(summary, /get_runtime_context/);
});
