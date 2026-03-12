const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionRouter } = require('../sessionRouter');
const { RuntimeStateCache } = require('../runtimeStateCache');
const { extractStaticContext } = require('../staticContext');
const { DebugSessionTransport, escapeRobotInterpolation, formatKeywordExpression, formatLegacyKeywordExpression } = require('../transports');

class FakeSession {
  constructor(type = 'robotcode') {
    this.type = type;
    this.id = `${type}-1`;
    this.name = `${type}-session`;
    this.syncCount = 0;
  }

  async customRequest(command) {
    if (command === 'robot/sync') {
      this.syncCount += 1;
      return { ok: true };
    }
    if (command === 'threads') {
      return { threads: [{ id: 1, name: 'RobotMain' }] };
    }
    if (command === 'stackTrace') {
      return { stackFrames: [{ id: 7, name: 'Verify totals', source: { path: 'demo.robot' }, line: 28, column: 1 }] };
    }
    if (command === 'scopes') {
      return { scopes: [{ name: 'Local', variablesReference: 10 }] };
    }
    if (command === 'variables') {
      return { variables: [{ name: '${status}', value: "'FAILED'", variablesReference: 0 }] };
    }
    if (command === 'evaluate') {
      return { result: "'ok'" };
    }
    if (command === 'completions') {
      return { targets: [{ label: 'Log', type: 'function', text: 'Log' }] };
    }
    throw new Error(`unsupported command: ${command}`);
  }
}

test('session router prefers active debug sessions in auto mode', async () => {
  const session = new FakeSession('robotcode');
  const router = new SessionRouter({
    debugHost: { activeDebugSession: session },
    backendFactory: () => {
      throw new Error('backend should not be used');
    },
    cache: new RuntimeStateCache(),
    output: { appendLine() {} },
    configuration: { get(key, fallback) { return key === 'preferredTransport' ? 'auto' : fallback; } }
  });
  const transport = await router.resolveTransport();
  assert.equal(transport.kind, 'bridge');
});

test('runtime state cache acknowledges synced events', async () => {
  const cache = new RuntimeStateCache();
  const session = new FakeSession();
  await cache.handleCustomEvent({ session, event: 'robotLog', body: { synced: true, message: 'hello' } });
  assert.equal(session.syncCount, 1);
  assert.equal(cache.getRecentEvents(session.id, 5).length, 1);
});

test('static context extractor finds variables and keywords', () => {
  const context = extractStaticContext('*** Test Cases ***\nDemo\n    ${status}=    Set Variable    FAILED\n    Log    hello    world\n');
  assert.deepEqual(context.variables, ['${status}']);
  assert.ok(context.keywords.includes('Log'));
});

test('keyword expression formatter builds plain Robot repl syntax and exposes a legacy fallback', () => {
  assert.equal(formatKeywordExpression('Log Variables', [], []), 'Log Variables');
  assert.equal(formatKeywordExpression('Set Variable', ['1'], ['${value}']), '${value}=    Set Variable    1');
  assert.equal(formatLegacyKeywordExpression('Log Variables', [], []), '! Log Variables');
  assert.equal(escapeRobotInterpolation("return `${CSS.escape(el.id)}`;"), "return `\\${CSS.escape(el.id)}`;");
});

test('debug session transport tries plain keyword syntax before the legacy fallback', async () => {
  let evaluateCount = 0;
  const session = {
    id: 'robotcode-repro',
    type: 'robotcode',
    name: 'robotcode-session',
    async customRequest(command, payload) {
      if (command === 'robot/executeKeyword') {
        throw new Error('structured requests unavailable');
      }
      if (command === 'evaluate') {
        evaluateCount += 1;
        if (payload.context === 'repl' && !payload.expression.startsWith('! ')) {
          return { result: "'page source'" };
        }
        throw new Error('legacy fallback should not run when plain syntax works');
      }
      throw new Error(`unsupported command: ${command}`);
    }
  };
  const transport = new DebugSessionTransport(session, new RuntimeStateCache(), { appendLine() {} });
  const result = await transport.executeKeyword({ keyword: 'Get Page Source', args: [], assign: [] });
  assert.equal(result.status, 'PASS');
  assert.equal(result.returnValueRepr, "'page source'");
  assert.equal(evaluateCount, 1);
});

test('debug session transport falls back to legacy keyword syntax only after plain syntax fails', async () => {
  const expressions = [];
  const session = {
    id: 'robotcode-legacy',
    type: 'robotcode',
    name: 'robotcode-session',
    async customRequest(command, payload) {
      if (command === 'robot/executeKeyword') {
        throw new Error('structured requests unavailable');
      }
      if (command === 'evaluate') {
        expressions.push(payload.expression);
        if (payload.context === 'repl' && !payload.expression.startsWith('! ')) {
          throw new Error("No keyword with name 'Get Page Source' found.");
        }
        return { result: "'legacy value'" };
      }
      throw new Error(`unsupported command: ${command}`);
    }
  };
  const transport = new DebugSessionTransport(session, new RuntimeStateCache(), { appendLine() {} });
  const result = await transport.executeKeyword({ keyword: 'Get Page Source', args: [], assign: [] });
  assert.equal(result.returnValueRepr, "'legacy value'");
  assert.deepEqual(expressions, ['Get Page Source', '! Get Page Source']);
});

