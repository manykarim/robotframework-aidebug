const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { BackendClient } = require('../backendClient');
const { runRecoveryJourney } = require('../journeys');

function backendExecutable() {
  return path.resolve(__dirname, '..', '..', '.venv', 'bin', 'robotframework-aidebug-stdio');
}

test('backend client can read state and variables', async () => {
  const client = new BackendClient(backendExecutable(), []);
  await client.start();
  const state = await client.request('robot/getExecutionState', { includeStack: true, includeScopes: true });
  assert.equal(state.state, 'paused');
  const variables = await client.request('robot/getVariablesSnapshot', { scopes: ['suite', 'global'], max_items: 10 });
  assert.equal(variables.variables.suite['${password}'], '<redacted>');
  await client.stop();
});

test('recovery journey mutates the demo session', async () => {
  const client = new BackendClient(backendExecutable(), []);
  await client.start();
  const snapshot = await runRecoveryJourney(client);
  assert.equal(snapshot.variables.local['${status}'], "'RECOVERED'");
  assert.equal(snapshot.variables.suite['${recovery_flag}'], "'ready'");
  assert.equal(snapshot.variables.test['${items}'], "['apple', 'pear', 'kiwi', 'mango']");
  await client.stop();
});
