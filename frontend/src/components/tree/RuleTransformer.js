/* RuleTransformer: encapsulates rule transformation logic */
export default class RuleTransformer {
  constructor(rulesArray) {
    this.level = 0;
    this.warnings = [];
    this.links = [];
    this.rulesArray = rulesArray;
  }

  transformRules() {

    const sortedRules = [...this.rulesArray].sort((a, b) => a.Priority - b.Priority);
    const newRules = [];

    sortedRules.forEach((rule, index) => {
      this.warnings = [];
      this.validateRule(rule);
      const labelState = this.labelStatement(rule.Statement, newRules, index);
      const labelScopeDown = rule.Statement?.RateBasedStatement?.ScopeDownStatement ?
        this.labelStatement(rule.Statement.RateBasedStatement.ScopeDownStatement, newRules, index) : [];

      const transformedRule = {
        json: JSON.stringify(rule, null, 2),
        id: index,
        name: rule.Name,
        priority: rule.Priority,
        action: rule.Action ? Object.keys(rule.Action)[0] : Object.keys(rule.OverrideAction)[0],
        ruleLabels: rule.RuleLabels?.map(label => label.Name) || [],
        insertHeaders: rule.Action?.Count?.CustomRequestHandling?.InsertHeaders?.map(h => { return { name: h.Name, value: h.Value } }) || [],
        labelState: [...labelState, ...labelScopeDown],
        level: this.level,
        warnings: [...this.warnings]
      };

      newRules.push(transformedRule);
    });

    return {
      nodes: newRules,
      edges: this.links,
      globalWarnings: this.collectWarnings(newRules)
    };
  }

  validateRule(rule) {
    ['Name', 'Priority', 'Statement', 'Action'].forEach(key => {
      if (rule[key] === undefined) {
        this.warnings.push(`Missing required field: ${key}`);
      }
    });

    if (rule.Name !== rule.VisibilityConfig.MetricName) {
      this.warnings.push(`Name and MetricName do not match`);
    }
  }

  labelStatement(statement, rules, currentIndex) {
    if (!statement) return [];

    if (statement.LabelMatchStatement) {
      return [[
        '',  // אין תנאי לוגי
        statement.LabelMatchStatement.Key,  // שם הלייבל
        this.findParentDependencies(rules, statement.LabelMatchStatement.Key, currentIndex)  // מערך של שמות חוקים
      ]];
    }

    if (statement.NotStatement?.Statement.LabelMatchStatement) {
      return [[
        '!',
        statement.NotStatement.Statement.LabelMatchStatement.Key,
        this.findParentDependencies(rules, statement.NotStatement.Statement.LabelMatchStatement.Key, currentIndex)
      ]];
    }

    const processStatements = (statements, logic) => {
      return statements.flatMap(stmt => {
        const result = this.labelStatement(stmt, rules, currentIndex);
        return result.map(([existingLogic, label, deps]) => [
          existingLogic || logic,
          label,
          deps
        ]);
      });
    };

    if (statement.AndStatement) return processStatements(statement.AndStatement.Statements, '&&');

    if (statement.OrStatement) return processStatements(statement.OrStatement.Statements, '||');

    return [];
  }

  findParentDependencies(rules, name, currentIndex) {
    const matchingRules = rules.filter(r => r.ruleLabels?.includes(name));

    if (matchingRules.length === 0) {
      if ([...this.rulesArray][currentIndex].RuleLabels?.some(l => l.Name === name)) {
        this.warnings.push(`Label '${name}' is self-referential - rule depends on a label it generates`);
      } else if (![...this.rulesArray].some(r => r.RuleLabels?.some(l => l.Name === name))) {
        this.warnings.push(`Label '${name}' is not defined in any rule`);
      } else {
        this.warnings.push(`Label '${name}' is not defined in any rule with lower priority`);
      }
      return [];
    }

    return matchingRules.map(rule => {
      if (rule.level === this.level) this.level++;
      if (['ALLOW', 'BLOCK'].includes(rule.action)) {
        this.warnings.push(`Label '${name}' is created in a terminal rule (${rule.action}) - this may affect rule evaluation`);
      }
      this.links.push({
        id: `edge-${rule.id}-${currentIndex}-${Date.now()}`,
        source: `${rule.id}`,
        target: `${currentIndex}`
      });
      return { name: rule.name, id: rule.id };
    });
  }

  collectWarnings(rules) {
    return rules
      .filter(rule => rule.warnings.length > 0)
      .map(rule => ({ id: rule.id, rule: rule.name, warnings: rule.warnings }));
  }
}