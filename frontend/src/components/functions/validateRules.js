import { extractAllLabelKeys } from "./functions1";

export default function validateRules(rules) {
  const errorMessagesByRule = {};

  function addError(ruleId, type, message, severity) {
    if (!errorMessagesByRule[ruleId]) {
      errorMessagesByRule[ruleId] = { types: [], messages: [], severities: [] };
    }
    errorMessagesByRule[ruleId].types.push(type);
    errorMessagesByRule[ruleId].messages.push(message);
    errorMessagesByRule[ruleId].severities.push(severity);
  }

  // Filter out any null or undefined rules
  const validRules = rules.filter(rule => rule != null);

  const nodes = validRules.map((rule, idx) => {
    let action = 'None';
    if (rule.Action) {
      action = Object.keys(rule.Action)[0];
    }
    let generatedLabels = [];
    if (rule.RuleLabels && Array.isArray(rule.RuleLabels)) {
      generatedLabels = rule.RuleLabels.map(l => l.Name);
    }
    if (!rule.Name) addError(idx, 'Missing required field', 'Name is missing.', 'strong');
    if (!rule.Action) addError(idx, 'Missing required field', 'Action is missing.', 'strong');
    return {
      id: idx,
      name: rule.Name || `Rule_${idx}`,
      priority: rule.Priority,
      action,
      generatedLabels,
      rawRule: rule
    };
  });

  nodes.forEach(node => {
    node.dependsOn = [];
    // Guard against a missing Statement property
    const needed = node.rawRule.Statement
      ? extractAllLabelKeys(node.rawRule.Statement)
      : [];
    nodes.forEach(n => {
      // Ensure n is not null and then compare
      if (n && n.id !== node.id && n.generatedLabels.some(label => needed.includes(label))) {
        node.dependsOn.push(n.id);
      }
    });
    if (node.dependsOn.includes(node.id)) {
      addError(node.id, 'Self-dependency error', `Rule "${node.name}" depends on itself.`, 'strong');
    }
    const missingLabels = [];
    needed.forEach(lbl => {
      const found = nodes.some(n => n && n.id !== node.id && n.generatedLabels.includes(lbl));
      if (!found && !missingLabels.includes(lbl)) {
        missingLabels.push(lbl);
      }
    });
    if (missingLabels.length > 0) {
      addError(node.id, 'Missing dependency', missingLabels.join(', '), 'strong');
    }
  });

  nodes.forEach(node => {
    node.dependsOn.forEach(depId => {
      const depNode = nodes.find(n => n && n.id === depId);
      if (depNode && (depNode.action === 'Block' || depNode.action === 'Allow') && node.id !== depNode.id) {
        addError(
          node.id,
          'Invalid dependency',
          `Rule "${depNode.name}" (${depNode.action}) is used as a dependency by "${node.name}".`,
          'strong'
        );
      }
    });
  });

  nodes.forEach(node => {
    node.dependsOn.forEach(depId => {
      const depNode = nodes.find(n => n && n.id === depId);
      if (depNode && depNode.priority > node.priority) {
        addError(
          node.id,
          'Priority error',
          `Rule "${node.name}" (priority ${node.priority}) depends on "${depNode.name}" (priority ${depNode.priority}).`,
          'strong'
        );
      }
    });
  });

  const finalErrors = Object.entries(errorMessagesByRule).map(([ruleIdStr, data]) => {
    const ruleId = parseInt(ruleIdStr, 10);
    const uniqueMessages = [...new Set(data.messages)];
    const uniqueTypes = [...new Set(data.types)];
    const errorType = uniqueTypes.length === 1 ? uniqueTypes[0] : uniqueTypes.join(', ');
    const overallSeverity = data.severities.includes('strong') ? 'strong' : 'weak';
    return {
      type: errorType,
      rules: [ruleId],
      message: uniqueMessages.join(' '),
      severity: overallSeverity
    };
  });

  const errorNodes = new Set();
  finalErrors.forEach(err => {
    err.rules.forEach(rid => errorNodes.add(rid));
  });

  return { errors: finalErrors, errorNodes };
}