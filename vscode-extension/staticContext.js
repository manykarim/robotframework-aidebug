function extractStaticContext(text) {
  const lines = text.split(/\r?\n/);
  const variables = new Set();
  const keywords = [];
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    for (const match of line.matchAll(/\$\{[^}]+\}/g)) {
      variables.add(match[0]);
    }
    if (!line || line.startsWith('***') || line.startsWith('#')) {
      continue;
    }
    if (!rawLine.startsWith(' ') && !rawLine.startsWith('\t') && /^[A-Z][A-Za-z0-9 ]+$/.test(line.trim())) {
      continue;
    }
    const cells = line.trim().split(/\s{2,}/).filter(Boolean);
    if (cells.length) {
      const first = cells[0];
      if (/^\$[{@&][^}]+}=$/.test(first) && cells[1]) {
        keywords.push(cells[1]);
      } else {
        keywords.push(first);
      }
    }
  }
  return {
    source: 'static',
    variables: Array.from(variables).sort(),
    keywords: Array.from(new Set(keywords)).sort()
  };
}

module.exports = { extractStaticContext };
