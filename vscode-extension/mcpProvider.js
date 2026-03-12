const path = require('node:path');
const { resolveExecutable, firstWorkspaceFolder } = require('./debugLaunchConfig');

function registerMcpServerDefinitionProvider(context, vscodeApi, configuration, output) {
  if (!vscodeApi.lm || typeof vscodeApi.lm.registerMcpServerDefinitionProvider !== 'function') {
    return { registered: false };
  }
  const emitter = new vscodeApi.EventEmitter();
  const providerId = 'robotframeworkAidebug.localMcp';
  const provider = {
    onDidChangeMcpServerDefinitions: emitter.event,
    async provideMcpServerDefinitions() {
      const workspaceFolder = firstWorkspaceFolder(vscodeApi.workspace);
      const transport = configuration.get('mcpTransport', 'stdio');
      if (transport === 'streamable-http') {
        const baseUrl = configuration.get('mcpHttpBaseUrl', 'http://127.0.0.1:8765/mcp');
        return [new vscodeApi.McpHttpServerDefinition({
          label: 'robotframework-aidebug-http',
          uri: vscodeApi.Uri.parse(baseUrl),
          headers: {},
          version: '0.1.0'
        })];
      }
      const executable = resolveExecutable(configuration.get('mcpExecutable', 'robotframework-aidebug-mcp'), {
        workspaceFolder,
        filePath: ''
      });
      const args = [...configuration.get('mcpArgs', []), '--transport', 'stdio', '--no-banner'];
      return [new vscodeApi.McpStdioServerDefinition({
        label: 'robotframework-aidebug-stdio',
        command: executable,
        args,
        cwd: vscodeApi.Uri.file(workspaceFolder),
        env: {},
        version: '0.1.0'
      })];
    },
    async resolveMcpServerDefinition(server) {
      if (server.label === 'robotframework-aidebug-http') {
        const token = configuration.get('mcpHttpAuthToken', '');
        if (!token) {
          const entered = await vscodeApi.window.showInputBox({
            title: 'Robot Framework AI Debug MCP HTTP token',
            password: true,
            prompt: 'Enter the MCP HTTP bearer token configured for robotframework-aidebug.'
          });
          if (!entered) {
            return undefined;
          }
          server.headers = { ...(server.headers || {}), Authorization: `Bearer ${entered}` };
          return server;
        }
        server.headers = { ...(server.headers || {}), Authorization: `Bearer ${token}` };
      }
      return server;
    }
  };
  context.subscriptions.push(vscodeApi.lm.registerMcpServerDefinitionProvider(providerId, provider));
  output.appendLine('[mcp] registered MCP server definition provider');
  return { registered: true, emitter };
}

module.exports = { registerMcpServerDefinitionProvider };
