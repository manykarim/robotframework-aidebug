async function runRecoveryJourney(client) {
  const state = await client.request('robot/getExecutionState', { includeStack: true, includeScopes: true });
  const localRef = state.scopes[0].variablesReference;
  await client.request('setVariable', {
    variablesReference: localRef,
    name: '${status}',
    value: "'RECOVERED'"
  });
  await client.request('robot/executeKeyword', {
    keyword: 'Set Suite Variable',
    args: ['${recovery_flag}', 'ready'],
    assign: []
  });
  await client.request('robot/executeSnippet', {
    snippet: [
      'FOR    ${fruit}    IN    kiwi    mango',
      '    Append To List    ${items}    ${fruit}',
      'END',
      '${summary}=    Catenate    ${status}    ${order_id}',
      'Log    Recovery journey complete'
    ].join('\n')
  });
  return client.request('robot/getVariablesSnapshot', {
    scopes: ['local', 'test', 'suite', 'global'],
    max_items: 20
  });
}

module.exports = { runRecoveryJourney };
