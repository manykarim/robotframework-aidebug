const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { BackendClient } = require('../backendClient');
const { runRecoveryJourney } = require('../journeys');
const { BackendTransport } = require('../transports');

function backendExecutable() {
  return path.resolve(__dirname, '..', '..', '.venv', 'bin', 'robotframework-aidebug-stdio');
}

test('backend transport can read state, variables, and capabilities', async () => {
  const client = new BackendClient(backendExecutable(), []);
  const transport = new BackendTransport(client, { appendLine() {} });
  await client.start();
  const capabilities = await transport.probeCapabilities();
  const state = await transport.getExecutionState({ includeStack: true, includeScopes: true });
  const variables = await transport.getVariablesSnapshot({ scopes: ['suite', 'global'], max_items: 10 });
  assert.equal(capabilities.capabilities.canReadState, true);
  assert.equal(state.state, 'paused');
  assert.equal(variables.variables.suite['${password}'], '<redacted>');
  await client.stop();
});

test('recovery journey mutates the backend demo session', async () => {
  const client = new BackendClient(backendExecutable(), []);
  const transport = new BackendTransport(client, { appendLine() {} });
  await client.start();
  const snapshot = await runRecoveryJourney(transport);
  assert.equal(snapshot.variables.local['${status}'], "'RECOVERED'");
  assert.equal(snapshot.variables.suite['${recovery_flag}'], "'ready'");
  assert.equal(snapshot.variables.test['${items}'], "['apple', 'pear', 'kiwi', 'mango']");
  const audit = await transport.getAuditLog(10);
  assert.ok(audit.entries.some(entry => entry.command === 'robot/executeSnippet'));
  await client.stop();
});
