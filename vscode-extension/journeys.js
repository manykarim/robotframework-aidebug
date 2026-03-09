async function runRecoveryJourney(transport) {
  const state = await transport.getExecutionState({ includeStack: true, includeScopes: true });
  const localRef = state.scopes[0].variablesReference;
  await transport.setVariable({
    variablesReference: localRef,
    name: '${status}',
    value: "'RECOVERED'"
  });
  await transport.executeKeyword({
    keyword: 'Set Suite Variable',
    args: ['${recovery_flag}', 'ready'],
    assign: []
  });
  await transport.executeSnippet({
    snippet: [
      'FOR    ${fruit}    IN    kiwi    mango',
      '    Append To List    ${items}    ${fruit}',
      'END',
      '${summary}=    Catenate    ${status}    ${order_id}',
      'Log    Recovery journey complete'
    ].join('\n')
  });
  return transport.getVariablesSnapshot({
    scopes: ['local', 'test', 'suite', 'global'],
    max_items: 20
  });
}

module.exports = { runRecoveryJourney };