test('debug session transport preserves assignment capture and typed keyword errors', async () => {
  const session = {
    id: 'robotcode-assign',
    type: 'robotcode',
    name: 'robotcode-session',
    async customRequest(command, payload) {
      if (command === 'robot/executeKeyword') {
        throw new Error('structured requests unavailable');
      }
      if (command === 'evaluate') {
        if (payload.context === 'repl') {
          return { result: "'ok'" };
        }
        if (payload.expression === '${page_source}') {
          return { result: "'<html>...'" };
        }
      }
      throw new Error("No keyword with name 'Missing Keyword' found.");
    }
  };
  const transport = new DebugSessionTransport(session, new RuntimeStateCache(), { appendLine() {} });
  const result = await transport.executeKeyword({ keyword: 'Get Page Source', args: [], assign: ['${page_source}'] });
  assert.equal(result.assigned['${page_source}'], "'<html>...'");
  await assert.rejects(
    () => transport.executeKeyword({ keyword: '', args: [], assign: [] }),
    error => error.code === 'ARGUMENT_SHAPE_ERROR'
  );
});

test('debug session transport normalizes missing-keyword failures into typed errors', async () => {
  const session = {
    id: 'robotcode-errors',
    type: 'robotcode',
    name: 'robotcode-session',
    async customRequest(command, payload) {
      if (command === 'robot/executeKeyword') {
        throw new Error('structured requests unavailable');
      }
      if (command === 'evaluate' && payload.context === 'repl') {
        throw new Error("No keyword with name 'Missing Keyword' found.");
      }
      throw new Error(`unsupported command: ${command}`);
    }
  };
  const transport = new DebugSessionTransport(session, new RuntimeStateCache(), { appendLine() {} });
  await assert.rejects(
    () => transport.executeKeyword({ keyword: 'Missing Keyword', args: [], assign: [] }),
    error => error.code === 'KEYWORD_NOT_FOUND'
  );
});

test('debug session transport supports exact-name and paged variable snapshots in fallback mode', async () => {
  const session = {
    id: 'robotcode-vars',
    type: 'robotcode',
    name: 'robotcode-session',
    async customRequest(command, payload) {
      if (command === 'robot/getVariablesSnapshot') {
        throw new Error('structured requests unavailable');
      }
      if (command === 'threads') {
        return { threads: [{ id: 1, name: 'RobotMain' }] };
      }
      if (command === 'stackTrace') {
        return { stackFrames: [{ id: 7, name: 'Verify totals', source: { path: 'demo.robot' }, line: 28, column: 1 }] };
      }
      if (command === 'scopes') {
        return { scopes: [{ name: 'Local', variablesReference: 10 }] };
      }
      if (command === 'variables') {
        assert.equal(payload.variablesReference, 10);
        return {
          variables: [
            { name: '${alpha}', value: "'A'", variablesReference: 0 },
            { name: '${page_source}', value: "'<html>...'", variablesReference: 0 },
            { name: '${omega}', value: "'Z'", variablesReference: 0 }
          ]
        };
      }
      throw new Error(`unsupported command: ${command}`);
    }
  };
  const transport = new DebugSessionTransport(session, new RuntimeStateCache(), { appendLine() {} });
  const filtered = await transport.getVariablesSnapshot({ scopes: ['local'], names: ['${page_source}'], max_items: 10 });
  assert.deepEqual(filtered.variables.local, { '${page_source}': "'<html>...'" });
  const paged = await transport.getVariablesSnapshot({ scopes: ['local'], start: 1, max_items: 1 });
  assert.deepEqual(paged.variables.local, { '${page_source}': "'<html>...'" });
  assert.equal(paged.truncated, true);
  assert.equal(paged.nextStart, 2);
});

test('debug session transport executes page scripts with escaped Robot interpolation and plain-first keyword selection', async () => {
  const expressions = [];
  const session = {
    id: 'robotcode-page-script',
    type: 'robotcode',
    name: 'robotcode-session',
    async customRequest(command, payload) {
      if (command === 'robot/executePageScript') {
        throw new Error('structured requests unavailable');
      }
      if (command === 'evaluate') {
        expressions.push(payload.expression);
        if (payload.context === 'repl' && payload.expression.includes('Evaluate JavaScript')) {
          return { result: "'ok'" };
        }
        if (payload.expression === '${selectors}') {
          return { result: "'[]'" };
        }
      }
      throw new Error(`unsupported command: ${command}`);
    }
  };
  const transport = new DebugSessionTransport(session, new RuntimeStateCache(), { appendLine() {} });
  const result = await transport.executePageScript({
    script: "return `${CSS.escape(el.id)}`;",
    selector: 'body',
    assign: ['${selectors}']
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.assigned['${selectors}'], "'[]'");
  assert.match(expressions[0], /Evaluate JavaScript/);
  assert.match(expressions[0], /\\\$\{CSS\.escape\(el\.id\)\}/);
  assert.equal(result.executionPath.syntax, 'plain');
});

test('debug session transport never surfaces legacy bang-prefixed keyword errors for page scripts', async () => {
  const session = {
    id: 'robotcode-page-script-errors',
    type: 'robotcode',
    name: 'robotcode-session',
    async customRequest(command, payload) {
      if (command === 'robot/executePageScript') {
        throw new Error('structured requests unavailable');
      }
      if (command === 'evaluate' && payload.context === 'repl') {
        throw new Error("No keyword with name 'Evaluate JavaScript' found.");
      }
      throw new Error(`unsupported command: ${command}`);
    }
  };
  const transport = new DebugSessionTransport(session, new RuntimeStateCache(), { appendLine() {} });
  await assert.rejects(
    () => transport.executePageScript({ script: 'return 1;', selector: 'body' }),
    error => error.code === 'KEYWORD_NOT_FOUND' && !error.message.includes('! ')
  );
});
