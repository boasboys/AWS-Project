import React, { useEffect, useState } from "react";
import { Container, Typography, CircularProgress, Paper } from "@mui/material";
import axios from "axios";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

/**
 * Extract label names that a rule generates
 */
function getGeneratedLabels(rule) {
  return (rule.RuleLabels || []).map(label => label.Name);
}

/**
 * Extract label dependencies for a rule
 */
function getLabelDependencies(rule) {
  if (!rule.Statement) return [];
  
  const deps = [];
  
  // Check for direct label match statements
  if (rule.Statement.LabelMatchStatement) {
    deps.push(rule.Statement.LabelMatchStatement.Key);
  }
  
  // Check for AND/OR statements that might contain label matches
  if (rule.Statement.AndStatement) {
    rule.Statement.AndStatement.Statements.forEach(stmt => {
      if (stmt.LabelMatchStatement) {
        deps.push(stmt.LabelMatchStatement.Key);
      }
    });
  }
  
  return deps;
}

/**
 * Group rules by their dependency level
 */
function organizeRulesByDependency(rules) {
  const rulesByLevel = [];
  const processed = new Map(); // Changed to Map to store level information
  const labelToRule = new Map();

  // Build map of labels to rules that generate them
  rules.forEach(rule => {
    getGeneratedLabels(rule).forEach(label => {
      labelToRule.set(label, rule);
    });
  });

  // Helper to find the highest level of any dependency
  const getMaxDependencyLevel = (rule) => {
    const deps = getLabelDependencies(rule);
    if (deps.length === 0) return -1;

    let maxLevel = -1;
    deps.forEach(dep => {
      const sourceRule = labelToRule.get(dep);
      if (sourceRule && processed.has(sourceRule.Name)) {
        maxLevel = Math.max(maxLevel, processed.get(sourceRule.Name));
      }
    });
    return maxLevel;
  };

  // Helper to check if rule can be added to current level
  const canAddToLevel = (rule, currentLevel) => {
    const deps = getLabelDependencies(rule);
    if (deps.length === 0) return currentLevel === 0;

    // Check if all dependencies are in previous levels
    const maxDependencyLevel = getMaxDependencyLevel(rule);
    return maxDependencyLevel !== -1 && currentLevel > maxDependencyLevel;
  };

  // Build levels
  let remainingRules = [...rules];
  let currentLevel = 0;
  
  while (remainingRules.length > 0) {
    const levelRules = [];
    const nextRemainingRules = [];

    remainingRules.forEach(rule => {
      if (canAddToLevel(rule, currentLevel)) {
        levelRules.push(rule);
        processed.set(rule.Name, currentLevel);
      } else {
        nextRemainingRules.push(rule);
      }
    });

    if (levelRules.length > 0) {
      rulesByLevel.push(levelRules);
      currentLevel++;
    } else if (nextRemainingRules.length > 0) {
      // If we can't add any rules but still have remaining ones,
      // force add them to prevent infinite loops
      rulesByLevel.push(nextRemainingRules);
      break;
    }

    remainingRules = nextRemainingRules;
  }

  return rulesByLevel;
}

