export  function extractAllLabelKeys(statement) {
    if (!statement) return [];
    let results = [];
    if (statement.LabelMatchStatement && statement.LabelMatchStatement.Key) {
      results.push(statement.LabelMatchStatement.Key);
    }
    if (statement.AndStatement && Array.isArray(statement.AndStatement.Statements)) {
      statement.AndStatement.Statements.forEach(st => {
        results = results.concat(extractAllLabelKeys(st));
      });
    }
    if (statement.OrStatement && Array.isArray(statement.OrStatement.Statements)) {
      statement.OrStatement.Statements.forEach(st => {
        results = results.concat(extractAllLabelKeys(st));
      });
    }
    if (statement.NotStatement && statement.NotStatement.Statement) {
      results = results.concat(extractAllLabelKeys(statement.NotStatement.Statement));
    }
    if (statement.RateBasedStatement && statement.RateBasedStatement.ScopeDownStatement) {
      results = results.concat(extractAllLabelKeys(statement.RateBasedStatement.ScopeDownStatement));
    }
    return results;
  }

  export function ruleInsertsHeader(rawRule) {
    if (!rawRule?.Action) return false;
    const actionKey = Object.keys(rawRule.Action)[0];
    if (!actionKey) return false;
    const actionVal = rawRule.Action[actionKey];
    return Boolean(actionVal?.CustomRequestHandling?.InsertHeaders?.length);
  }
  import Elk from 'elkjs/lib/elk.bundled.js';
export async function layoutWithElk(nodes, links) {
  const elk = new Elk();
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'POLYLINE',
      'elk.spacing.nodeNode': '50',
      'elk.spacing.nodeEdge': '30'
    },
    children: nodes.map(n => ({
      id: String(n.id),
      width: n.width,
      height: n.height
    })),
    edges: links.map((l, i) => ({
      id: `edge-${i}`,
      sources: [String(l.source)],
      targets: [String(l.target)]
    }))
  };

  try {
    return await elk.layout(graph);
  } catch (err) {
    console.error('ELK error:', err);
    return {
      children: nodes.map((n, idx) => ({
        id: String(n.id),
        x: (idx % 4) * 300,
        y: Math.floor(idx / 4) * 200,
        width: n.width,
        height: n.height
      }))
    };
  }
}
