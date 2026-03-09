const vscode = require('vscode');
const { BackendClient } = require('./backendClient');
const { AidebugDebugAdapterFactory, AidebugDebugConfigurationProvider } = require('./debugAdapterFactory');
const { defaultRobotProgram } = require('./debugLaunchConfig');
const { runRecoveryJourney } = require('./journeys');
const { RuntimeStateCache } = require('./runtimeStateCache');
const { SessionRouter } = require('./sessionRouter');
const { extractStaticContext } = require('./staticContext');

let client;
let output;
let cache;
let router;

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

function ensureRuntimeCache() {
  if (!cache) {
    cache = new RuntimeStateCache(getOutput());
  }
  return cache;
}

function ensureRouter() {
  if (!router) {
    router = new SessionRouter({
      debugHost: vscode.debug,
      backendFactory: ensureClient,
      cache: ensureRuntimeCache(),
      output: getOutput(),
      configuration: getConfig()
    });
  }
  return router;
}

async function withTransport(action) {
  const transport = await ensureRouter().resolveTransport();
  return action(transport);
}

function register(context, command, handler) {
  context.subscriptions.push(vscode.commands.registerCommand(command, async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      getOutput().appendLine(`[command-error] ${command}: ${error.stack || error.message}`);
      const choice = await vscode.window.showErrorMessage(error.message, 'Open Output');
      if (choice === 'Open Output') {
        getOutput().show(true);
      }
      throw error;
    }
  }));
}

async function showJson(title, payload) {
  const channel = getOutput();
  channel.show(true);
  channel.appendLine(title);
  channel.appendLine(JSON.stringify(payload, null, 2));
}

async function showStaticContext() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error('No active editor is available for static context extraction.');
  }
  const payload = extractStaticContext(editor.document.getText());
  await showJson('Static context', payload);
}

async function activate(context) {
  const configuration = getConfig();
  const channel = getOutput();
  const adapterFactory = new AidebugDebugAdapterFactory(configuration, channel, vscode);
  const configProvider = new AidebugDebugConfigurationProvider(configuration, channel, vscode);
  context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('robotframework-aidebug', adapterFactory));
  context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('robotframework-aidebug', configProvider));

  const runtimeCache = ensureRuntimeCache();
  context.subscriptions.push(vscode.debug.onDidStartDebugSession(session => runtimeCache.noteSessionStart(session)));
  context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(session => runtimeCache.noteSessionStop(session)));
  context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(session => runtimeCache.noteActiveSession(session)));
  context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent(event => runtimeCache.handleCustomEvent(event)));

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

  register(context, 'robotframeworkAidebug.startEmbeddedSession', async () => {
    const program = defaultRobotProgram(vscode);
    if (!program) {
      throw new Error('Open a .robot file before starting the embedded session, or configure "program" in launch.json.');
    }
    const started = await vscode.debug.startDebugging(undefined, {
      type: 'robotframework-aidebug',
      request: 'launch',
      name: 'Robot Framework AI Debug',
      mode: getConfig().get('controlMode', 'fullControl'),
      stopOnEntry: true,
      program
    });
    if (!started) {
      throw new Error('Failed to start embedded Robot Framework AI Debug session. Check the output channel for adapter details.');
    }
  });

  register(context, 'robotframeworkAidebug.showCapabilities', async () => {
    const capabilities = await withTransport(transport => transport.probeCapabilities());
    await showJson('Capabilities', capabilities);
  });

  register(context, 'robotframeworkAidebug.showState', async () => {
    const state = await withTransport(transport =>
      transport.getExecutionState({ includeStack: true, includeScopes: true, maxLogLines: 20 })
    );
    await showJson('Execution state', state);
  });

  register(context, 'robotframeworkAidebug.showVariables', async () => {
    const variables = await withTransport(transport =>
      transport.getVariablesSnapshot({ scopes: ['local', 'test', 'suite', 'global'], max_items: 20 })
    );
    await showJson('Variables', variables);
  });

  register(context, 'robotframeworkAidebug.showAuditLog', async () => {
    const audit = await withTransport(transport => transport.getAuditLog(20));
    await showJson('Audit log', audit);
  });

  register(context, 'robotframeworkAidebug.showContext', async () => {
    try {
      const completions = await withTransport(transport => transport.getRuntimeCompletions({ text: '' }));
      if (completions.targets?.length) {
        await showJson('Runtime context', { source: 'runtime', completions: completions.targets });
        return;
      }
    } catch (_error) {
      // fall back to static context
    }
    await showStaticContext();
  });

  register(context, 'robotframeworkAidebug.resetDemoSession', async () => {
    await withTransport(async transport => {
      if (transport.kind !== 'backend') {
        throw new Error('Demo reset is only available in backend transport mode.');
      }
      return transport.client.request('resetDemo');
    });
    vscode.window.showInformationMessage('Robot Framework AI Debug demo session reset.');
  });

  register(context, 'robotframeworkAidebug.runRecoveryJourney', async () => {
    const variables = await withTransport(runRecoveryJourney);
    await showJson('Recovery journey completed', variables);
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
