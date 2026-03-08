const vscode = require('vscode');
const { BackendClient } = require('./backendClient');
const { runRecoveryJourney } = require('./journeys');

let client;
let output;

function getOutput() {
  if (!output) {
    output = vscode.window.createOutputChannel('Robot Framework AI Debug');
  }
  return output;
}

function getConfig() {
  return vscode.workspace.getConfiguration('robotframeworkAidebug');
}

function ensureClient() {
  if (!client) {
    const config = getConfig();
    client = new BackendClient(
      config.get('backendExecutable', 'robotframework-aidebug-stdio'),
      config.get('backendArgs', []),
      getOutput()
    );
  }
  return client;
}

async function withClient(action) {
  const backend = ensureClient();
  const config = getConfig();
  if (!backend.process && config.get('autoStartBackend', true)) {
    await backend.start();
  }
  return action(backend);
}

function register(context, command, handler) {
  context.subscriptions.push(vscode.commands.registerCommand(command, handler));
}

async function activate(context) {
  register(context, 'robotframeworkAidebug.startBackend', async () => {
    const backend = ensureClient();
    await backend.start();
    vscode.window.showInformationMessage('Robot Framework AI Debug backend started.');
  });

  register(context, 'robotframeworkAidebug.stopBackend', async () => {
    if (client) {
      await client.stop();
      client = null;
    }
    vscode.window.showInformationMessage('Robot Framework AI Debug backend stopped.');
  });

  register(context, 'robotframeworkAidebug.showState', async () => {
    const state = await withClient(backend => backend.request('robot/getExecutionState', { includeStack: true, includeScopes: true }));
    getOutput().show(true);
    getOutput().appendLine(JSON.stringify(state, null, 2));
  });

  register(context, 'robotframeworkAidebug.showVariables', async () => {
    const variables = await withClient(backend => backend.request('robot/getVariablesSnapshot', {
      scopes: ['local', 'test', 'suite', 'global'],
      max_items: 20
    }));
    getOutput().show(true);
    getOutput().appendLine(JSON.stringify(variables, null, 2));
  });

  register(context, 'robotframeworkAidebug.resetDemoSession', async () => {
    await withClient(backend => backend.request('resetDemo'));
    vscode.window.showInformationMessage('Robot Framework AI Debug demo session reset.');
  });

  register(context, 'robotframeworkAidebug.runRecoveryJourney', async () => {
    const variables = await withClient(runRecoveryJourney);
    getOutput().show(true);
    getOutput().appendLine('Recovery journey completed.');
    getOutput().appendLine(JSON.stringify(variables, null, 2));
    vscode.window.showInformationMessage('Robot Framework AI Debug recovery journey completed.');
  });
}

function deactivate() {
  if (client) {
    client.stop();
    client = null;
  }
}

module.exports = { activate, deactivate };
