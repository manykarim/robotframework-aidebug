const test = require('node:test');
const assert = require('node:assert/strict');

const { registerMcpServerDefinitionProvider } = require('../mcpProvider');

class EventEmitter {
  constructor() {
    this.event = () => {};
  }
  dispose() {}
}

class McpStdioServerDefinition {
  constructor(options) {
    Object.assign(this, options);
  }
}

class McpHttpServerDefinition {
  constructor(options) {
    Object.assign(this, options);
  }
}

const vscodeStub = {
  EventEmitter,
  McpStdioServerDefinition,
  McpHttpServerDefinition,
  Uri: {
    file(value) {
      return { fsPath: value };
    },
    parse(value) {
      return { value };
    }
  },
  window: {
    async showInputBox() {
      return 'entered-token';
    }
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/tmp/workspace' } }]
  },
  lm: {
    registerMcpServerDefinitionProvider(id, provider) {
      vscodeStub._registration = { id, provider };
      return { dispose() {} };
    }
  },
  _registration: null
};

test('mcp provider returns stdio definitions by default', async () => {
  const context = { subscriptions: [] };
  const output = { appendLine() {} };
  const registration = registerMcpServerDefinitionProvider(context, vscodeStub, {
    get(key, fallback) {
      if (key === 'mcpExecutable') return 'robotframework-aidebug-mcp';
      if (key === 'mcpArgs') return [];
      if (key === 'mcpTransport') return 'stdio';
      return fallback;
    }
  }, output);
  assert.equal(registration.registered, true);
  const definitions = await vscodeStub._registration.provider.provideMcpServerDefinitions();
  assert.equal(definitions[0].label, 'robotframework-aidebug-stdio');
  assert.equal(definitions[0].command, 'robotframework-aidebug-mcp');
});

test('mcp provider resolves HTTP auth token from configuration or prompt', async () => {
  const context = { subscriptions: [] };
  const output = { appendLine() {} };
  registerMcpServerDefinitionProvider(context, vscodeStub, {
    get(key, fallback) {
      if (key === 'mcpTransport') return 'streamable-http';
      if (key === 'mcpHttpBaseUrl') return 'http://127.0.0.1:8765/mcp';
      if (key === 'mcpHttpAuthToken') return '';
      return fallback;
    }
  }, output);
  const [definition] = await vscodeStub._registration.provider.provideMcpServerDefinitions();
  const resolved = await vscodeStub._registration.provider.resolveMcpServerDefinition(definition);
  assert.equal(resolved.headers.Authorization, 'Bearer entered-token');
});
