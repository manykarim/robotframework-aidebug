const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { AidebugDebugAdapterFactory, AidebugDebugConfigurationProvider } = require('../debugAdapterFactory');
const { defaultRobotProgram, resolveExecutable, resolveProgram, substituteTemplate } = require('../debugLaunchConfig');
const manifest = require('../package.json');

function makeVscode(overrides = {}) {
  class DebugAdapterExecutable {
    constructor(command, args) {
      this.command = command;
      this.args = args;
    }
  }
  const errors = [];
  return {
    DebugAdapterExecutable,
    workspace: {
      workspaceFolders: [{ uri: { fsPath: '/workspace/project' } }]
    },
    window: {
      activeTextEditor: overrides.activeTextEditor || null,
      showErrorMessage: async message => {
        errors.push(message);
        return 'Open Output';
      }
    },
    errors
  };
}

test('manifest activates on debug resolve and defaults to current file', () => {
  assert.ok(manifest.activationEvents.includes('onDebugResolve:robotframework-aidebug'));
  assert.equal(
    manifest.contributes.debuggers[0].configurationAttributes.launch.properties.program.default,
    '${file}'
  );
  assert.equal(manifest.contributes.debuggers[0].initialConfigurations[0].program, '${file}');
});

test('template substitution resolves workspace, file, and env variables', () => {
  process.env.AIDEBUG_TEST = 'value';
  const result = substituteTemplate('${workspaceFolder}/bin/${env:AIDEBUG_TEST}/${file}', {
    workspaceFolder: '/workspace/project',
    filePath: '/workspace/project/sample.robot'
  });
  assert.equal(result, '/workspace/project/bin/value//workspace/project/sample.robot');
});

test('resolveExecutable validates absolute executables', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aidebug-'));
  const executable = path.join(dir, 'robotframework-aidebug-dap');
  fs.writeFileSync(executable, '#!/bin/sh\nexit 0\n');
  fs.chmodSync(executable, 0o755);
  const resolved = resolveExecutable(executable, { workspaceFolder: '/workspace/project', filePath: '' });
  assert.equal(resolved, executable);
});

test('factory surfaces invalid adapter path failures', () => {
  const output = { lines: [], appendLine(line) { this.lines.push(line); }, show() {} };
  const vscodeApi = makeVscode();
  const factory = new AidebugDebugAdapterFactory(
    {
      get(key, fallback) {
        if (key === 'adapterExecutable') {
          return '/does/not/exist/robotframework-aidebug-dap';
        }
        if (key === 'adapterArgs') {
          return [];
        }
        return fallback;
      }
    },
    output,
    vscodeApi
  );
  assert.throws(() => factory.createDebugAdapterDescriptor({ workspaceFolder: { uri: { fsPath: '/workspace/project' } } }));
  assert.ok(output.lines.some(line => line.includes('adapter-error')));
  assert.equal(vscodeApi.errors.length, 1);
});

test('provider resolves to current robot file and rejects missing active file', () => {
  const output = { lines: [], appendLine(line) { this.lines.push(line); }, show() {} };
  const withFile = makeVscode({ activeTextEditor: { document: { uri: { fsPath: '/workspace/project/sample.robot' } } } });
  const provider = new AidebugDebugConfigurationProvider(
    { get(_key, fallback) { return fallback; } },
    output,
    withFile
  );
  const config = provider.resolveDebugConfiguration(undefined, {});
  assert.equal(config.program, '/workspace/project/sample.robot');

  const withoutFile = makeVscode();
  const providerWithoutFile = new AidebugDebugConfigurationProvider(
    { get(_key, fallback) { return fallback; } },
    output,
    withoutFile
  );
  const missing = providerWithoutFile.resolveDebugConfiguration(undefined, {});
  assert.equal(missing, null);
});

test('resolveProgram prefers explicit config and otherwise uses active file', () => {
  const vscodeApi = makeVscode({ activeTextEditor: { document: { uri: { fsPath: '/workspace/project/current.robot' } } } });
  assert.equal(resolveProgram('${file}', vscodeApi), '/workspace/project/current.robot');
  assert.equal(resolveProgram(undefined, vscodeApi), '/workspace/project/current.robot');
  assert.equal(defaultRobotProgram(vscodeApi), '/workspace/project/current.robot');
});