function generateFlowDiagram(acl) {
  const nodes = [];
  const edges = [];
  const nodeMap = new Map(); // Keep track of node IDs for connections

  // Root ACL node
  const aclNodeId = `acl-${acl.Id}`;
  nodes.push({
    id: aclNodeId,
    data: { label: `ACL: ${acl.Name}\nDefaultAction: ${Object.keys(acl.DefaultAction)[0]}` },
    position: { x: 400, y: 0 },
    style: {
      background: "#4682B4",
      padding: 10,
      borderRadius: 10,
      color: "#fff",
      width: "auto",
      minWidth: 300,
      textAlign: "center",
      whiteSpace: "pre-wrap"
    }
  });

  const ruleLevels = organizeRulesByDependency(acl.Rules || []);
  const VERTICAL_SPACING = 200;  // Increased for better readability
  const HORIZONTAL_SPACING = 400; // Increased for better spacing

  ruleLevels.forEach((levelRules, levelIndex) => {
    const y = (levelIndex + 1) * VERTICAL_SPACING;
    
    levelRules.forEach((rule, ruleIndex) => {
      const x = ((ruleIndex - (levelRules.length - 1) / 2) * HORIZONTAL_SPACING) + 400;
      const ruleNodeId = `rule-${rule.Name}-${levelIndex}-${ruleIndex}`;
      const action = rule.Action ? Object.keys(rule.Action)[0] : 
                    rule.OverrideAction ? Object.keys(rule.OverrideAction)[0] : 'None';

      // Get generated labels and dependencies
      const generatedLabels = getGeneratedLabels(rule);
      const dependentLabels = getLabelDependencies(rule);
      
      // Create enhanced label with label information
      const labelText = [
        `Rule: ${rule.Name}`,
        `Priority: ${rule.Priority}`,
        `Action: ${action}`,
        generatedLabels.length > 0 ? `Generates Labels: ${generatedLabels.join(", ")}` : null,
        dependentLabels.length > 0 ? `Depends on Labels: ${dependentLabels.join(", ")}` : null
      ].filter(Boolean).join("\n");

      nodes.push({
        id: ruleNodeId,
        data: { label: labelText },
        position: { x, y },
        style: {
          background: generatedLabels.length > 0 ? "#90EE90" : "#87CEEB", // Green for rules that generate labels
          padding: 10,
          borderRadius: 10,
          width: "auto",
          minWidth: 300,
          textAlign: "center",
          whiteSpace: "pre-wrap",
          fontSize: "12px"
        }
      });

      // Store node in map for edge creation
      nodeMap.set(rule.Name, ruleNodeId);

      // Connect to ACL if it's the first level
      if (levelIndex === 0) {
        edges.push({
          id: `e-acl-${ruleNodeId}`,
          source: aclNodeId,
          target: ruleNodeId,
          animated: true,
          style: { stroke: "#4682B4" }
        });
      }
    });
  });

  // Create edges for label dependencies after all nodes are created
  acl.Rules.forEach(rule => {
    const deps = getLabelDependencies(rule);
    const targetNodeId = nodeMap.get(rule.Name);
    
    deps.forEach(dep => {
      // Find the rule that generates this label
      const sourceRule = acl.Rules.find(r => 
        (r.RuleLabels || []).some(label => label.Name === dep)
      );
      
      if (sourceRule && nodeMap.has(sourceRule.Name)) {
        const sourceNodeId = nodeMap.get(sourceRule.Name);
        edges.push({
          id: `e-${sourceNodeId}-${targetNodeId}`,
          source: sourceNodeId,
          target: targetNodeId,
          animated: true,
          label: `Uses ${dep}`,
          style: { stroke: "#FF6B6B" },
          labelStyle: { fill: "#FF6B6B", fontSize: 12 }
        });
      }
    });
  });

  return { nodes, edges };
}

const WafTree = () => {
  const [wafAcls, setWafAcls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWafAcls = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/waf-acls");
        setWafAcls(response.data);
      } catch (error) {
        console.error("Error fetching WAF ACLs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWafAcls();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }
  if (!wafAcls?.length) {
    return (
      <Typography variant="h6" color="error">
        No ACLs found
      </Typography>
    );
  }

  return (
    <Container style={{ marginTop: 20 }}>
      <Typography variant="h4" align="center" gutterBottom>
        AWS WAF ACL Flow
      </Typography>

      {wafAcls.map((acl, index) => {
        const { nodes, edges } = generateFlowDiagram(acl);
        return (
          <>
            <Typography variant="h6" gutterBottom>
              ACL Name: {acl.Name}
            </Typography>
            <Paper key={acl.Id || index} style={{ padding: 10, marginTop: 20, height: 700 }}>
              <ReactFlow nodes={nodes} edges={edges} fitView>
                <Background />
                <Controls />
              </ReactFlow>
            </Paper>
          </>
        );
      })}
    </Container>
  );
};

export default WafTree;
