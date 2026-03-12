const { invokeToolEnvelope } = require('./chatAgents');

const COMMAND_TO_TOOL = {
  state: 'get_state',
  variables: 'get_variables_snapshot',
  context: 'get_runtime_context',
  capabilities: 'get_capabilities',
  recover: 'get_state',
  'run-keyword': 'execute_keyword',
  'run-page-script': 'execute_page_script',
  'run-snippet': 'execute_snippet',
  'set-variable': 'set_variable',
  step: 'control_execution'
};

function detectIntent(request) {
  const command = request.command ? request.command.replace(/^\//, '') : '';
  if (COMMAND_TO_TOOL[command]) {
    return { flow: 'single', toolName: COMMAND_TO_TOOL[command] };
  }
  const prompt = (request.prompt || '').toLowerCase();
  if (prompt.includes('variable')) {
    return { flow: 'single', toolName: 'get_variables_snapshot' };
  }
  if (prompt.includes('capabil')) {
    return { flow: 'single', toolName: 'get_capabilities' };
  }
  if (prompt.includes('step')) {
    return { flow: 'single', toolName: 'control_execution', input: { action: 'next' } };
  }
  return { flow: 'diagnose' };
}

function summarizeDiagnostic(envelopes) {
  const failures = envelopes.filter(item => !['success', 'partial'].includes(item.status));
  if (failures.length) {
    return `Diagnostic flow found ${failures.length} issue(s). Start with ${failures[0].tool}: ${failures[0].error?.message || 'unknown failure'}.`;
  }
  return 'Diagnostic flow completed. State, variables, and runtime context are available below.';
}

async function runParticipantFlow(request, stream, dependencies, token) {
  const intent = detectIntent(request);
  const transport = await dependencies.resolveTransport();
  if (intent.flow === 'single') {
    const envelope = await invokeToolEnvelope({
      toolName: intent.toolName,
      input: intent.input || {},
      transport,
      surface: 'chat_participant'
    });
    stream.markdown(`Robot Framework AI Debug\n\n${JSON.stringify(envelope, null, 2)}`);
    return { metadata: { tool: intent.toolName, status: envelope.status } };
  }
  const envelopes = [];
  for (const toolName of ['get_state', 'get_variables_snapshot', 'get_runtime_context']) {
    stream.progress(`Running ${toolName}`);
    envelopes.push(await invokeToolEnvelope({ toolName, input: {}, transport, surface: 'chat_participant' }));
    if (token?.isCancellationRequested) {
      break;
    }
  }
  stream.markdown(`Robot Framework AI Debug\n\n${summarizeDiagnostic(envelopes)}\n\n${JSON.stringify(envelopes, null, 2)}`);
  return { metadata: { flow: 'diagnose' } };
}

function registerChatParticipant(context, vscodeApi, dependencies) {
  if (!vscodeApi.chat || typeof vscodeApi.chat.createChatParticipant !== 'function') {
    return { registered: false };
  }
  const participant = vscodeApi.chat.createChatParticipant('robotframeworkAidebug.robotdebug', async (request, chatContext, stream, token) =>
    runParticipantFlow(request, stream, dependencies, token)
  );
  context.subscriptions.push(participant);
  return { registered: true };
}

module.exports = {
  COMMAND_TO_TOOL,
  detectIntent,
  registerChatParticipant,
  runParticipantFlow,
  summarizeDiagnostic
};
