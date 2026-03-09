const { defaultRobotProgram, firstWorkspaceFolder, resolveExecutable, resolveProgram } = require('./debugLaunchConfig');

function getDefaultVscode() {
  try {
    return require('vscode');
  } catch (_error) {
    return null;
  }
}

function openOutputOnDemand(output) {
  return async choice => {
    if (choice === 'Open Output') {
      output.show(true);
    }
  };
}

class AidebugDebugAdapterFactory {
  constructor(configuration, output, vscodeApi = getDefaultVscode()) {
    this.configuration = configuration;
    this.output = output;
    this.vscode = vscodeApi;
  }

  createDebugAdapterDescriptor(session) {
    const workspaceFolder = session?.workspaceFolder?.uri?.fsPath || firstWorkspaceFolder(this.vscode.workspace);
    const filePath = defaultRobotProgram(this.vscode);
    const rawExecutable = this.configuration.get('adapterExecutable', 'robotframework-aidebug-dap');
    const args = this.configuration.get('adapterArgs', []);
    try {
      const executable = resolveExecutable(rawExecutable, { workspaceFolder, filePath });
      this.output.appendLine(`[adapter] executable: ${executable}`);
      this.output.appendLine(`[adapter] args: ${JSON.stringify(args)}`);
      return new this.vscode.DebugAdapterExecutable(executable, args);
    } catch (error) {
      const message = `Robot Framework AI Debug adapter launch failed: ${error.message}`;
      this.output.appendLine(`[adapter-error] ${message}`);
      this.vscode.window.showErrorMessage(message, 'Open Output').then(openOutputOnDemand(this.output));
      throw error;
    }
  }
}

class AidebugDebugConfigurationProvider {
  constructor(configuration, output, vscodeApi = getDefaultVscode()) {
    this.configuration = configuration;
    this.output = output;
    this.vscode = vscodeApi;
  }

  resolveDebugConfiguration(_folder, config) {
    const program = resolveProgram(config.program, this.vscode);
    if (!program) {
      const message = 'No Robot Framework file is active. Open a .robot file or set "program" explicitly in launch.json.';
      this.output.appendLine(`[launch-error] ${message}`);
      this.vscode.window.showErrorMessage(message, 'Open Output').then(openOutputOnDemand(this.output));
      return null;
    }
    const resolved = {
      type: 'robotframework-aidebug',
      request: 'launch',
      name: config.name || 'Robot Framework AI Debug',
      stopOnEntry: config.stopOnEntry ?? true,
      mode: config.mode || this.configuration.get('controlMode', 'fullControl'),
      program
    };
    this.output.appendLine(`[launch] ${JSON.stringify({ type: resolved.type, request: resolved.request, mode: resolved.mode, program: resolved.program })}`);
    return resolved;
  }
}

module.exports = {
  AidebugDebugAdapterFactory,
  AidebugDebugConfigurationProvider
};
