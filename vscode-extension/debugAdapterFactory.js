const vscode = require('vscode');

class AidebugDebugAdapterFactory {
  constructor(configuration) {
    this.configuration = configuration;
  }

  createDebugAdapterDescriptor() {
    const executable = this.configuration.get('adapterExecutable', 'robotframework-aidebug-dap');
    const args = this.configuration.get('adapterArgs', []);
    return new vscode.DebugAdapterExecutable(executable, args);
  }
}

class AidebugDebugConfigurationProvider {
  constructor(configuration) {
    this.configuration = configuration;
  }

  resolveDebugConfiguration(_folder, config) {
    return {
      type: 'robotframework-aidebug',
      request: 'launch',
      name: config.name || 'Robot Framework AI Debug',
      stopOnEntry: config.stopOnEntry ?? true,
      mode: config.mode || this.configuration.get('controlMode', 'fullControl'),
      program: config.program || 'tests/checkout.robot'
    };
  }
}

module.exports = {
  AidebugDebugAdapterFactory,
  AidebugDebugConfigurationProvider
};
