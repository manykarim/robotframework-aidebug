const { TOOL_DEFINITIONS, createToolResult, invokeToolEnvelope, prepareInvocation } = require('./chatAgents');

function registerLanguageModelTools(context, vscodeApi, dependencies) {
  if (!vscodeApi.lm || typeof vscodeApi.lm.registerTool !== 'function') {
    return { registered: false, count: 0 };
  }
  let count = 0;
  for (const tool of TOOL_DEFINITIONS) {
    const disposable = vscodeApi.lm.registerTool(tool.name, {
      async prepareInvocation(options, token) {
        return prepareInvocation(vscodeApi, tool.name, options?.input || {}, token);
      },
      async invoke(options, token) {
        const transport = await dependencies.resolveTransport();
        const envelope = await invokeToolEnvelope({
          toolName: tool.name,
          input: options?.input || {},
          transport,
          surface: 'lm_tool'
        });
        return createToolResult(vscodeApi, envelope);
      }
    });
    context.subscriptions.push(disposable);
    count += 1;
  }
  return { registered: true, count };
}

module.exports = { registerLanguageModelTools };
