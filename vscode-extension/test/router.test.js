const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionRouter } = require('../sessionRouter');
const { RuntimeStateCache } = require('../runtimeStateCache');
const { extractStaticContext } = require('../staticContext');
const { formatKeywordExpression } = require('../transports');

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
      return { stackFrames: [{ id: 7, name: 'Verify totals', source: { path: 'tests/checkout.robot' }, line: 28, column: 1 }] };
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

test('keyword expression formatter builds RobotCode repl syntax', () => {
  assert.equal(formatKeywordExpression('Log Variables', [], []), '! Log Variables');
  assert.equal(formatKeywordExpression('Set Variable', ['1'], ['${value}']), '! ${value}=    Set Variable    1');
});
